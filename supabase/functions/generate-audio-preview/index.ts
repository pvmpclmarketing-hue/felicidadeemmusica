import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withApiMonitoring } from "../_shared/api-observability.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json; charset=utf-8" };
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: corsHeaders });
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((byte) => byte.toString(16).padStart(2, "0")).join("");

Deno.serve((request) => withApiMonitoring("generate-audio-preview", request, async () => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail("Método não permitido.", 405);
  try {
    const input = await request.json() as { recipient?: string; style?: string; voiceGender?: "m" | "f"; honoree?: string; story?: string };
    if (!input.recipient || !input.style || !["m", "f"].includes(input.voiceGender ?? "") || !input.honoree?.trim() || !input.story?.trim()) return fail("Preencha os dados da história para criar a prévia.");
    const openAiKey = Deno.env.get("OPENAI_API_KEY"), kieKey = Deno.env.get("KIE_API_KEY"), callbackSecret = Deno.env.get("KIE_CALLBACK_SECRET"), rateSalt = Deno.env.get("PREVIEW_RATE_LIMIT_SALT");
    if (!openAiKey || !kieKey || !callbackSecret || !rateSalt) return fail("A prévia em música ainda não foi configurada.", 503);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const fingerprint = await hash(`${rateSalt}:${ip}`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase.from("audio_previews").select("id").eq("request_fingerprint", fingerprint).gte("created_at", since).limit(1);
    if (recent?.length) return fail("Você já pediu uma prévia hoje. Aguarde a sua música ficar pronta.", 429);

    const instructions = `Você é um compositor profissional especializado em músicas emocionantes e personalizadas. Transforme a história real em uma letra única. O nome do homenageado deve aparecer naturalmente pelo menos duas vezes. Use detalhes específicos da história, não invente fatos e evite clichês. Estruture em [Verso 1], [Pré-refrão] opcional, [Refrão], [Verso 2], [Ponte] e [Refrão Final]. Responda somente com a letra pronta.`;
    const prompt = `NOME: ${input.honoree.trim()}\nRELAÇÃO: ${input.recipient}\nESTILO: ${input.style}\nVOZ: ${input.voiceGender === "f" ? "feminina" : "masculina"}\nHISTÓRIA:\n${input.story.trim()}`;
    const lyricsResponse = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${openAiKey}` }, body: JSON.stringify({ model: "gpt-5.4-mini", reasoning: { effort: "low" }, text: { verbosity: "medium" }, max_output_tokens: 650, instructions, input: prompt }) });
    const lyricsPayload = await lyricsResponse.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
    const lyrics = lyricsPayload.output_text?.trim() || lyricsPayload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("\n").trim();
    if (!lyricsResponse.ok || !lyrics) throw new Error(lyricsPayload.error?.message ?? "Não foi possível compor a música.");

    const { data: preview, error: previewError } = await supabase.from("audio_previews").insert({ recipient: input.recipient, style: input.style, voice_gender: input.voiceGender, honoree: input.honoree.trim(), story: input.story.trim(), lyric_text: lyrics, request_fingerprint: fingerprint }).select("id").single();
    if (previewError || !preview) throw new Error("Não foi possível preparar a prévia.");
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-preview-webhook?secret=${encodeURIComponent(callbackSecret)}`;
    const kieResponse = await fetch("https://api.kie.ai/api/v1/generate", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${kieKey}` }, body: JSON.stringify({ customMode: true, instrumental: false, model: "V4", prompt: lyrics, style: input.style, title: `Uma música para ${input.honoree.trim()}`, vocalGender: input.voiceGender, callBackUrl: callbackUrl }) });
    const kie = await kieResponse.json() as { data?: { taskId?: string }; msg?: string };
    const taskId = kie.data?.taskId;
    if (!kieResponse.ok || !taskId) { await supabase.from("audio_previews").update({ status: "failed", error_message: kie.msg ?? "A Kie não aceitou a geração." }).eq("id", preview.id); throw new Error(kie.msg ?? "Não foi possível iniciar a música."); }
    await supabase.from("audio_previews").update({ kie_task_id: taskId }).eq("id", preview.id);
    return new Response(JSON.stringify({ previewId: preview.id }), { headers: corsHeaders });
  } catch (error) { return fail(error instanceof Error ? error.message : "Falha ao criar a prévia.", 500); }
}));
