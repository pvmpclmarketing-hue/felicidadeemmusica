import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withApiMonitoring } from "../_shared/api-observability.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers });
const normalizeDigits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const normalizeText = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const compact = (value: unknown) => normalizeText(value).replace(/\s/g, "");
const acceptedAmount = (value: unknown, expectedCents: number) => Math.abs(Number(value) - (expectedCents / 100)) <= 1;

const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase())))).map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function trackMetaPurchase(order: Record<string, any>, request?: Request) {
  const pixel = Deno.env.get("META_CAPI_PIXEL_ID"), token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!pixel || !token) return;
  const phone = String(order.buyer_phone ?? "").replace(/\D/g, "");
  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: `purchase_${order.id}`,
    action_source: "website",
    event_source_url: Deno.env.get("SITE_URL") ?? "",
    user_data: {
      ...(phone ? { ph: [await hash(`55${phone}`)] } : {}),
      ...(request ? { client_ip_address: request.headers.get("x-forwarded-for")?.split(",")[0], client_user_agent: request.headers.get("user-agent") } : {}),
    },
    custom_data: { currency: "BRL", value: Number(order.amount_cents ?? 1990) / 100, order_id: order.id },
  };
  try {
    await fetch(`https://graph.facebook.com/v22.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [event], ...(Deno.env.get("META_CAPI_TEST_EVENT_CODE") ? { test_event_code: Deno.env.get("META_CAPI_TEST_EVENT_CODE") } : {}) }),
    });
  } catch {}
}

async function start(db: ReturnType<typeof createClient>, order: Record<string, any>) {
  const apiKey = Deno.env.get("KIE_API_KEY"), secret = Deno.env.get("KIE_CALLBACK_SECRET");
  if (!apiKey || !secret || !order.lyric_text) throw new Error("A geração final ainda não foi configurada.");
  await db.from("orders").update({ status: "generating" }).eq("id", order.id);
  const callback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-delivery-webhook?secret=${encodeURIComponent(secret)}`;
  const response = await fetch("https://api.kie.ai/api/v1/generate", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ customMode: true, instrumental: false, model: "V4", prompt: order.lyric_text, style: order.style, title: `Uma música para ${order.honoree}`, vocalGender: order.quiz_data?.voice_gender ?? "f", callBackUrl: callback }),
  });
  const data = await response.json() as { data?: { taskId?: string } };
  if (!response.ok || !data.data?.taskId) throw new Error("Não foi possível iniciar a música.");
  await db.from("orders").update({ kie_task_id: data.data.taskId }).eq("id", order.id);
}

async function releaseOrGenerate(db: ReturnType<typeof createClient>, order: Record<string, any>) {
  const raw = [
    ...(Array.isArray(order.music_versions) ? order.music_versions : []),
    ...(Array.isArray(order.quiz_data?.preview_audio_urls) ? order.quiz_data.preview_audio_urls : []),
  ];
  if (raw.length < 2 && typeof order.quiz_data?.preview_id === "string") {
    const { data: preview } = await db.from("audio_previews").select("audio_url,audio_urls").eq("id", order.quiz_data.preview_id).maybeSingle();
    if (Array.isArray(preview?.audio_urls)) raw.push(...preview.audio_urls);
    else if (preview?.audio_url) raw.push(preview.audio_url);
  }
  const urls = [...new Set(raw.filter((url: unknown): url is string => typeof url === "string" && url.length > 0))].slice(0, 2);
  if (urls.length >= 2) {
    await db.from("orders").update({ status: "ready", paid_at: new Date().toISOString(), music_url: urls[0], music_versions: urls }).eq("id", order.id);
    return;
  }
  if (order.quiz_data?.site_variant === "audio_preview_manual_download" || order.quiz_data?.fulfillment_mode === "deliver_existing_preview_audio") {
    await db.from("orders").update({ status: "delivery_failed", paid_at: new Date().toISOString() }).eq("id", order.id);
    return;
  }
  await db.from("orders").update({ paid_at: new Date().toISOString() }).eq("id", order.id);
  await start(db, order);
}

type Receipt = {
  is_payment_proof: boolean;
  amount: number | null;
  date_time: string | null;
  payer_name: string | null;
  payer_tax_id: string | null;
  recipient_name: string | null;
  recipient_tax_id: string | null;
  recipient_pix_key: string | null;
  institution: string | null;
  transaction_id: string | null;
  description: string | null;
  visible_text: string | null;
  is_legible: boolean;
  possible_fraud: boolean;
  notes: string | null;
};
type OpenAIResponse = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };

const receiptSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_payment_proof: { type: "boolean" }, amount: { type: ["number", "null"] }, date_time: { type: ["string", "null"] },
    payer_name: { type: ["string", "null"] }, payer_tax_id: { type: ["string", "null"] }, recipient_name: { type: ["string", "null"] },
    recipient_tax_id: { type: ["string", "null"] }, recipient_pix_key: { type: ["string", "null"] }, institution: { type: ["string", "null"] },
    transaction_id: { type: ["string", "null"] }, description: { type: ["string", "null"] }, visible_text: { type: ["string", "null"] },
    is_legible: { type: "boolean" }, possible_fraud: { type: "boolean" }, notes: { type: ["string", "null"] },
  },
  required: ["is_payment_proof", "amount", "date_time", "payer_name", "payer_tax_id", "recipient_name", "recipient_tax_id", "recipient_pix_key", "institution", "transaction_id", "description", "visible_text", "is_legible", "possible_fraud", "notes"],
};

