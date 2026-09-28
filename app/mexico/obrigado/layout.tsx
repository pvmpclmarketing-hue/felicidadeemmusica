import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¡Gracias por tu compra! | Felicidad en Música",
  description: "Tu compra fue confirmada. Prepararemos tu canción personalizada.",
};

export default function MexicoThankYouLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
