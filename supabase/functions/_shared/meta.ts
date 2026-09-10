const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase())))).map((byte) => byte.toString(16).padStart(2, "0")).join("");

function moneyValue(order: Record<string, unknown>) {
  const orderAmount = Number(order.amount_cents);
  const configuredAmount = Number(Deno.env.get("MUSIC_PRICE_CENTS") ?? "1990");
  const amountCents = Number.isFinite(orderAmount) && orderAmount > 0
    ? orderAmount
    : Number.isFinite(configuredAmount) && configuredAmount > 0
      ? configuredAmount
      : 1990;
  return Math.round(amountCents) / 100;
}

type MetaResult = { delivered: boolean; eventId: string; error?: string };
const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

async function sendMetaEvent(eventName: "InitiateCheckout" | "Purchase", order: Record<string, unknown>, request?: Request, eventId?: string): Promise<MetaResult> {
  const quiz = (order.quiz_data ?? {}) as Record<string, unknown>;
  const isKidsBirthday = typeof quiz.site_variant === "string" && quiz.site_variant.startsWith("kids_birthday_");
  const pixel = isKidsBirthday
    ? (Deno.env.get("META_CAPI_PIXEL_ID_KIDS_BIRTHDAY") ?? "4049735971823443")
    : Deno.env.get("META_CAPI_PIXEL_ID");
  const token = isKidsBirthday
    ? (Deno.env.get("META_CAPI_ACCESS_TOKEN_KIDS_BIRTHDAY") ?? Deno.env.get("META_CAPI_ACCESS_TOKEN"))
    : Deno.env.get("META_CAPI_ACCESS_TOKEN");
  const resolvedEventId = eventId || `${eventName === "Purchase" ? "purchase" : "initiate"}_${String(order.id)}`;
  if (!pixel || !token) return { delivered: false, eventId: resolvedEventId, error: "Meta CAPI não configurada." };

  const phone = String(order.buyer_phone ?? "").replace(/\D/g, "");
  const nameParts = normalized(order.buyer_name).split(" ").filter(Boolean);
  const tracking = (quiz.tracking ?? {}) as Record<string, unknown>;
  const eventSourceUrl = typeof tracking.event_source_url === "string" ? tracking.event_source_url : Deno.env.get("SITE_URL") ?? "";
  const fbp = typeof tracking.fbp === "string" ? tracking.fbp : undefined;
  const fbc = typeof tracking.fbc === "string" ? tracking.fbc : undefined;
  const clientUserAgent = typeof tracking.client_user_agent === "string" ? tracking.client_user_agent : request?.headers.get("user-agent") ?? undefined;
  const clientIp = eventName === "InitiateCheckout" ? request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: resolvedEventId,
    action_source: "website",
    event_source_url: eventSourceUrl,
    user_data: {
      ...(phone ? { ph: [await hash(`55${phone}`)] } : {}),
      ...(nameParts[0] ? { fn: [await hash(nameParts[0])] } : {}),
      ...(nameParts.length > 1 ? { ln: [await hash(nameParts.at(-1)!)] } : {}),
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(clientIp ? { client_ip_address: clientIp } : {}),
      ...(clientUserAgent ? { client_user_agent: clientUserAgent } : {}),
    },
    // Meta requires a numeric value above zero and an ISO 4217 currency.
    custom_data: {
      value: moneyValue(order),
      currency: "BRL",
      content_name: "Música personalizada",
      content_type: "product",
      order_id: String(order.id),
    },
  };
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [event], ...(Deno.env.get("META_CAPI_TEST_EVENT_CODE") ? { test_event_code: Deno.env.get("META_CAPI_TEST_EVENT_CODE") } : {}) }),
    });
    const responseText = await response.text();
    if (!response.ok) return { delivered: false, eventId: resolvedEventId, error: `Meta CAPI respondeu ${response.status}: ${responseText.slice(0, 500)}` };
    return { delivered: true, eventId: resolvedEventId };
  } catch (error) {
    return { delivered: false, eventId: resolvedEventId, error: error instanceof Error ? error.message : "Falha desconhecida ao enviar a CAPI." };
  }
}

export const trackMetaInitiateCheckout = (order: Record<string, unknown>, request?: Request, eventId?: string) => sendMetaEvent("InitiateCheckout", order, request, eventId);
export const trackMetaPurchase = (order: Record<string, unknown>, request?: Request) => sendMetaEvent("Purchase", order, request);
