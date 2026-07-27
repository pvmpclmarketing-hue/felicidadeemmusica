import express from "express";
import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "KIE_GENERATE_URL", "KIE_API_KEY"];
for (const key of required) if (!process.env[key]) console.warn(`Variável ausente: ${key}`);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const app = express();
app.use(express.json({ limit: "1mb" }));

async function processOneJob() {
  const { data: job, error } = await supabase.from("generation_jobs").select("id, order_id, attempts").eq("status", "queued").order("created_at").limit(1).maybeSingle();
  if (error || !job) return false;
  const { data: claimed } = await supabase.from("generation_jobs").update({ status: "processing", locked_at: new Date().toISOString(), attempts: job.attempts + 1 }).eq("id", job.id).eq("status", "queued").select("id").maybeSingle();
  if (!claimed) return false;
  const { data: order } = await supabase.from("orders").select("*").eq("id", job.order_id).single();
  if (!order) throw new Error("Pedido não encontrado.");
  await supabase.from("orders").update({ status: "generating" }).eq("id", order.id);
  try {
    // O formato exato é concentrado aqui. Ajuste apenas este payload conforme a documentação da API Kie contratada.
    const response = await fetch(process.env.KIE_GENERATE_URL, { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${process.env.KIE_API_KEY}` }, body: JSON.stringify({ orderId: order.id, title: `Canção para ${order.honoree}`, style: order.style, lyrics: order.lyric_text ?? order.story, callbackUrl: process.env.KIE_CALLBACK_URL }) });
    const result = await response.json();
    const taskId = result.taskId ?? result.id ?? result.data?.taskId;
    if (!response.ok || !taskId) throw new Error(result.message ?? "A Kie não retornou o identificador da tarefa.");
    await supabase.from("generation_jobs").update({ status: "submitted", provider_task_id: String(taskId), last_error: null }).eq("id", job.id);
    return true;
  } catch (error) {
    await supabase.from("generation_jobs").update({ status: "failed", last_error: error instanceof Error ? error.message : "Falha desconhecida" }).eq("id", job.id);
    await supabase.from("orders").update({ status: "delivery_failed" }).eq("id", order.id);
    return false;
  }
}

app.get("/health", (_, response) => response.json({ ok: true }));
app.post("/jobs/process", async (request, response) => {
  if (process.env.WORKER_SECRET && request.header("x-worker-secret") !== process.env.WORKER_SECRET) return response.status(401).json({ error: "unauthorized" });
  const processed = await processOneJob();
  return response.json({ processed });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Worker disponível na porta ${port}`));
setInterval(() => { processOneJob().catch(console.error); }, 30_000);
