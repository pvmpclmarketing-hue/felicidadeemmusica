import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Order = Record<string, unknown>;

export async function notifyPaymentApproved(supabase: ReturnType<typeof createClient>, order: Order) {
  const baseUrl = Deno.env.get("WHATSENTREGAVEL_URL");
  const integrationKey = Deno.env.get("WHATSENTREGAVEL_INTEGRATION_KEY");
  const secret = Deno.env.get("WHATSENTREGAVEL_PAYMENT_SECRET");
  if (!baseUrl || !integrationKey || !secret) return;

  const eventKey = `payment:${order.id}`;
  const quiz = (order.quiz_data ?? { recipient: order.recipient, style: order.style, honoree: order.honoree, story: order.story }) as Record<string, unknown>;
  const previewAudios = [...new Set((Array.isArray(quiz.preview_audio_urls) ? quiz.preview_audio_urls : []).filter((url): url is string => typeof url === "string" && url.length > 0))].slice(0, 2);
  const siteDelivery = order.delivery_mode === "download";
  const previewReady = quiz.fulfillment_mode === "deliver_existing_preview_audio" && previewAudios.length >= 2;
  const fulfillmentMode = siteDelivery ? "site_delivery" : previewReady ? "deliver_existing_preview_audio" : "generate_music_in_miniflux";
  const payload = {
    event: "PAYMENT_APPROVED",
    idempotency_key: eventKey,
    integration_key: integrationKey,
    order_id: order.id,
    customer: { name: order.buyer_name, phone: `55${order.buyer_phone}` },
    fulfillment: { mode: fulfillmentMode },
    delivery: { channel: siteDelivery ? "site" : "whatsapp" },
    lyric_text: typeof order.lyric_text === "string" ? order.lyric_text : null,
    quiz,
    preview: { id: typeof quiz.preview_id === "string" ? quiz.preview_id : null, audios: previewAudios },
    story: order.story,
  };
  const { data: notification, error: insertError } = await supabase.from("outbound_notifications")
    .upsert({ provider: "whatsentregavel", event_key: eventKey, path: "/api/webhooks/payment", secret_header: "x-payment-secret", payload, status: "pending" }, { onConflict: "event_key", ignoreDuplicates: true })
    .select("id, status, attempts").maybeSingle();
  if (insertError || !notification || notification.status === "sent") return;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/webhooks/payment`, { method: "POST", headers: { "content-type": "application/json", "x-payment-secret": secret }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`WhatsEntregavel respondeu ${response.status}`);
    await supabase.from("outbound_notifications").update({ status: "sent", sent_at: new Date().toISOString(), attempts: notification.attempts + 1, last_error: null }).eq("id", notification.id);
  } catch (error) {
    await supabase.from("outbound_notifications").update({ status: "failed", attempts: notification.attempts + 1, last_error: error instanceof Error ? error.message : "Falha desconhecida" }).eq("id", notification.id);
  }
}
