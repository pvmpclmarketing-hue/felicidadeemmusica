import type { Metadata } from "next";
import VslInstaPlayer from "../vslinsta/vsl-insta-player";

export const metadata: Metadata = {
  title: "Felicidade em Música | Uma surpresa inesquecível",
  description: "Assista ao vídeo e transforme sua história em uma música personalizada.",
};

export default function VslTikTokPage() {
  return <VslInstaPlayer />;
}
