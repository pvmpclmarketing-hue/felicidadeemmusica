const configuredPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5522998951446";
const supportPhone = configuredPhone.replace(/\D/g, "");
const supportUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent("Olá! Preciso de ajuda com a minha música personalizada.")}`;

export function SupportWhatsApp({ compact = false }: { compact?: boolean }) {
  return <section className={`support-whatsapp${compact ? " support-whatsapp-compact" : ""}`}>
    <p>PRECISA DE AJUDA?</p>
    <a href={supportUrl} target="_blank" rel="noreferrer">💬 Chamar no WhatsApp</a>
  </section>;
}
