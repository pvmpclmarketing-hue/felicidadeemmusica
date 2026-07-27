import express from "express";
import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "KIE_API_KEY", "KIE_CALLBACK_URL", "KIE_CALLBACK_SECRET"];
for (const key of required) if (!process.env[key]) console.warn(`Variável ausente: ${key}`);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const app = express();
app.use(express.json({ limit: "1mb" }));

const musicStyles = {
  "Romântico": "romantic Brazilian pop ballad, warm intimate vocals, emotional piano and acoustic guitar",
  "Sertanejo": "Brazilian sertanejo, emotional acoustic guitar, warm vocal, heartfelt chorus",
  "Gospel": "Brazilian contemporary gospel, uplifting piano, acoustic guitar, emotional vocal, hopeful chorus",
  "MPB": "Brazilian MPB, poetic acoustic arrangement, warm intimate vocal, subtle percussion",
  "Pop acústico": "Brazilian acoustic pop, emotional guitar and piano, intimate vocal, memorable chorus",
  "Samba": "Brazilian samba, gentle cavaquinho and percussion, warm emotional vocal, joyful groove",
  "Pagode": "Brazilian pagode, cavaquinho, pandeiro and warm emotional vocal, memorable sing-along chorus",
};

function callbackUrl() {
  const base = process.env.KIE_CALLBACK_URL;
  const secret = process.env.KIE_CALLBACK_SECRET;
  if (!base || !secret) throw new Error("Configure KIE_CALLBACK_URL e KIE_CALLBACK_SECRET.");
  const url = new URL(base);
  url.searchParams.set("token", secret);
  return url.toString();
}

async function processOneJob() {
  const { data: job, error } = await supabase.from("generation_jobs").select("id, order_id, attempts").eq("status", "queued").order("created_at").limit(1).maybeSingle();
  if (error || !job) return false;
  const { data: claimed } = await supabase.from("generation_jobs").update({ status: "processing", locked_at: new Date().toISOString(), attempts: job.attempts + 1 }).eq("id", job.id).eq("status", "queued").select("id").maybeSingle();
  if (!claimed) return false;

  const { data: order } = await supabase.from("orders").select("*").eq("id", job.order_id).single();
  if (!order) throw new Error("Pedido não encontrado.");
  await supabase.from("orders").update({ status: "generating" }).eq("id", order.id);

  try {
    const title = `Canção para ${order.honoree}`.slice(0, 80);
    const response = await fetch(process.env.KIE_GENERATE_URL ?? "https://api.kie.ai/api/v1/generate", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${process.env.KIE_API_KEY}` },
      body: JSON.stringify({
        customMode: true,
        instrumental: false,
        model: process.env.KIE_MODEL ?? "V4",
        title,
        style: musicStyles[order.style] ?? order.style,
        prompt: order.lyric_text ?? order.story,
        callBackUrl: callbackUrl(),
      }),
    });
    const result = await response.json();
    const taskId = result.taskId ?? result.data?.taskId ?? result.data?.task_id;
    if (!response.ok || !taskId) throw new Error(result.message ?? result.msg ?? "A Kie não retornou o identificador da tarefa.");
    await supabase.from("generation_jobs").update({ status: "submitted", provider_task_id: String(taskId), last_error: null }).eq("id", job.id);
    return true;
  } catch (error) {
    await supabase.from("generation_jobs").update({ status: "failed", last_error: error instanceof Error ? error.message : "Falha desconhecida" }).eq("id", job.id);
    await supabase.from("orders").update({ status: "delivery_failed" }).eq("id", order.id);
    return false;
  }
}

app.get("/health", (_, response) => response.json({ ok: true }));

app.post("/webhooks/kie", async (request, response) => {
  if (!process.env.KIE_CALLBACK_SECRET || request.query.token !== process.env.KIE_CALLBACK_SECRET) return response.status(401).json({ error: "unauthorized" });
  try {
    const event = request.body;
    const taskId = event?.data?.task_id;
    const callbackType = event?.data?.callbackType;
    if (!taskId || !callbackType) return response.status(200).json({ received: true });

    const eventKey = `${taskId}:${callbackType}`;
    const { error: eventError } = await supabase.from("webhook_events").insert({ provider: "kie", event_key: eventKey, payload: event });
    if (eventError?.code === "23505") return response.status(200).json({ received: true, duplicate: true });
    if (eventError) throw eventError;

    const { data: job } = await supabase.from("generation_jobs").select("id, order_id").eq("provider_task_id", String(taskId)).maybeSingle();
    if (!job) return response.status(200).json({ received: true });

    if (callbackType === "complete" && event.code === 200) {
      const versions = (event.data.data ?? []).map((track) => ({ id: track.id, audioUrl: track.audio_url, streamUrl: track.stream_audio_url, coverUrl: track.image_url, title: track.title, duration: track.duration })).filter((track) => track.audioUrl);
      if (!versions.length) throw new Error("A Kie concluiu a tarefa sem arquivos de áudio.");
      await supabase.from("generation_jobs").update({ status: "completed", last_error: null }).eq("id", job.id);
      await supabase.from("orders").update({ status: "ready", music_url: versions[0].audioUrl, music_versions: versions }).eq("id", job.order_id);
    } else if (callbackType === "error" || event.code >= 400) {
      await supabase.from("generation_jobs").update({ status: "failed", last_error: event.msg ?? "A Kie não conseguiu gerar a música." }).eq("id", job.id);
      await supabase.from("orders").update({ status: "delivery_failed" }).eq("id", job.order_id);
    }
    return response.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "callback processing failed" });
  }
});

app.post("/jobs/process", async (request, response) => {
  if (process.env.WORKER_SECRET && request.header("x-worker-secret") !== process.env.WORKER_SECRET) return response.status(401).json({ error: "unauthorized" });
  const processed = await processOneJob();
  return response.json({ processed });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Worker disponível na porta ${port}`));
setInterval(() => { processOneJob().catch(console.error); }, 30_000);
