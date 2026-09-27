import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Felicidad en Música | Tu historia se convierte en canción",
  description: "Transforma momentos especiales en una canción personalizada e inolvidable.",
  openGraph: {
    title: "Felicidad en Música",
    description: "Tu historia se convierte en música por 19 €.",
  },
};

export default function EspanaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
