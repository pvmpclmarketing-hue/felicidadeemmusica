import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withApiMonitoring } from "../_shared/api-observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: corsHeaders });

Deno.serve((request) => withApiMonitoring("revise-lyrics", request, async () => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail("Método não permitido.", 405);
  try {
    const body = await request.json() as { lyrics?: string; instruction?: string; honoree?: string; style?: string; orderId?: string };
    const instruction = body.instruction?.trim();
    if (!instruction) return fail("Descreva o ajuste que deseja fazer.");
    const database = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let lyrics = body.lyrics?.trim() || "";
    let order: { id: string; lyric_text: string | null; quiz_data: Record<string, unknown> | null } | null = null;

    // Depois do pagamento, o pedido é a fonte de verdade. Isso impede que uma
    // cópia antiga ainda aberta no navegador substitua a letra mais recente.
    if (body.orderId) {
      const { data, error } = await database.from("orders").select("id,lyric_text,quiz_data").eq("id", body.orderId).maybeSingle();
      if (error) throw error;
      if (!data?.lyric_text) return fail("Pedido não encontrado ou sem letra para revisar.", 404);
      order = data;
      lyrics = data.lyric_text;
    }
    if (!lyrics) return fail("Envie a letra que deseja revisar.");
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return fail("A revisão ainda não foi configurada.", 503);
    const prompt = `Você é um editor profissional de letras de música. Reescreva a letra abaixo seguindo o pedido do cliente. Preserve a estrutura, a emoção, o nome ${body.honoree ?? "do homenageado"} pelo menos duas vezes e os fatos que não foram pedidos para mudar. Estilo: ${body.style ?? "personalizado"}. Responda apenas com a nova letra, usando seções entre colchetes.\n\nLETRA ANTERIOR:\n${lyrics}\n\nAJUSTE PEDIDO PELO CLIENTE:\n${instruction}`;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: "gpt-5.4-mini", reasoning: { effort: "low" }, text: { verbosity: "medium" }, max_output_tokens: 650, input: prompt }) });
    const result = await response.json() as { output_text?: string; error?: { message?: string } };
    const revisedLyrics = result.output_text?.trim();
    if (!response.ok || !revisedLyrics) throw new Error(result.error?.message ?? "Não foi possível ajustar a letra.");
    if (order) {
      const quiz = order.quiz_data && typeof order.quiz_data === "object" ? order.quiz_data : {};
      const { error } = await database.from("orders").update({ lyric_text: revisedLyrics, quiz_data: { ...quiz, lyric_text: revisedLyrics, lyric_revision_updated_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq("id", order.id);
      if (error) throw error;
    }
    return new Response(JSON.stringify({ lyrics: revisedLyrics, orderId: order?.id ?? null, persisted: Boolean(order) }), { headers: corsHeaders });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao ajustar a letra.", 500);
  }
}));
