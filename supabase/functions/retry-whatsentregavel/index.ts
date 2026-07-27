import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!Deno.env.get("RETRY_WEBHOOK_SECRET") || request.headers.get("x-retry-secret") !== Deno.env.get("RETRY_WEBHOOK_SECRET")) return new Response("Unauthorized", { status: 401 });

  const baseUrl = Deno.env.get("WHATSENTREGAVEL_URL");
  if (!baseUrl) return Response.json({ error: "WhatsEntregavel não configurado." }, { status: 503 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: notifications, error } = await supabase.from("outbound_notifications").select("id, path, secret_header, payload, attempts").in("status", ["pending", "failed"]).order("created_at").limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const notification of notifications ?? []) {
    const secret = notification.secret_header === "x-site-secret" ? Deno.env.get("WHATSENTREGAVEL_SITE_SECRET") : Deno.env.get("WHATSENTREGAVEL_PAYMENT_SECRET");
    if (!secret) continue;
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}${notification.path}`, { method: "POST", headers: { "content-type": "application/json", [notification.secret_header]: secret }, body: JSON.stringify(notification.payload) });
      if (!response.ok) throw new Error(`WhatsEntregavel respondeu ${response.status}`);
      await supabase.from("outbound_notifications").update({ status: "sent", sent_at: new Date().toISOString(), attempts: notification.attempts + 1, last_error: null }).eq("id", notification.id);
      sent += 1;
    } catch (retryError) {
      await supabase.from("outbound_notifications").update({ status: "failed", attempts: notification.attempts + 1, last_error: retryError instanceof Error ? retryError.message : "Falha desconhecida" }).eq("id", notification.id);
    }
  }
  return Response.json({ processed: notifications?.length ?? 0, sent });
});
