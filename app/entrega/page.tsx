"use client";

import { useEffect, useMemo, useState } from "react";
import { SupportWhatsApp } from "../components/SupportWhatsApp";

type Delivery = { status?: string; honoree?: string; musicUrl?: string; musicVersions?: string[]; error?: string };
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function Entrega() {
  const [state, setState] = useState<Delivery>({});
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const id = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("pedido") ?? "";

  useEffect(() => {
    if (!id || !base || !key) return;
    const check = async () => {
      const response = await fetch(`${base}/functions/v1/get-order-delivery-secure`, { method: "POST", headers: { "content-type": "application/json", apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify({ orderId: id }) });
      setState(await response.json());
    };
    void check();
    const timer = window.setInterval(() => void check(), 3000);
    return () => window.clearInterval(timer);
  }, [id]);

  const versions = useMemo(() => [...new Set((state.musicVersions?.length ? state.musicVersions : state.musicUrl ? [state.musicUrl] : []).filter(Boolean))].slice(0, 2), [state.musicUrl, state.musicVersions]);

  async function downloadTrack(index: number) {
    if (!base || !key || !id || downloading !== null) return;
    setDownloading(index);
    setDownloadError("");
    try {
      const response = await fetch(`${base}/functions/v1/download-order-track?orderId=${encodeURIComponent(id)}&index=${index}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (!response.ok) throw new Error("Não foi possível baixar esta versão.");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `felicidade-em-musica-versao-${index + 1}.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1500);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Não foi possível baixar esta versão.");
    } finally {
      setDownloading(null);
    }
  }

  if (state.error || !id) return <main className="delivery-page"><section className="delivery-card"><span className="delivery-mark">♫</span><p className="kicker">ENTREGA NÃO ENCONTRADA</p><h1>Não encontramos esta música.</h1><p>Volte à página do pagamento e abra novamente o link de acompanhamento.</p><SupportWhatsApp compact /></section></main>;

  if (state.status === "delivery_failed") return <main className="delivery-page"><section className="delivery-card"><span className="delivery-mark">!</span><p className="kicker">PRECISAMOS DE UMA AJUDA RÁPIDA</p><h1>Não conseguimos recuperar as duas versões desta prévia.</h1><p>Não vamos gerar outra música. Fale com nosso suporte para liberarmos as faixas originais deste pedido.</p><SupportWhatsApp compact /></section></main>;

  if (state.status !== "ready" || versions.length < 2) return <main className="delivery-page"><section className="delivery-card delivery-waiting"><span className="delivery-mark">♫</span><p className="kicker">PAGAMENTO CONFIRMADO</p><h1>Estamos preparando uma surpresa inesquecível.</h1><p>Suas duas versões completas estão sendo finalizadas com todo carinho. Deixe esta página aberta: elas aparecerão automaticamente.</p><div className="delivery-loader" aria-label="Preparando músicas"><span /></div></section></main>;

  return <main className="delivery-page"><section className="delivery-card delivery-ready"><span className="delivery-mark">♡</span><p className="kicker">SUAS 2 VERSÕES ESTÃO PRONTAS</p><h1>Uma surpresa para <i>{state.honoree}</i>.</h1><p className="delivery-lead">Quando essas músicas tocarem, {state.honoree} vai sentir o carinho em cada detalhe. Prepare-se para uma reação que vocês vão guardar para sempre.</p><div className="delivery-versions">{versions.map((url, index) => <div className="delivery-version" key={url}><span>VERSÃO {index + 1}</span><audio controls src={url}>Seu navegador não suporta áudio.</audio><button className="primary delivery-download" disabled={downloading !== null} onClick={() => void downloadTrack(index)}>{downloading === index ? "Preparando download…" : `↓ Baixar versão ${index + 1}`}</button></div>)}</div>{downloadError&&<p className="error">{downloadError}</p>}<p className="delivery-note">Baixe cada versão separadamente para guardar e compartilhar quando quiser.</p><SupportWhatsApp compact /></section></main>;
}
