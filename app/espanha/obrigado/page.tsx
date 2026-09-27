import { SupportWhatsApp } from "../../components/SupportWhatsApp";

export default function EspanaThankYouPage() {
  return <main className="flow light center" lang="es-ES">
    <section className="delivery-card delivery-ready">
      <span className="delivery-mark" aria-hidden="true">✓</span>
      <p className="kicker">PAGO CONFIRMADO</p>
      <h1>¡Gracias por tu compra!</h1>
      <p className="delivery-lead">Tu canción personalizada ya está en preparación. Nuestro equipo te contactará por WhatsApp para acompañarte en los próximos pasos.</p>
      <SupportWhatsApp
        compact
        heading="¿NECESITAS AYUDA?"
        buttonLabel="💬 Hablar por WhatsApp"
        message="¡Hola! Acabo de realizar mi compra y necesito ayuda con mi canción personalizada."
      />
    </section>
  </main>;
}
