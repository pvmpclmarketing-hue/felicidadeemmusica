import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackMetaPurchase } from "../_shared/meta.ts";
import { trackTikTokCompletePayment } from "../_shared/tiktok.ts";
import { withApiMonitoring } from "../_shared/api-observability.ts";

const headers = { "content-type": "application/json; charset=utf-8" };

Deno.serve((request) => withApiMonitoring("efi-payment-webhook", request, async () => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("EFI_SITE_PAYMENT_WEBHOOK_SECRET");
  if (!secret || request.headers.get("x-efi-site-secret") !== secret) return new Response("Unauthorized", { status: 401 });
  try {
    const event = await request.json() as { order_id?: string; txid?: string; payment?: Record<string, unknown> };
    const orderId = String(event.order_id ?? "").trim(), txid = String(event.txid ?? "").trim();
    if (!orderId || !txid) return Response.json({ error: "order_id e txid são obrigatórios." }, { status: 400, headers });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: duplicate } = await supabase.from("webhook_events").insert({ provider: "efi", event_key: txid, payload: event });
    if (duplicate?.code === "23505") return Response.json({ received: true, duplicate: true }, { headers });
    if (duplicate) throw duplicate;
    const { data: pendingOrder } = await supabase.from("orders").select("*").eq("id", orderId).eq("status", "awaiting_payment").maybeSingle();
    if (!pendingOrder) return Response.json({ received: true, ignored: true }, { headers });
    const { data: order } = await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", pendingOrder.id).eq("status", "awaiting_payment").select("*").maybeSingle();
    if (!order) return Response.json({ received: true, duplicate: true }, { headers });
    const [meta, tiktok] = await Promise.all([trackMetaPurchase(order, request), trackTikTokCompletePayment(order, request)]);
    if (!meta.delivered) console.error("Meta CAPI Purchase não entregue", { orderId: order.id, eventId: meta.eventId, error: meta.error });
    if (!tiktok.delivered) console.error("TikTok Events API CompletePayment não entregue", { orderId: order.id, eventId: tiktok.eventId, error: tiktok.error });
    return Response.json({ received: true, order_id: order.id, meta_capi_delivered: meta.delivered, tiktok_events_delivered: tiktok.delivered }, { headers });
  } catch (error) {
    console.error("efi-payment-webhook", error);
    return Response.json({ received: true }, { headers: { ...headers, "x-api-monitor-error": error instanceof Error ? error.message.slice(0, 900) : "Falha desconhecida" } });
  }
}));
