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

async function sendMetaEvent(eventName: "InitiateCheckout" | "Purchase", order: Record<string, unknown>, request?: Request, eventId?: string) {
  const quiz = (order.quiz_data ?? {}) as Record<string, unknown>;
  const isKidsBirthday = typeof quiz.site_variant === "string" && quiz.site_variant.startsWith("kids_birthday_");
  const pixel = isKidsBirthday
    ? (Deno.env.get("META_CAPI_PIXEL_ID_KIDS_BIRTHDAY") ?? Deno.env.get("META_CAPI_PIXEL_ID"))
    : Deno.env.get("META_CAPI_PIXEL_ID");
  const token = isKidsBirthday
    ? (Deno.env.get("META_CAPI_ACCESS_TOKEN_KIDS_BIRTHDAY") ?? Deno.env.get("META_CAPI_ACCESS_TOKEN"))
    : Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!pixel || !token) return;

  const phone = String(order.buyer_phone ?? "").replace(/\D/g, "");
  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId || `${eventName === "Purchase" ? "purchase" : "initiate"}_${order.id}`,
    action_source: "website",
    event_source_url: Deno.env.get("SITE_URL") ?? "",
    user_data: {
      ...(phone ? { ph: [await hash(`55${phone}`)] } : {}),
      ...(request ? { client_ip_address: request.headers.get("x-forwarded-for")?.split(",")[0], client_user_agent: request.headers.get("user-agent") } : {}),
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
    if (!response.ok) console.error("Meta CAPI rejeitou evento", { eventName, eventId: event.event_id, status: response.status, response: (await response.text()).slice(0, 500) });
  } catch { /* acompanhamento não pode bloquear o pedido */ }
}

export const trackMetaInitiateCheckout = (order: Record<string, unknown>, request?: Request, eventId?: string) => sendMetaEvent("InitiateCheckout", order, request, eventId);
export const trackMetaPurchase = (order: Record<string, unknown>, request?: Request) => sendMetaEvent("Purchase", order, request);
