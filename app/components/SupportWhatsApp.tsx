const configuredPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
const supportPhone = configuredPhone.replace(/\D/g, "");
const supportUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent("Olá! Preciso de ajuda com a minha música personalizada.")}`;

export function SupportWhatsApp({ compact = false }: { compact?: boolean }) {
  if (!supportPhone) return null;
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
      {[
        ["Depoimento de uma esposa", "/media/depoimento-1.png"],
        ["Depoimento de uma mãe", "/media/depoimento-2.png"],
        ["Depoimento de um marido", "/media/depoimento-3.png"],
      ].map(([alt, src]) => <figure key={src}><img src={src} alt={alt}/></figure>)}
    </div>
  </section>;
}
