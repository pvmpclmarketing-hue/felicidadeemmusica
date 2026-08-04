"use client";

import { useEffect, useMemo, useState } from "react";

const fallbackPhone = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5522992885365").replace(/\D/g, "");
const supportMessage = "Olá! Preciso de ajuda com a minha música personalizada.";

export function SupportWhatsApp({ compact = false }: { compact?: boolean }) {
  const [phone, setPhone] = useState(fallbackPhone);
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!baseUrl || !publishableKey) return;
    void fetch(`${baseUrl}/rest/v1/site_public_settings?select=support_whatsapp&id=eq.true&limit=1`, { headers: { apikey: publishableKey } })
      .then(async (response) => response.ok ? await response.json() as Array<{ support_whatsapp?: string }> : [])
      .then((settings) => {
        const configured = settings[0]?.support_whatsapp?.replace(/\D/g, "");
        if (configured) setPhone(configured);
      }).catch(() => undefined);
  }, []);
  const supportUrl = useMemo(() => `https://wa.me/${phone}?text=${encodeURIComponent(supportMessage)}`, [phone]);
  return <section className={`support-whatsapp${compact ? " support-whatsapp-compact" : ""}`}>
    <p>PRECISA DE AJUDA?</p>
    <a href={supportUrl} target="_blank" rel="noreferrer">💬 Chamar no WhatsApp</a>
  </section>;
}

export function StoryTestimonials() {
  return <section className="message-testimonials story-testimonials">
    <p className="kicker">REAÇÕES REAIS</p>
    <h2>Histórias que viraram um momento inesquecível.</h2>
    <p className="message-testimonials-lead">Veja o que acontece quando uma história especial ganha voz e melodia.</p>
    <div className="message-testimonials-grid">
      {[["Depoimento de uma esposa", "/media/depoimento-1.png"], ["Depoimento de uma mãe", "/media/depoimento-2.png"], ["Depoimento de um marido", "/media/depoimento-3.png"]].map(([alt, src]) => <figure key={src}><img src={src} alt={alt}/></figure>)}
    </div>
  </section>;
}
