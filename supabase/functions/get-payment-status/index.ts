import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "https://felicidadeemmusica.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405, headers });

  try {
    const { orderId } = await request.json() as { orderId?: string };
    if (!orderId) return new Response(JSON.stringify({ error: "Pedido inválido." }), { status: 400, headers });
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await db.from("orders").select("status, asaas_static_qr_id").eq("id", orderId).single();
    if (error || !data) return new Response(JSON.stringify({ error: "Pedido não encontrado." }), { status: 404, headers });
    // Reserva caso o Webhook do Asaas atrase: consulta o QR estático e usa o mesmo processamento.
    if (data.status === "awaiting_payment" && data.asaas_static_qr_id) { try {
      const asaasKey = Deno.env.get("ASAAS_API_KEY");
      const asaasUrl = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";
      if (asaasKey) {
        const response = await fetch(`${asaasUrl}/payments?pixQrCodeId=${encodeURIComponent(data.asaas_static_qr_id)}&limit=10`, { headers: { access_token: asaasKey } });
        const result = response.ok ? await response.json().catch(() => ({})) as { data?: Array<{ id?: string; status?: string; pixQrCodeId?: string }> } : {};
        const payment = result.data?.find((item) => ["RECEIVED", "CONFIRMED"].includes(item.status ?? ""));
        if (payment?.id) {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/asaas-webhook`, {
            method: "POST",
            headers: { "content-type": "application/json", "asaas-access-token": Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "" },
            body: JSON.stringify({ id: `poll:${payment.id}`, event: "PAYMENT_RECEIVED", payment: { id: payment.id, pixQrCodeId: payment.pixQrCodeId ?? data.asaas_static_qr_id } }),
          });
          const refreshed = await db.from("orders").select("status").eq("id", orderId).single();
          return new Response(JSON.stringify({ status: refreshed.data?.status ?? "paid" }), { headers });
        }
      }
    } catch (pollError) { console.error("Pix polling fallback", pollError); } }
    return new Response(JSON.stringify({ status: data.status }), { headers });
  } catch (error) {
    console.error("get-payment-status", error);
    return new Response(JSON.stringify({ error: "Não foi possível consultar o pagamento." }), { status: 500, headers });
  }
});
