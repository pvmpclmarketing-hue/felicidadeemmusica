"use client";

declare global { interface Window { fbq?: (...args: unknown[]) => void; gtag?: (...args: unknown[]) => void; } }

export function trackInitiateCheckout(orderId: string) {
  const eventId = `initiate_${orderId}`;
  window.fbq?.("track", "InitiateCheckout", { currency: "BRL", value: 19.9 }, { eventID: eventId });
  window.gtag?.("event", "begin_checkout", { currency: "BRL", value: 19.9, transaction_id: orderId });
}
