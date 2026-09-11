"use client";

import { useEffect } from "react";

const trackedPaths = new Set(["/", "/tiktok", "/novo", "/versao-2", "/versao-3", "/versao-4", "/versao-5", "/versao-6", "/versao-infantil"]);
const endpoint = process.env.NEXT_PUBLIC_MINIFLUXO_VISITS_URL ?? "https://minifluxo.vercel.app/api/site-visits";
const storageKey = "fem:visit-counter:id:v1";

function visitorId() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return saved;
    const next = crypto.randomUUID();
    localStorage.setItem(storageKey, next);
    return next;
  } catch { return crypto.randomUUID(); }
}

export function VisitCounter() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (!trackedPaths.has(path)) return;
    const payload = JSON.stringify({ visitor_id: visitorId(), path });
    const sent = navigator.sendBeacon?.(endpoint, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
    if (!sent) void fetch(endpoint, { method: "POST", body: payload, keepalive: true }).catch(() => undefined);
  }, []);
  return null;
}
