import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ResponsePayload = { error?: unknown; orderId?: unknown; previewId?: unknown };

function compact(value: unknown, limit = 900) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit) || null;
}

async function payloadOf(response: Response): Promise<ResponsePayload> {
  try {
    const body = await response.clone().text();
    return JSON.parse(body) as ResponsePayload;
  } catch {
    return {};
  }
}

/**
 * Registra uma chamada sem guardar o corpo do quiz, letras, comprovantes ou PII.
 * Falhas do próprio monitoramento nunca interferem no checkout.
 */
export async function withApiMonitoring(
  functionName: string,
  request: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  if (request.method === "OPTIONS") return handler();

  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  let response: Response;

  try {
    response = await handler();
  } catch (cause) {
    const message = compact(cause instanceof Error ? cause.message : "Falha inesperada");
    response = new Response(JSON.stringify({ error: message ?? "Falha inesperada." }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  try {
    const payload = await payloadOf(response);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const monitoredError = compact(response.headers.get("x-api-monitor-error"));
    await supabase.from("api_call_logs").insert({
      request_id: requestId,
      function_name: functionName,
      method: request.method,
      http_status: response.status,
      outcome: response.ok && !monitoredError ? "success" : "error",
      duration_ms: Math.max(0, Date.now() - startedAt),
      correlation_id: compact(payload.orderId ?? payload.previewId, 120),
      error_message: monitoredError ?? (response.ok ? null : compact(payload.error ?? `HTTP ${response.status}`)),
      metadata: {
        path: new URL(request.url).pathname,
        source: request.headers.get("origin") ? "browser" : "webhook_or_server",
      },
    });
  } catch {
    // A telemetria é auxiliar: nunca bloqueia uma venda ou uma geração.
  }

  return response;
}
