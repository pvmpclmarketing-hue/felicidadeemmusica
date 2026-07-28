import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://felicidadeemmusica.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
};
type CheckoutInput = { recipient?: string; style?: string; voiceGender?: "m" | "f"; name?: string; story?: string; lyricText?: string; buyerName?: string; buyerPhone?: string };
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail("Método não permitido.", 405);
  try {
    const input = await request.json() as CheckoutInput;
    const phone = (input.buyerPhone ?? "").replace(/\D/g, "");
    if (!input.recipient || !input.style || !["m", "f"].includes(input.voiceGender ?? "") || !input.name || !input.story || input.story.trim().split(/\s+/).filter(Boolean).length < 2 || !input.buyerName || !/^\d{10,11}$/.test(phone)) return fail("Informe nome e WhatsApp válidos para criar o Pix.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const quiz = { recipient: input.recipient, style: input.style, voice_gender: input.voiceGender, honoree: input.name.trim(), story: input.story.trim() };
    const { data: order, error: orderError } = await supabase.from("orders").insert({ recipient: input.recipient, style: input.style, honoree: input.name.trim(), story: input.story.trim(), lyric_text: input.lyricText?.trim() || null, buyer_name: input.buyerName.trim(), buyer_phone: phone, amount_cents: 1990, quiz_data: quiz }).select("id").single();
    if (orderError || !order) throw new Error("Não foi possível registrar o pedido.");

    await notifyWhatsEntregavel(supabase, `site:${order.id}`, "/api/webhooks/site", "x-site-secret", Deno.env.get("WHATSENTREGAVEL_SITE_SECRET"), { order_id: order.id, name: input.buyerName.trim(), phone: `55${phone}`, paid: false, quiz, story: input.story.trim() });

    const asaasUrl = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";
    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    const addressKey = Deno.env.get("ASAAS_PIX_ADDRESS_KEY");
    if (!asaasKey || !addressKey) throw new Error("Pagamento Pix ainda não foi configurado.");
    const headers = { "content-type": "application/json", access_token: asaasKey };
    const qrResponse = await fetch(`${asaasUrl}/pix/qrCodes/static`, { method: "POST", headers, body: JSON.stringify({ addressKey, description: `Felicidade em Música — pedido ${order.id}`, value: 19.9, format: "ALL", expirationSeconds: 1800, allowsMultiplePayments: false, externalReference: order.id }) });
    const qr = await qrResponse.json();
    if (!qrResponse.ok || !qr.id || !qr.encodedImage || !qr.payload) throw new Error(qr.errors?.[0]?.description ?? "Não foi possível gerar o QR Code Pix.");

    await supabase.from("orders").update({ asaas_static_qr_id: qr.id }).eq("id", order.id);
    return new Response(JSON.stringify({ orderId: order.id, qrCode: `data:image/png;base64,${qr.encodedImage}`, pixPayload: qr.payload, expiresAt: qr.expirationDate }), { headers: corsHeaders });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao gerar o Pix.", 500);
  }
});
