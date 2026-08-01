"use client";

import { useState } from "react";

export function PixQrCard({ qrCode, payload, message }: { qrCode: string; payload: string; message: string }) {
  const [copied, setCopied] = useState(false);
  async function copyPix() {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }
  return <>
    <img src={qrCode} alt="QR Code Pix" />
    <p>{message}</p>
    <button className={`primary pix-action${copied ? " copied" : ""}`} onClick={() => void copyPix()}>{copied ? "✓ Pix copiado!" : "Copiar código Pix"}</button>
    <small className="pix-waiting">A confirmação acontece automaticamente. Você pode permanecer nesta página.</small>
  </>;
}
