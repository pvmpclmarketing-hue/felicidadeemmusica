import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withApiMonitoring } from "../_shared/api-observability.ts";
import { trackMetaInitiateCheckout } from "../_shared/meta.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers });

Deno.serve((req) => withApiMonitoring("create-manual-pix-order", req, async () => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return fail("Método não permitido.", 405);
  try {
    const input = await req.json() as { recipient?: string; style?: string; voiceGender?: "m" | "f"; name?: string; story?: string; buyerName?: string; buyerPhone?: string; previewId?: string; lyricText?: string };
    const phone = (input.buyerPhone ?? "").replace(/\D/g, "");
    if (!input.recipient || !input.style || !input.name || !input.story) return fail("Informe os dados obrigatórios.");
    const amountCents = Number(Deno.env.get("MUSIC_PRICE_CENTS") ?? "1990");
    const pixKey = Deno.env.get("MANUAL_PIX_KEY");
    const receiver = Deno.env.get("MANUAL_PIX_RECEIVER");
    if (!Number.isInteger(amountCents) || amountCents < 100 || !pixKey || !receiver) return fail("Pagamento manual ainda não foi configurado.", 503);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let lyrics = input.lyricText?.trim() || null;
    let previewAudioUrls: string[] = [];
    if (input.previewId) {
      const { data } = await db.from("audio_previews").select("lyric_text,audio_url,audio_urls").eq("id", input.previewId).single();
      lyrics = data?.lyric_text ?? lyrics;
      previewAudioUrls = Array.isArray(data?.audio_urls) && data.audio_urls.length ? data.audio_urls : data?.audio_url ? [data.audio_url] : [];
    }
    previewAudioUrls = [...new Set(previewAudioUrls.filter((url): url is string => typeof url === "string" && url.length > 0))].slice(0, 2);
    if (!lyrics) return fail("Não foi possível localizar a música desta prévia.");
    const fulfillmentMode = previewAudioUrls.length >= 2 ? "deliver_existing_preview_audio" : "generate_music_after_receipt";
    const quiz = { recipient: input.recipient, style: input.style, music_style: input.style, voice_gender: input.voiceGender, honoree: input.name.trim(), story: input.story.trim(), preview_id: input.previewId ?? null, preview_audio_urls: previewAudioUrls, fulfillment_mode: fulfillmentMode, site_variant: previewAudioUrls.length >= 2 ? "audio_preview_manual_download" : "lyric_preview_manual_download" };
    if (input.previewId && previewAudioUrls.length < 2) return fail("Ainda não localizamos as duas músicas da prévia. Aguarde a prévia ficar pronta antes de continuar.", 409);
    const { data, error } = await db.from("orders").insert({ recipient: input.recipient, style: input.style, honoree: input.name.trim(), story: input.story.trim(), lyric_text: lyrics, buyer_name: input.buyerName?.trim() || "Cliente Pix", buyer_phone: /^\d{10,11}$/.test(phone) ? phone : "0000000000", amount_cents: amountCents, quiz_data: quiz, delivery_mode: "download", music_url: previewAudioUrls[0] ?? null, music_versions: previewAudioUrls }).select("id,buyer_phone,amount_cents").single();
    if (error || !data) throw new Error("Não foi possível preparar seu pedido.");
    await trackMetaInitiateCheckout(data, req);
    return new Response(JSON.stringify({ orderId: data.id, receiver, pixKey, amount: (amountCents / 100).toFixed(2).replace(".", ",") }), { headers });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao preparar o Pix.", 500);
  }
}));
