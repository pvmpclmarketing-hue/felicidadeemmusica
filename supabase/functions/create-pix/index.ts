import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withApiMonitoring } from "../_shared/api-observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
type CheckoutInput = { recipient?: string; style?: string; voiceGender?: "m" | "f"; name?: string; story?: string; lyricText?: string; buyerName?: string; buyerPhone?: string; deliveryMode?: "whatsapp" | "download"; previewId?: string };
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: corsHeaders });

async function notifyWhatsEntregavel(supabase: ReturnType<typeof createClient>, eventKey: string, path: string, secretHeader: string, secret: string | undefined, payload: Record<string, unknown>) {
  const baseUrl = Deno.env.get("WHATSENTREGAVEL_URL");
  const integrationKey = Deno.env.get("WHATSENTREGAVEL_INTEGRATION_KEY");
  if (!baseUrl || !integrationKey || !secret) return;
  const fullPayload = { ...payload, integration_key: integrationKey };
  const { data: notification, error: insertError } = await supabase.from("outbound_notifications").upsert({ provider: "whatsentregavel", event_key: eventKey, path, secret_header: secretHeader, payload: fullPayload, status: "pending" }, { onConflict: "event_key", ignoreDuplicates: true }).select("id, status, attempts").maybeSingle();
  if (insertError) throw insertError;
  if (!notification || notification.status === "sent") return;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { method: "POST", headers: { "content-type": "application/json", [secretHeader]: secret }, body: JSON.stringify(fullPayload) });
    if (!response.ok) throw new Error(`WhatsEntregavel respondeu ${response.status}`);
    await supabase.from("outbound_notifications").update({ status: "sent", sent_at: new Date().toISOString(), attempts: notification.attempts + 1, last_error: null }).eq("id", notification.id);
  } catch (error) {
    await supabase.from("outbound_notifications").update({ status: "failed", attempts: notification.attempts + 1, last_error: error instanceof Error ? error.message : "Falha desconhecida" }).eq("id", notification.id);
  }
}

Deno.serve((request) => withApiMonitoring("create-pix", request, async () => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail("Método não permitido.", 405);
  try {
    const input = await request.json() as CheckoutInput;
    const phone = (input.buyerPhone ?? "").replace(/\D/g, "");
    if (!input.recipient || !input.style || !["m", "f"].includes(input.voiceGender ?? "") || !input.name || !input.story || input.story.trim().split(/\s+/).filter(Boolean).length < 2 || !input.buyerName || !/^\d{10,11}$/.test(phone)) return fail("Informe nome e WhatsApp válidos para criar o Pix.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const amountCents = Number(Deno.env.get("MUSIC_PRICE_CENTS") ?? "1990");
    if (!Number.isInteger(amountCents) || amountCents < 100) throw new Error("Valor da música não foi configurado corretamente.");
    let lyrics = input.lyricText?.trim() || null;
    let previewAudioUrls: string[] = [];
    if (input.previewId) {
      const { data: preview } = await supabase.from("audio_previews").select("lyric_text,audio_url,audio_urls").eq("id", input.previewId).single();
      lyrics = preview?.lyric_text ?? lyrics;
      previewAudioUrls = Array.isArray(preview?.audio_urls) && preview.audio_urls.length ? preview.audio_urls.filter((url): url is string => typeof url === "string") : preview?.audio_url ? [preview.audio_url] : [];
    }
    previewAudioUrls = [...new Set(previewAudioUrls)].slice(0, 2);
    const fulfillmentMode = previewAudioUrls.length >= 2 ? "deliver_existing_preview_audio" : "generate_music_in_miniflux";
    const siteVariant = `${previewAudioUrls.length >= 2 ? "audio_preview" : "lyric_preview"}_${input.deliveryMode === "download" ? "download" : "whatsapp"}`;
    const quiz = { recipient: input.recipient, style: input.style, music_style: input.style, voice_gender: input.voiceGender, honoree: input.name.trim(), story: input.story.trim(), preview_id: input.previewId ?? null, preview_audio_urls: previewAudioUrls, fulfillment_mode: fulfillmentMode, site_variant: siteVariant };
    if (input.deliveryMode === "download" && !lyrics) return fail("Não foi possível localizar a letra desta prévia.");
    if (input.deliveryMode === "download" && input.previewId && previewAudioUrls.length < 2) return fail("Ainda não localizamos as duas músicas da prévia. Aguarde a prévia ficar pronta antes de gerar o Pix.", 409);
    const existingVersions = input.deliveryMode === "download" && previewAudioUrls.length >= 2 ? previewAudioUrls : [];
    const { data: order, error: orderError } = await supabase.from("orders").insert({ recipient: input.recipient, style: input.style, honoree: input.name.trim(), story: input.story.trim(), lyric_text: lyrics, buyer_name: input.buyerName.trim(), buyer_phone: phone, amount_cents: amountCents, quiz_data: quiz, delivery_mode: input.deliveryMode === "download" ? "download" : "whatsapp", music_url: existingVersions[0] ?? null, music_versions: existingVersions }).select("id").single();
    if (orderError || !order) throw new Error("Não foi possível registrar o pedido.");

    if (input.deliveryMode !== "download") await notifyWhatsEntregavel(supabase, `site:${order.id}`, "/api/webhooks/site", "x-site-secret", Deno.env.get("WHATSENTREGAVEL_SITE_SECRET"), { order_id: order.id, name: input.buyerName.trim(), phone: `55${phone}`, paid: false, quiz, story: input.story.trim() });

    const asaasUrl = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";
    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    const addressKey = Deno.env.get("ASAAS_PIX_ADDRESS_KEY");
    if (!asaasKey) throw new Error("Configure a ASAAS_API_KEY nos Secrets do Supabase.");
    if (!addressKey) throw new Error("Configure a ASAAS_PIX_ADDRESS_KEY nos Secrets do Supabase.");
    const headers = { "content-type": "application/json", access_token: asaasKey };
    // Asaas aceita no máximo 50 caracteres na descrição do QR Code estático.
    const qrDescription = `Pedido música ${order.id.slice(0, 8)}`;
    const qrResponse = await fetch(`${asaasUrl}/pix/qrCodes/static`, { method: "POST", headers, body: JSON.stringify({ addressKey, description: qrDescription, value: amountCents / 100, format: "ALL", expirationSeconds: 1800, allowsMultiplePayments: false, externalReference: order.id }) });
    const qr = await qrResponse.json();
    if (!qrResponse.ok || !qr.id || !qr.encodedImage || !qr.payload) throw new Error(qr.errors?.[0]?.description ?? "Não foi possível gerar o QR Code Pix.");

    await supabase.from("orders").update({ asaas_static_qr_id: qr.id }).eq("id", order.id);
    return new Response(JSON.stringify({ orderId: order.id, qrCode: `data:image/png;base64,${qr.encodedImage}`, pixPayload: qr.payload, expiresAt: qr.expirationDate }), { headers: corsHeaders });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao gerar o Pix.", 500);
  }
}));
