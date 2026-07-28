import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "https://felicidadeemmusica.vercel.app", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json; charset=utf-8" };
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: corsHeaders });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail("Método não permitido.", 405);

  try {
    const input = await request.json() as { recipient?: string; style?: string; voiceGender?: "m" | "f"; honoree?: string; story?: string };
    if (!input.recipient || !input.style || !["m", "f"].includes(input.voiceGender ?? "") || !input.honoree || !input.story || input.story.trim().split(/\s+/).filter(Boolean).length < 2) return fail("Preencha os dados da história para criar a prévia.");

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return fail("A geração de letras ainda não foi configurada.", 503);

    const instructions = `Você é um compositor profissional especializado em letras de música emocionantes e personalizadas. Sua tarefa é transformar histórias reais em letras tocantes, únicas e sob medida.

REGRAS OBRIGATÓRIAS
- O nome do homenageado deve aparecer de forma natural pelo menos duas vezes.
- Use claramente o contexto, os detalhes, os momentos e os sentimentos específicos da história recebida. Evite uma letra genérica.
- O tom deve combinar com a relação informada. O estilo musical é uma direção criativa adicional.
- Não invente fatos que contradigam a história. Metáforas são permitidas quando ancoradas no que foi contado.
- Use linguagem simples, sensorial e emocional. Evite clichês; rimas devem soar fluidas, nunca forçadas.
- A letra deve ter aproximadamente dois minutos e seguir esta estrutura: Verso 1 (4 a 6 linhas), Pré-refrão opcional (2 linhas), Refrão (4 linhas e marcante), Verso 2 (4 a 6 linhas), repetição do refrão, Ponte (2 a 4 linhas, o momento mais emocional) e Refrão Final com possível variação.

FORMATO DE SAÍDA
Responda somente com a letra pronta, sem explicação, introdução ou comentário. Use exatamente os títulos entre colchetes: [Verso 1], [Pré-refrão] quando houver, [Refrão], [Verso 2], [Ponte] e [Refrão Final].`;

    const userInput = `NOME: ${input.honoree}\nRELAÇÃO: ${input.recipient}\nESTILO MUSICAL: ${input.style}\nPREFERÊNCIA DE VOZ: ${input.voiceGender === "f" ? "feminina" : "masculina"}\nHISTÓRIA:\n${input.story}`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-5.4-mini", reasoning: { effort: "low" }, text: { verbosity: "medium" }, max_output_tokens: 650, instructions, input: userInput }),
    });

    const result = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
    const lyrics = result.output_text?.trim() || result.output?.flatMap(item => item.content ?? []).filter(item => item.type === "output_text").map(item => item.text ?? "").join("\n").trim();
    if (!response.ok || !lyrics) throw new Error(result.error?.message ?? "Não foi possível gerar a letra.");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("webhook_events").insert({ provider: "openai", event_key: crypto.randomUUID(), payload: { model: "gpt-5.4-mini", recipient: input.recipient, style: input.style, voice_gender: input.voiceGender } });
    return new Response(JSON.stringify({ lyrics }), { headers: corsHeaders });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao criar a prévia.", 500);
  }
});
