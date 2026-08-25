const hash = async (value: string) => Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase()))),
).map((byte) => byte.toString(16).padStart(2, "0")).join("");

export type MetaPurchaseResult = {
  delivered: boolean;
  eventId: string;
  error?: string;
};

/**
 * The browser Pixel and CAPI must use precisely this ID for Meta to
 * deduplicate the same Purchase. Never generate a second random ID here.
 */
export async function trackMetaPurchase(order: Record<string, any>, request?: Request): Promise<MetaPurchaseResult> {
  const eventId = `purchase_${String(order.id)}`;
  const quiz = (order.quiz_data ?? {}) as Record<string, unknown>;
  const isKidsBirthday = typeof quiz.site_variant === "string" && quiz.site_variant.startsWith("kids_birthday_");
  const pixel = isKidsBirthday
    ? (Deno.env.get("META_CAPI_PIXEL_ID_KIDS_BIRTHDAY") ?? "4049735971823443")
    : Deno.env.get("META_CAPI_PIXEL_ID");
  const token = isKidsBirthday
    ? (Deno.env.get("META_CAPI_ACCESS_TOKEN_KIDS_BIRTHDAY") ?? Deno.env.get("META_CAPI_ACCESS_TOKEN"))
    : Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!pixel || !token) return { delivered: false, eventId, error: "Meta CAPI não configurada." };

  const phone = String(order.buyer_phone ?? "").replace(/\D/g, "");
  const forwardedFor = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = request?.headers.get("user-agent")?.trim();
  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: Deno.env.get("SITE_URL") ?? "",
    user_data: {
      ...(phone ? { ph: [await hash(`55${phone}`)] } : {}),
      ...(forwardedFor ? { client_ip_address: forwardedFor } : {}),
      ...(userAgent ? { client_user_agent: userAgent } : {}),
    },
    custom_data: {
      currency: "BRL",
      value: Number(order.amount_cents ?? 1990) / 100,
      order_id: String(order.id),
    },
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: [event],
        ...(Deno.env.get("META_CAPI_TEST_EVENT_CODE") ? { test_event_code: Deno.env.get("META_CAPI_TEST_EVENT_CODE") } : {}),
      }),
    });
    const responseText = await response.text();
    if (!response.ok) {
      return { delivered: false, eventId, error: `Meta CAPI respondeu ${response.status}: ${responseText.slice(0, 500)}` };
    }
    return { delivered: true, eventId };
  } catch (error) {
    return { delivered: false, eventId, error: error instanceof Error ? error.message : "Falha desconhecida ao enviar Purchase à Meta." };
  }
}
