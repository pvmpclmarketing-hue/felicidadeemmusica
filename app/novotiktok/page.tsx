import type { Metadata } from "next";
import Home from "../page";

export const metadata: Metadata = {
  title: "Felicidade em Música | Sua história vira canção",
  description: "Transforme momentos especiais em uma música personalizada e inesquecível.",
};

/**
 * Funil TikTok com o mesmo fluxo de /novo, com preço próprio e protegido no
 * frontend e na Edge Function create-pix.
 */
export default function NovoTikTokPage() {
  return <Home marketingSource="novotiktok" forcedPriceCents={1990} supportWhatsApp="5522992511400" />;
}
