import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function notifyWhatsEntregavel(supabase: ReturnType<typeof createClient>, order: Record<string, unknown>) {
  const baseUrl = Deno.env.get("WHATSENTREGAVEL_URL");
  const integrationKey = Deno.env.get("WHATSENTREGAVEL_INTEGRATION_KEY");
  const secret = Deno.env.get("WHATSENTREGAVEL_PAYMENT_SECRET");
  if (!baseUrl || !integrationKey || !secret) return;
  const quiz = order.quiz_data ?? { recipient: order.recipient, style: order.style, honoree: order.honoree, story: order.story };
  const payload = { event: "PAYMENT_APPROVED", integration_key: integrationKey, order_id: order.id, customer: { name: order.buyer_name, phone: `55${order.buyer_phone}` }, quiz, story: order.story };
  const eventKey = `payment:${order.id}`;
  const { data: notification, error: insertError } = await supabase.from("outbound_notifications").upsert({ provider: "whatsentregavel", event_key: eventKey, path: "/api/webhooks/payment", secret_header: "x-payment-secret", payload, status: "pending" }, { onConflict: "event_key", ignoreDuplicates: true }).select("id, status, attempts").maybeSingle();
  if (insertError || !notification || notification.status === "sent") return;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/webhooks/payment`, { method: "POST", headers: { "content-type": "application/json", "x-payment-secret": secret }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`WhatsEntregavel respondeu ${response.status}`);
    await supabase.from("outbound_notifications").update({ status: "sent", sent_at: new Date().toISOString(), attempts: notification.attempts + 1, last_error: null }).eq("id", notification.id);
  } catch (error) {
    await supabase.from("outbound_notifications").update({ status: "failed", attempts: notification.attempts + 1, last_error: error instanceof Error ? error.message : "Falha desconhecida" }).eq("id", notification.id);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (Deno.env.get("ASAAS_WEBHOOK_TOKEN") && request.headers.get("asaas-access-token") !== Deno.env.get("ASAAS_WEBHOOK_TOKEN")) return new Response("Unauthorized", { status: 401 });
  try {
    const event = await request.json() as { id?: string; event?: string; payment?: { id?: string; externalReference?: string; pixQrCodeId?: string } };
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const eventKey = event.id ?? `${event.event}:${event.payment?.id}`;
    const { error: duplicate } = await supabase.from("webhook_events").insert({ provider: "asaas", event_key: eventKey, payload: event });
    if (duplicate?.code === "23505") return Response.json({ received: true, duplicate: true });
    if (duplicate) throw duplicate;
    if (!event.payment?.id || !["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event.event ?? "")) return Response.json({ received: true });

    const paymentReference = event.payment.externalReference;
    const orderLookup = paymentReference ? supabase.from("orders").select("*").eq("id", paymentReference) : supabase.from("orders").select("*").eq("asaas_static_qr_id", event.payment.pixQrCodeId ?? "");
    const { data: pendingOrder } = await orderLookup.eq("status", "awaiting_payment").maybeSingle();
    if (!pendingOrder) return Response.json({ received: true });
    const { data: order } = await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString(), asaas_payment_id: event.payment.id }).eq("id", pendingOrder.id).eq("status", "awaiting_payment").select("*").maybeSingle();
    if (!order) return Response.json({ received: true });
    await notifyWhatsEntregavel(supabase, order);
    return Response.json({ received: true });
  } catch (error) {
    console.error(error);
    return Response.json({ received: true });
  }
});
