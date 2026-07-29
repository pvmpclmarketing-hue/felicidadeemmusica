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
    const { data, error } = await db.from("orders").select("status").eq("id", orderId).single();
    if (error || !data) return new Response(JSON.stringify({ error: "Pedido não encontrado." }), { status: 404, headers });
    return new Response(JSON.stringify({ status: data.status }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: "Não foi possível consultar o pagamento." }), { status: 500, headers });
  }
});
