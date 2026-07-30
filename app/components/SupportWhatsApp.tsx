const configuredPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5522998951446";
const supportPhone = configuredPhone.replace(/\D/g, "");
const supportUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent("Olá! Preciso de ajuda com a minha música personalizada.")}`;

export function SupportWhatsApp({ compact = false }: { compact?: boolean }) {
  return <>
    {!compact && <section className="message-testimonials">
      <p className="kicker">REAÇÕES REAIS</p>
      <h2>Histórias que viraram um momento inesquecível.</h2>
      <p className="message-testimonials-lead">Quem recebe uma música feita para a sua história sente cada detalhe.</p>
      <div className="message-testimonials-grid">
        {[
          ["Depoimento de uma esposa", "/media/depoimento-1.png"],
          ["Depoimento de uma mãe", "/media/depoimento-2.png"],
          ["Depoimento de um marido", "/media/depoimento-3.png"],
        ].map(([alt, src]) => <figure key={src}><img src={src} alt={alt}/></figure>)}
      </div>
    </section>}
    <section className={`support-whatsapp${compact ? " support-whatsapp-compact" : ""}`}>
      <p>PRECISA DE AJUDA?</p>
      <a href={supportUrl} target="_blank" rel="noreferrer">💬 Chamar no WhatsApp</a>
    </section>
  </>;
}
