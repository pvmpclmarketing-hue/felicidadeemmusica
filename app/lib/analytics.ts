"use client";

declare global { interface Window { fbq?: (...args: unknown[]) => void; gtag?: (...args: unknown[]) => void; ttq?: { track: (event: string, data?: Record<string, unknown>) => void }; } }

export type MetaBrowserData = { fbp?: string; fbc?: string; eventSourceUrl?: string };

const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "27184997131196642";
const kidsBirthdayMetaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID_KIDS_BIRTHDAY ?? "4049735971823443";
const sentPurchaseEvents = new Set<string>();

function activeMetaPixelId() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/versao-infantil")
    ? kidsBirthdayMetaPixelId
    : metaPixelId;
}

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
  window.fbq("init", activeMetaPixelId(), {
    ph: `55${normalized}`,
    ...(nameParts[0] ? { fn: nameParts[0] } : {}),
    ...(nameParts.length > 1 ? { ln: nameParts.at(-1) } : {}),
  });
  window.sessionStorage.setItem("meta:advanced-matching:phone", `55${normalized}`);
  window.sessionStorage.setItem(key, "1");
}

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

export function getMetaBrowserData(): MetaBrowserData {
  if (typeof window === "undefined") return {};
  return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc"), eventSourceUrl: window.location.href };
}

export function trackInitiateCheckout(eventId: string, amountCents = Number(process.env.NEXT_PUBLIC_MUSIC_PRICE_CENTS ?? 1990)) {
  const value = amountCents / 100;
  window.fbq?.("track", "InitiateCheckout", { currency: "BRL", value }, { eventID: eventId });
  if (window.location.pathname.startsWith("/tiktok")) window.ttq?.track("InitiateCheckout", { currency: "BRL", value, event_id: eventId, content_id: "musica-personalizada", content_type: "product", contents: [{ content_id: "musica-personalizada", content_type: "product", price: value, quantity: 1 }] });
  window.gtag?.("event", "begin_checkout", { currency: "BRL", value, transaction_id: eventId });
}

/**
 * A paid order can be observed more than once by the Pix status poller: for
 * example after a refresh, returning to the tab, or remounting the checkout.
 * Claim the deterministic event ID before sending any browser conversion so a
 * single order is never counted more than once by the advertising platforms.
 *
 * The same `purchase_<orderId>` ID is used by the server-side Meta CAPI, which
 * lets Meta deduplicate the Pixel and CAPI representations of this purchase.
 */
function claimPurchaseEvent(eventId: string) {
  if (sentPurchaseEvents.has(eventId)) return false;

  if (typeof window !== "undefined") {
    const storageKey = `tracking:purchase-sent:${eventId}`;
    try {
      if (window.localStorage.getItem(storageKey) === "1") return false;
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Private browsing or storage restrictions must not prevent checkout
      // tracking; the in-memory guard above still protects this page session.
    }
  }

  sentPurchaseEvents.add(eventId);
  return true;
}

export function trackPurchase(orderId: string, amountCents = Number(process.env.NEXT_PUBLIC_MUSIC_PRICE_CENTS ?? 1990)) {
  const value = amountCents / 100;
  const eventId = `purchase_${orderId}`;
  if (!claimPurchaseEvent(eventId)) return;
  window.fbq?.("track", "Purchase", { currency: "BRL", value }, { eventID: eventId });
  if (window.location.pathname.startsWith("/tiktok")) window.ttq?.track("CompletePayment", { currency: "BRL", value, event_id: eventId, content_id: "musica-personalizada", content_type: "product", contents: [{ content_id: "musica-personalizada", content_type: "product", price: value, quantity: 1 }] });
  window.gtag?.("event", "purchase", { currency: "BRL", value, transaction_id: orderId });
  if (window.location.pathname.startsWith("/tiktok")) {
    window.gtag?.("event", "conversion", {
      send_to: "AW-18378423513/HdowCIX8rOgcENn5wbtE",
      transaction_id: orderId,
    });
  }
}