const outputText = (response: OpenAIResponse) => response.output_text ?? response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text" && typeof item.text === "string")?.text ?? "";
const stopWords = new Set(["DA", "DAS", "DE", "DO", "DOS", "E"]);

function matchesConfiguredReceiver(receipt: Receipt, configuredReceiver: string, configuredKey: string) {
  const extracted = [receipt.recipient_name, receipt.recipient_tax_id, receipt.recipient_pix_key, receipt.description, receipt.visible_text, receipt.notes].filter(Boolean).join(" ");
  const extractedText = normalizeText(extracted), extractedCompact = compact(extracted), extractedDigits = normalizeDigits(extracted);
  const configuredDigits = [normalizeDigits(configuredKey), normalizeDigits(configuredReceiver)].filter((value) => value.length >= 6);
  const numericCandidates = [...new Set(configuredDigits.flatMap((value) => value.length >= 8 ? [value, value.slice(0, 8)] : [value]))];
  const numericMatch = numericCandidates.some((value) => extractedDigits.includes(value));
  const keyCompact = compact(configuredKey);
  const exactKeyMatch = keyCompact.length >= 6 && extractedCompact.includes(keyCompact);
  const receiverWords = normalizeText(configuredReceiver).split(" ").filter((word) => /^[A-Z]+$/.test(word) && word.length >= 3 && !stopWords.has(word));
  const fullName = receiverWords.join(" ");
  const adjacentPairMatch = receiverWords.length >= 2 && receiverWords.slice(0, -1).some((word, index) => extractedText.includes(`${word} ${receiverWords[index + 1]}`));
  const distributedPairMatch = receiverWords.length >= 2 && receiverWords.some((word, index) => receiverWords.slice(index + 1).some((other) => extractedText.includes(word) && extractedText.includes(other)));
  const singleNameMatch = receiverWords.length === 1 && receiverWords[0].length >= 5 && extractedText.includes(receiverWords[0]);
  return numericMatch || exactKeyMatch || (fullName.length >= 7 && extractedText.includes(fullName)) || adjacentPairMatch || distributedPairMatch || singleNameMatch;
}

Deno.serve((req) => withApiMonitoring("verify-manual-receipt", req, async () => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return fail("Método não permitido.", 405);
  try {
    const { orderId, fileData, fileName } = await req.json() as { orderId?: string; fileData?: string; fileName?: string };
    if (!orderId || !fileData || fileData.length > 8_000_000) return fail("Envie um comprovante de até 6 MB.");
    const apiKey = Deno.env.get("OPENAI_API_KEY"), receiverKey = Deno.env.get("MANUAL_PIX_KEY")?.trim() ?? "", receiverName = Deno.env.get("MANUAL_PIX_RECEIVER")?.trim() ?? "";
    if (!apiKey || !receiverKey || !receiverName) return fail("A conferência ainda não foi configurada.", 503);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order, error } = await db.from("orders").select("*").eq("id", orderId).eq("delivery_mode", "download").single();
    if (error || !order) return fail("Pedido não encontrado.", 404);
    if (order.status !== "awaiting_payment") return fail("Este pedido já foi enviado para produção.", 409);

    const isPdf = (fileName ?? "").toLowerCase().endsWith(".pdf") || fileData.startsWith("data:application/pdf");
    const content = [
      { type: "input_text", text: `Analise integralmente este comprovante Pix e extraia os dados visíveis no JSON solicitado. O recebedor esperado neste projeto é "${receiverName}" e a chave configurada é "${receiverKey}". O documento pode mostrar somente parte do nome, somente parte do CPF/CNPJ, a chave formatada ou dados separados em linhas. Copie em visible_text todo texto relevante que conseguir ler. Não invente: use null quando um campo não estiver visível. Marque possible_fraud apenas com indício visual concreto de edição ou inconsistência.` },
      isPdf
        ? { type: "input_file", file_data: fileData, filename: fileName || "comprovante.pdf", detail: "high" }
        : { type: "input_image", image_url: fileData, detail: "high" },
    ] as any;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: Deno.env.get("OPENAI_RECEIPT_MODEL") ?? "gpt-5.4-mini", reasoning: { effort: "low" }, max_output_tokens: 900, text: { format: { type: "json_schema", name: "pix_receipt", strict: true, schema: receiptSchema } }, input: [{ role: "user", content }] }),
    });
    const data = await response.json() as OpenAIResponse;
    if (!response.ok) throw new Error(data.error?.message ?? "Não foi possível analisar o comprovante.");
    let receipt: Receipt;
    try { receipt = JSON.parse(outputText(data)); } catch { throw new Error("Não foi possível ler os dados do comprovante."); }

    const validProof = receipt.is_payment_proof && receipt.is_legible && !receipt.possible_fraud;
    const validAmount = acceptedAmount(receipt.amount, Number(order.amount_cents));
    const validReceiver = matchesConfiguredReceiver(receipt, receiverName, receiverKey);
    if (!validProof) return fail("Comprovante inválido ou ilegível. Envie uma foto nítida ou o PDF original do pagamento Pix.", 422);
    if (!validAmount) return fail("O valor do comprovante não corresponde ao valor deste pedido.", 422);
    if (!validReceiver) return fail("Não localizamos o recebedor configurado neste comprovante Pix.", 422);

    await trackMetaPurchase(order, req);
    await releaseOrGenerate(db, order);
    return new Response(JSON.stringify({ approved: true, next: order.quiz_data?.fulfillment_mode === "deliver_existing_preview_audio" ? "download" : "generation" }), { headers });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Não foi possível conferir o comprovante.", 500);
  }
}));
