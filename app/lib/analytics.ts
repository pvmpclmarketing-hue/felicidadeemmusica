"use client";

declare global { interface Window { fbq?: (...args: unknown[]) => void; gtag?: (...args: unknown[]) => void; } }

const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "27184997131196642";

/**
 * Advanced Matching manual: the Meta Pixel hashes this phone number before
 * transport. We only call it after the customer has entered the phone field,
 * and remember it in the tab to avoid duplicate Pixel initializations.
 */
export function identifyMetaCustomer(phone: string, name?: string) {
  const normalized = phone.replace(/\D/g, "");
  if (!/^\d{10,11}$/.test(normalized) || !window.fbq) return;
  const nameParts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const key = `meta:advanced-matching:${normalized}:${nameParts.join("_").toLowerCase()}`;
  if (window.sessionStorage.getItem(key)) return;
  window.fbq("init", metaPixelId, {
    ph: `55${normalized}`,
    ...(nameParts[0] ? { fn: nameParts[0] } : {}),
    ...(nameParts.length > 1 ? { ln: nameParts.at(-1) } : {}),
  });
  window.sessionStorage.setItem(key, "1");
}

export function trackInitiateCheckout(eventId: string, amountCents = Number(process.env.NEXT_PUBLIC_MUSIC_PRICE_CENTS ?? 1990)) {
  const value = amountCents / 100;
  window.fbq?.("track", "InitiateCheckout", { currency: "BRL", value }, { eventID: eventId });
  window.gtag?.("event", "begin_checkout", { currency: "BRL", value, transaction_id: eventId });
}

export function trackPurchase(orderId: string, amountCents = Number(process.env.NEXT_PUBLIC_MUSIC_PRICE_CENTS ?? 1990)) {
  const value = amountCents / 100;
  const eventId = `purchase_${orderId}`;
  window.fbq?.("track", "Purchase", { currency: "BRL", value }, { eventID: eventId });
  window.gtag?.("event", "purchase", { currency: "BRL", value, transaction_id: orderId });
}
