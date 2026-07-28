"use client";

declare global { interface Window { fbq?: (...args: unknown[]) => void; gtag?: (...args: unknown[]) => void; } }

export function trackInitiateCheckout(orderId: string) {
  const eventId = `initiate_${orderId}`;
  const value = Number(process.env.NEXT_PUBLIC_MUSIC_PRICE_CENTS ?? 1990) / 100;
  window.fbq?.("track", "InitiateCheckout", { currency: "BRL", value }, { eventID: eventId });
  window.gtag?.("event", "begin_checkout", { currency: "BRL", value, transaction_id: orderId });
}
