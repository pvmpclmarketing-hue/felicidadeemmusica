import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Felicidade em Música | Sua história vira canção",
  description: "Transforme momentos especiais em uma música personalizada e inesquecível.",
  openGraph: { title: "Felicidade em Música", description: "Sua história vira música — 2 versões por R$ 19,90." },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "27184997131196642";
  return (
    <html lang="pt-BR">
      <body className={`${jakarta.variable} ${playfair.variable} antialiased`}>
        <><Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}</Script><noscript><img height="1" width="1" style={{display:"none"}} src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`} alt=""/></noscript></>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && <><Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`} strategy="afterInteractive"/><Script id="google-tag" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');`}</Script></>}
        {children}
      </body>
    </html>
  );
}
