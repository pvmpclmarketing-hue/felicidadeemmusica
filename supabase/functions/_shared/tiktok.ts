const hash = async (value: string) => Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase()))),
).map((byte) => byte.toString(16).padStart(2, "0")).join("");

type TikTokResult = { delivered: boolean; eventId: string; error?: string };

function isTikTokOrder(order: Record<string, unknown>) {
  const quiz = (order.quiz_data ?? {}) as Record<string, unknown>;
  return quiz.marketing_source === "tiktok";
}

async function sendTikTokEvent(
  eventName: "InitiateCheckout" | "CompletePayment",
  order: Record<string, unknown>,
  request?: Request,
  suppliedEventId?: string,
): Promise<TikTokResult> {
  const eventId = suppliedEventId || `${eventName === "CompletePayment" ? "purchase" : "initiate"}_${String(order.id)}`;
  if (!isTikTokOrder(order)) return { delivered: true, eventId };

  const token = Deno.env.get("TIKTOK_EVENTS_API_TOKEN");
  const pixelCode = Deno.env.get("TIKTOK_PIXEL_CODE") ?? "DA7IQGJC77U98E0UH640";
  if (!token) return { delivered: false, eventId, error: "TikTok Events API não configurada." };

  const phone = String(order.buyer_phone ?? "").replace(/\D/g, "");
  const amount = Number(order.amount_cents ?? 1990) / 100;
  const forwardedFor = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = request?.headers.get("user-agent")?.trim();
  const event = {
    event: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    user: {
      ...(phone ? { phone: [await hash(`55${phone}`)] } : {}),
      ...(forwardedFor ? { ip: forwardedFor } : {}),
      ...(userAgent ? { user_agent: userAgent } : {}),
    },
    page: { url: `${Deno.env.get("SITE_URL") ?? ""}/tiktok` },
    properties: {
      currency: "BRL",
      value: amount,
      content_id: "musica-personalizada",
      content_type: "product",
      description: "Música personalizada",
    },
  };

  try {
    const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: { "content-type": "application/json", "Access-Token": token },
      body: JSON.stringify({ event_source: "web", event_source_id: pixelCode, data: [event] }),
    });
    const responseText = await response.text();
    if (!response.ok) return { delivered: false, eventId, error: `TikTok Events API respondeu ${response.status}: ${responseText.slice(0, 500)}` };
    return { delivered: true, eventId };
  } catch (error) {
    return { delivered: false, eventId, error: error instanceof Error ? error.message : "Falha desconhecida ao enviar evento ao TikTok." };
  }
}

export const trackTikTokInitiateCheckout = (order: Record<string, unknown>, request?: Request, eventId?: string) =>
  sendTikTokEvent("InitiateCheckout", order, request, eventId);

export const trackTikTokCompletePayment = (order: Record<string, unknown>, request?: Request) =>
  sendTikTokEvent("CompletePayment", order, request);
