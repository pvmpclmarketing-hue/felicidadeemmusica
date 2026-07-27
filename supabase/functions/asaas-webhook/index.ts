import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (Deno.env.get("ASAAS_WEBHOOK_TOKEN") && request.headers.get("asaas-access-token") !== Deno.env.get("ASAAS_WEBHOOK_TOKEN")) return new Response("Unauthorized", { status: 401 });
  try {
    const event = await request.json() as { id?: string; event?: string; payment?: { id?: string; externalReference?: string } };
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const eventKey = event.id ?? `${event.event}:${event.payment?.id}`;
    const { error: duplicate } = await supabase.from("webhook_events").insert({ provider: "asaas", event_key: eventKey, payload: event });
    if (duplicate?.code === "23505") return Response.json({ received: true, duplicate: true });
    if (duplicate) throw duplicate;
    if (!event.payment?.id || !event.payment.externalReference || !["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event.event ?? "")) return Response.json({ received: true });
    const { data: order } = await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", event.payment.externalReference).eq("asaas_payment_id", event.payment.id).select("id").maybeSingle();
    if (!order) return Response.json({ received: true });
    await supabase.from("generation_jobs").upsert({ order_id: order.id, status: "queued" }, { onConflict: "order_id", ignoreDuplicates: true });
    await supabase.from("orders").update({ status: "queued" }).eq("id", order.id);
    return Response.json({ received: true });
  } catch (error) {
    console.error(error);
    return Response.json({ received: true });
  }
});
