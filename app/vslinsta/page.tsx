import type { Metadata } from "next";
import VslInstaPlayer from "./vsl-insta-player";

export const metadata: Metadata = {
  title: "Felicidade em Música | Uma surpresa inesquecível",
  description: "Assista ao vídeo e transforme sua história em uma música personalizada.",
};

export default function VslInstaPage() {
  return <VslInstaPlayer />;
}
