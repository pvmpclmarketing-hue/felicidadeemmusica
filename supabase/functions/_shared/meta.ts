const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase())))).map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function sendMetaEvent(eventName: "InitiateCheckout" | "Purchase", order: Record<string, unknown>, request?: Request) {
  const pixel = Deno.env.get("META_CAPI_PIXEL_ID");
  const token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!pixel || !token) return;

  const phone = String(order.buyer_phone ?? "").replace(/\D/g, "");
  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: `${eventName === "Purchase" ? "purchase" : "initiate"}_${order.id}`,
    action_source: "website",
    event_source_url: Deno.env.get("SITE_URL") ?? "",
    user_data: {
      ...(phone ? { ph: [await hash(`55${phone}`)] } : {}),
      ...(request ? { client_ip_address: request.headers.get("x-forwarded-for")?.split(",")[0], client_user_agent: request.headers.get("user-agent") } : {}),
    },
    custom_data: { currency: "BRL", value: Number(order.amount_cents ?? 1990) / 100, order_id: order.id },
  };
  try {
    await fetch(`https://graph.facebook.com/v22.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [event], ...(Deno.env.get("META_CAPI_TEST_EVENT_CODE") ? { test_event_code: Deno.env.get("META_CAPI_TEST_EVENT_CODE") } : {}) }),
    });
  } catch { /* acompanhamento não pode bloquear o pedido */ }
}

export const trackMetaInitiateCheckout = (order: Record<string, unknown>, request?: Request) => sendMetaEvent("InitiateCheckout", order, request);
export const trackMetaPurchase = (order: Record<string, unknown>, request?: Request) => sendMetaEvent("Purchase", order, request);
