"use client";

declare global { interface Window { fbq?: (...args: unknown[]) => void; gtag?: (...args: unknown[]) => void; } }

export function trackInitiateCheckout(orderId: string, amountCents = Number(process.env.NEXT_PUBLIC_MUSIC_PRICE_CENTS ?? 1990)) {
  const eventId = `initiate_${orderId}`;
  const value = amountCents / 100;
  window.fbq?.("track", "InitiateCheckout", { currency: "BRL", value }, { eventID: eventId });
  window.gtag?.("event", "begin_checkout", { currency: "BRL", value, transaction_id: orderId });
}

export function trackPurchase(orderId: string, amountCents = Number(process.env.NEXT_PUBLIC_MUSIC_PRICE_CENTS ?? 1990)) {
  const value = amountCents / 100;
  const eventId = `purchase_${orderId}`;
  window.fbq?.("track", "Purchase", { currency: "BRL", value }, { eventID: eventId });
  window.gtag?.("event", "purchase", { currency: "BRL", value, transaction_id: orderId });
}
