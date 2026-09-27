"use client";

import { useState } from "react";

type Form = {
  recipient: string;
  style: string;
  voiceGender: "" | "m" | "f";
  honoree: string;
  story: string;
  buyerName: string;
  phone: string;
};

const recipients = ["Mi pareja", "Mi mamá", "Mi papá", "Una amistad", "Otra persona especial"];
const styles = ["Romántica", "Regional mexicano", "Góspel", "Balada pop", "Pop acústico", "Salsa", "Cumbia"];
const faqs = [
  ["¿Cuánto cuesta?", "Recibes la letra para revisarla y después eliges si quieres desbloquear las dos versiones por R$ 19,90."],
  ["¿Tengo que pagar antes?", "No. Primero nos cuentas la historia, revisas la letra y decides si quieres continuar con el pago."],
  ["¿Cómo recibo mi canción?", "Después de confirmar el pago, preparamos las versiones y te avisamos por WhatsApp."],
  ["¿Cuánto tarda?", "La letra se presenta antes del pago. Después, la producción final entra en nuestra fila de preparación."],
];

export default function MexicoPage() {
  const [view, setView] = useState<"landing" | "quiz" | "lyrics" | "contact" | "pix">("landing");
  const [step, setStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [pix, setPix] = useState<{ qrCode: string; payload: string }>();
  const [form, setForm] = useState<Form>({ recipient: "", style: "", voiceGender: "", honoree: "", story: "", buyerName: "", phone: "" });

  const set = (key: keyof Form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const begin = () => { setView("quiz"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const edge = async (name: string, body: Record<string, unknown>) => {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!baseUrl || !key) throw new Error("La configuración del sitio aún no está lista.");
    const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No fue posible completar la solicitud.");
    return data;
  };
  const generateLyrics = async () => {
    setLoading(true); setError("");
    try {
      const data = await edge("generate-lyrics", { recipient: form.recipient, style: form.style, voiceGender: form.voiceGender, honoree: form.honoree, story: form.story });
      if (!data.lyrics) throw new Error("No fue posible crear tu letra.");
      setLyrics(data.lyrics); setView("lyrics"); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Inténtalo de nuevo."); }
    finally { setLoading(false); }
  };
  const generatePix = async () => {
    setLoading(true); setError("");
    try {
      const data = await edge("create-pix", {
        recipient: form.recipient, style: form.style, voiceGender: form.voiceGender, name: form.honoree, story: form.story,
        lyricText: lyrics, buyerName: form.buyerName, buyerPhone: form.phone.replace(/\D/g, ""), marketingSource: "mexico",
      });
      if (!data.qrCode || !data.pixPayload) throw new Error("No fue posible generar el código de pago.");
      setPix({ qrCode: data.qrCode, payload: data.pixPayload }); setView("pix"); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Inténtalo de nuevo."); }
    finally { setLoading(false); }
  };

  if (view !== "landing") return <Flow view={view} step={step} form={form} set={set} setStep={setStep} setView={setView} loading={loading} error={error} lyrics={lyrics} pix={pix} generateLyrics={generateLyrics} generatePix={generatePix} />;

  return <main lang="es-MX">
    <div className="offer-bar"><span>APROVECHA</span><b> SOLO HOY</b><span> OFERTA ESPECIAL • 2 versiones por R$ 19,90</span></div>
    <section className="hero"><div className="hero-glow" /><div className="hero-content"><p className="eyebrow">FELICIDAD EN MÚSICA</p><h1>Transforma tu <i>historia</i> en una canción inolvidable.</h1><p className="hero-lead">Un regalo único para emocionar a quien amas, creado a partir de tus propias palabras.</p><button className="primary" onClick={begin}>🎁 Crear mi canción</button><small>Solo pagas después de revisar tu letra.</small><p className="social-proof">★★★★★ &nbsp; Más de 12.000 historias convertidas en canción</p></div><div className="hero-photo"><div className="hero-frame"><span className="hero-frame-label">hecha con tu historia</span><video autoPlay muted loop playsInline poster="/og-felicidade.png"><source src="/media/hero.mp4" type="video/mp4" /></video><span className="hero-frame-note">♫ un recuerdo para siempre</span></div></div></section>
    <section className="hero-after"><p>La próxima reacción puede ser de alguien que amas.</p><span>Cuéntanos tu historia. La convertimos en una canción única, creada especialmente para esa persona.</span></section>
    <section className="objection-break"><div className="objection-icon">♫</div><div><p className="kicker">ES MÁS FÁCIL DE LO QUE PARECE</p><h2>Tú cuentas la historia. Nosotros la convertimos en música.</h2><p>No necesitas saber escribir ni cantar. Solo comparte los momentos importantes y crearemos una canción personalizada para emocionar a alguien especial.</p><strong>Revisas la letra antes de finalizar.</strong><button className="primary" onClick={begin}>Crear mi canción personalizada</button></div></section>
    <section className="section samples"><p className="kicker">EJEMPLOS REALES</p><h2>Escucha el estilo que podemos crear para tu historia</h2><p>Cada composición es única. Elige la emoción que mejor encaje con esa persona especial.</p><div className="sample-grid">{[["🕊️", "Góspel", "/media/gospel.mp3"], ["🤠", "Regional mexicano", "/media/sertanejo.mp3"], ["🥁", "Cumbia", "/media/pagode.mp3"]].map(([icon, name, src]) => <article className="sample" key={name}><div><span>{icon}</span><p>Ejemplo</p><h3>{name}</h3></div><audio controls preload="none"><source src={src} type="audio/mpeg" /></audio></article>)}</div></section>
    <section className="section comparison"><p className="kicker">UN REGALO QUE PERMANECE</p><h2>¿Por qué una canción vale más que mil regalos?</h2><p>Los regalos materiales terminan. Una canción hecha para alguien especial conserva ese momento.</p><div className="compare-grid"><article className="ordinary"><h3>Regalos comunes</h3><p>La ropa pasa de moda.</p><p>Los perfumes se terminan.</p><p>Los chocolates duran minutos.</p><p>Las cenas se vuelven un recuerdo.</p><b>Bonitos por un momento. Olvidados después.</b></article><article className="special"><span>INOLVIDABLE</span><h3>Una canción personalizada</h3><p><b>Eterna:</b> se guarda para siempre.</p><p><b>Emotiva:</b> llega directo al corazón.</p><p><b>Única:</b> cuenta una historia exclusiva.</p><p><b>Compartible:</b> emociona a familia y amistades.</p><strong>💖 El regalo perfecto</strong></article></div><button className="primary" onClick={begin}>🎁 Quiero crear la mía</button><small>Solo pagas después de revisar tu letra.</small></section>
    <section className="section"><p className="kicker">PAQUETE DISPONIBLE</p><h2>Una experiencia para recordar siempre</h2><p>No entregamos solo un audio: transformamos los detalles de tu historia en una canción para emocionar.</p><article className="pricing"><div className="pricing-tag">OFERTA ESPECIAL</div><p>Experiencia completa</p><h3>Paquete Premium</h3><div><s>R$ 147,00</s><strong>R$ 19,90</strong><small>Pago único</small></div><p className="bonus">🎁 Paga 1 y recibe 2 versiones</p><ul><li>Composición completa y personalizada</li><li>Voz y producción profesional</li><li>2 versiones de la canción</li><li>Letra antes del pago</li><li>Archivo para guardar siempre</li></ul><button className="primary" onClick={begin}>🎵 Crear mi canción</button><small>Solo pagas después de revisar la letra.</small></article></section>
    <section className="faq"><p className="kicker">RESUELVE TUS DUDAS</p><h2>Todo lo que necesitas saber antes de pedir tu canción</h2>{faqs.map(([question, answer], index) => <button className="faq-item" key={question} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span><b>{question}</b>{openFaq === index && <em>{answer}</em>}</span><strong>{openFaq === index ? "−" : "+"}</strong></button>)}</section>
    <footer>© 2026 Felicidad en Música · Transformando historias en canciones ❤️</footer>
  </main>;
}

function Flow({ view, step, form, set, setStep, setView, loading, error, lyrics, pix, generateLyrics, generatePix }: { view: string; step: number; form: Form; set: (key: keyof Form, value: string) => void; setStep: (step: number) => void; setView: (view: "landing" | "quiz" | "lyrics" | "contact" | "pix") => void; loading: boolean; error: string; lyrics: string; pix?: { qrCode: string; payload: string }; generateLyrics: () => void; generatePix: () => void }) {
  const ready = step === 0 ? !!form.recipient : step === 1 ? !!form.style : step === 2 ? !!form.voiceGender : step === 3 ? form.honoree.trim().length > 1 : form.story.trim().split(/\s+/).filter(Boolean).length >= 2;
  if (view === "quiz") {
    const labels = ["¿Para quién es la canción?", "¿Qué estilo combina más?", "¿Qué voz combina mejor con esta canción?", "¿Cuál es el nombre de esa persona especial?", "Cuéntanos la historia que se convertirá en canción"];
    return <main className="flow" lang="es-MX"><button className="brand-back" onClick={() => setView("landing")}>← Felicidad en Música</button><p className="kicker">PASO {step + 1} DE 5</p><h1>{labels[step]}</h1>{step === 0 && <Choices items={recipients} value={form.recipient} choose={(value) => set("recipient", value)} />}{step === 1 && <Choices items={styles} value={form.style} choose={(value) => set("style", value)} />}{step === 2 && <Choices items={["Voz femenina", "Voz masculina"]} value={form.voiceGender === "f" ? "Voz femenina" : form.voiceGender === "m" ? "Voz masculina" : ""} choose={(value) => set("voiceGender", value === "Voz femenina" ? "f" : "m")} />}{step === 3 && <input autoFocus value={form.honoree} onChange={(event) => set("honoree", event.target.value)} placeholder="Ej.: María" />}{step === 4 && <textarea autoFocus value={form.story} onChange={(event) => set("story", event.target.value)} placeholder="Cuéntanos los momentos, apodos, sentimientos y todo lo que no puede faltar..." />}{<button className="primary" disabled={!ready || loading} onClick={() => step === 4 ? generateLyrics() : setStep(step + 1)}>{step === 4 && loading ? "Creando tu letra…" : "Continuar"}</button>}{error && <p className="error">{error}</p>}<button className="text-button" onClick={() => step ? setStep(step - 1) : setView("landing")}>Volver</button></main>;
  }
  if (view === "lyrics") return <main className="flow" lang="es-MX"><button className="brand-back" onClick={() => setView("landing")}>← Felicidad en Música</button><p className="kicker">TU LETRA</p><h1>Una canción para {form.honoree}</h1><article className="lyric">{lyrics}</article><button className="primary" onClick={() => setView("contact")}>Continuar</button><button className="secondary-button" onClick={() => setView("quiz")}>Quiero cambiar algo</button></main>;
  if (view === "contact") return <main className="flow light" lang="es-MX"><button className="brand-back" onClick={() => setView("lyrics")}>← Volver a mi letra</button><p className="kicker">ÚLTIMO PASO</p><h1>¿A dónde enviamos tu canción?</h1><label>Tu nombre<input value={form.buyerName} onChange={(event) => set("buyerName", event.target.value)} placeholder="Tu nombre" /></label><label>WhatsApp<div className="phone"><b>+55</b><input value={form.phone} onChange={(event) => set("phone", event.target.value.replace(/\D/g, "").slice(0, 11))} inputMode="numeric" placeholder="(11) 99999-9999" /></div></label><button className="primary pix-action" disabled={loading || form.buyerName.trim().length < 2 || form.phone.length < 10} onClick={generatePix}>{loading ? "Generando código de pago…" : "Generar Pix de R$ 19,90"}</button>{error && <p className="error">{error}</p>}</main>;
  return <main className="flow light center" lang="es-MX"><p className="kicker">PAGO SEGURO</p><h1>Escanea y confirma tu pago Pix.</h1>{pix && <article className="pix-card"><img src={pix.qrCode} alt="Código QR Pix" /><button className="primary pix-action" onClick={() => navigator.clipboard.writeText(pix.payload)}>Copiar código Pix</button><p>Cuando confirmemos el pago, comenzaremos a preparar tu canción y te avisaremos por WhatsApp.</p></article>}</main>;
}

function Choices({ items, value, choose }: { items: string[]; value: string; choose: (value: string) => void }) {
  return <div className="choices">{items.map((item) => <button key={item} className={value === item ? "selected" : ""} onClick={() => choose(item)}>{item}<span>→</span></button>)}</div>;
}
