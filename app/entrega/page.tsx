"use client";

import { useEffect, useMemo, useState } from "react";
import { SupportWhatsApp } from "../components/SupportWhatsApp";

type Delivery = { status?: string; honoree?: string; musicUrl?: string; musicVersions?: string[]; error?: string };
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function Entrega() {
  const [state, setState] = useState<Delivery>({});
  const [downloading, setDownloading] = useState(false);
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

  async function downloadBoth() {
    setDownloading(true);
    try {
      for (let index = 0; index < versions.length; index += 1) {
        const response = await fetch(versions[index]);
        if (!response.ok) throw new Error("download");
        const blob = await response.blob();
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = `felicidade-em-musica-versao-${index + 1}.mp3`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(href);
        await new Promise(resolve => window.setTimeout(resolve, 450));
      }
    } catch {
      versions.forEach((url, index) => {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.download = `felicidade-em-musica-versao-${index + 1}.mp3`;
        link.click();
      });
    } finally {
      setDownloading(false);
    }
  }

  if (state.error || !id) return <main className="delivery-page"><section className="delivery-card"><span className="delivery-mark">♫</span><p className="kicker">ENTREGA NÃO ENCONTRADA</p><h1>Não encontramos esta música.</h1><p>Volte à página do pagamento e abra novamente o link de acompanhamento.</p><SupportWhatsApp compact /></section></main>;

  if (state.status !== "ready" || versions.length < 2) return <main className="delivery-page"><section className="delivery-card delivery-waiting"><span className="delivery-mark">♫</span><p className="kicker">PAGAMENTO CONFIRMADO</p><h1>Estamos preparando uma surpresa inesquecível.</h1><p>Suas duas versões completas estão sendo finalizadas com todo carinho. Deixe esta página aberta: elas aparecerão automaticamente.</p><div className="delivery-loader" aria-label="Preparando músicas"><span /></div></section></main>;

  return <main className="delivery-page"><section className="delivery-card delivery-ready"><span className="delivery-mark">♡</span><p className="kicker">SUAS 2 VERSÕES ESTÃO PRONTAS</p><h1>Uma surpresa para <i>{state.honoree}</i>.</h1><p className="delivery-lead">Quando essas músicas tocarem, {state.honoree} vai sentir o carinho em cada detalhe. Prepare-se para uma reação que vocês vão guardar para sempre.</p><div className="delivery-versions">{versions.map((url, index) => <div className="delivery-version" key={url}><span>VERSÃO {index + 1}</span><audio controls src={url}>Seu navegador não suporta áudio.</audio></div>)}</div><button className="primary delivery-download-all" disabled={downloading} onClick={() => void downloadBoth()}>{downloading ? "Preparando os downloads…" : "↓ Baixar as 2 músicas"}</button><p className="delivery-note">Um único toque baixa as duas versões completas para você guardar e compartilhar.</p><SupportWhatsApp compact /></section></main>;
}
