const corsHeaders = {
  "Access-Control-Allow-Origin": "https://felicidadeemmusica.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
};

const maxAudioBytes = 25 * 1024 * 1024;
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers: corsHeaders });

const transcriptionPrompt = `Você é um agente especialista em reconhecimento de fala, transcrição e revisão da língua portuguesa do Brasil.

Transcreva tudo o que for realmente falado no áudio com fidelidade, clareza e naturalidade. Corrija pontuação, acentuação, maiúsculas, concordância e separação de frases e parágrafos, sem resumir, reescrever ideias ou alterar a intenção da pessoa.

Remova apenas vícios de linguagem que não acrescentem sentido, como repetições acidentais, “é…”, “ahn…”, “hum…” e pausas excessivas. Mantenha essas expressões quando forem importantes para a emoção, hesitação ou contexto.

Preserve uma linguagem natural e identifique corretamente nomes de pessoas, empresas, produtos, cidades, números, valores, datas, horários, siglas e termos técnicos. Quando houver mais de uma pessoa falando, separe as falas como “Pessoa 1:” e “Pessoa 2:”; use nome ou função quando for possível identificar. Para trechos incompreensíveis use [inaudível]; para hipótese sem certeza use [provavelmente: palavra ou frase]. Sinalize de forma discreta [risos], [música ao fundo], [barulho externo] e [pausa] quando relevantes.

Escreva números adequadamente ao contexto, mantendo telefones, documentos e códigos claramente separados. Entregue somente a transcrição final revisada, em português brasileiro, pronta para ser usada. Prioridade máxima: fidelidade ao áudio, depois clareza e correção gramatical. Nunca invente palavras.`;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail("Método não permitido.", 405);

  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");
    if (!(audio instanceof File) || !audio.size) return fail("Envie um áudio para continuar.");
    if (audio.size > maxAudioBytes) return fail("O áudio deve ter no máximo 25 MB.");

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return fail("A transcrição ainda não foi configurada.", 503);

    const form = new FormData();
    form.append("file", audio, audio.name || "historia.webm");
    form.append("model", Deno.env.get("OPENAI_TRANSCRIPTION_MODEL") || "gpt-4o-mini-transcribe");
    form.append("language", "pt");
    form.append("prompt", transcriptionPrompt);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const result = await response.json() as { text?: string; error?: { message?: string } };
    if (!response.ok || !result.text?.trim()) throw new Error(result.error?.message || "Não foi possível transcrever o áudio.");
    return new Response(JSON.stringify({ transcript: result.text.trim() }), { headers: corsHeaders });
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : "Falha ao transcrever o áudio.", 500);
  }
});
