import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type CheckoutInput = { recipient?: string; style?: string; name?: string; story?: string; lyricText?: string; buyerName?: string; buyerPhone?: string };

const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: corsHeaders });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail("Método não permitido.", 405);

  try {
    const input = await request.json() as CheckoutInput;
    const phone = (input.buyerPhone ?? "").replace(/\D/g, "");
    if (!input.recipient || !input.style || !input.name || !input.story || input.story.trim().split(/\s+/).filter(Boolean).length < 2 || !input.buyerName || !/^\d{10,11}$/.test(phone)) return fail("Conte a história com pelo menos duas palavras e informe um WhatsApp brasileiro válido.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order, error: orderError } = await supabase.from("orders").insert({ recipient: input.recipient, style: input.style, honoree: input.name.trim(), story: input.story.trim(), lyric_text: input.lyricText?.trim() || null, buyer_name: input.buyerName.trim(), buyer_phone: phone, amount_cents: 1990, quiz_data: { recipient: input.recipient, style: input.style, honoree: input.name.trim(), story: input.story.trim() } }).select("id").single();
    if (orderError || !order) throw new Error("Não foi possível registrar o pedido.");

    const asaasUrl = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";
    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) throw new Error("Pagamento não configurado.");
    const headers = { "content-type": "application/json", access_token: asaasKey };
    const customerResponse = await fetch(`${asaasUrl}/customers`, { method: "POST", headers, body: JSON.stringify({ name: input.buyerName.trim(), mobilePhone: `55${phone}`, externalReference: order.id }) });
    const customer = await customerResponse.json();
    if (!customerResponse.ok || !customer.id) throw new Error(customer.errors?.[0]?.description ?? "Não foi possível criar o cliente.");
    const dueDate = new Date().toISOString().slice(0, 10);
    const paymentResponse = await fetch(`${asaasUrl}/payments`, { method: "POST", headers, body: JSON.stringify({ customer: customer.id, billingType: "PIX", value: 19.9, dueDate, description: `Felicidade em Música — 2 versões para ${input.name}`, externalReference: order.id }) });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok || !payment.id) throw new Error(payment.errors?.[0]?.description ?? "Não foi possível criar a cobrança Pix.");
    const qrResponse = await fetch(`${asaasUrl}/payments/${payment.id}/pixQrCode`, { headers: { access_token: asaasKey } });
    const qr = await qrResponse.json();
    if (!qrResponse.ok || !qr.encodedImage || !qr.payload) throw new Error("O Asaas não retornou o QR Code Pix.");

    await supabase.from("orders").update({ asaas_customer_id: customer.id, asaas_payment_id: payment.id }).eq("id", order.id);
    return new Response(JSON.stringify({ orderId: order.id, qrCode: `data:image/png;base64,${qr.encodedImage}`, pixPayload: qr.payload, expiresAt: qr.expirationDate }), { headers: corsHeaders });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao gerar o Pix.", 500);
  }
});
