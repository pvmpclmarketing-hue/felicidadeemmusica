import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Felicidad en Música | Tu historia se convierte en canción",
  description: "Transforma momentos especiales en una canción personalizada e inolvidable.",
  openGraph: {
    title: "Felicidad en Música",
    description: "Tu historia se convierte en música: 2 versiones por R$ 19,90.",
  },
};

export default function MexicoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
