import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { VisitCounter } from "./components/VisitCounter";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://musica.memberproduto.shop"),
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
  const kidsBirthdayMetaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID_KIDS_BIRTHDAY ?? "4049735971823443";
  return (
    <html lang="pt-BR">
      <body className={`${jakarta.variable} ${playfair.variable} antialiased`}>
        <><Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');var isKidsBirthday=window.location.pathname.indexOf('/versao-infantil')===0;var activePixel=isKidsBirthday?'${kidsBirthdayMetaPixelId}':'${metaPixelId}';var metaMatch={};try{var savedPhone=sessionStorage.getItem('meta:advanced-matching:phone');if(savedPhone)metaMatch.ph=savedPhone}catch(e){}fbq('init',activePixel,metaMatch);fbq('track','PageView');fbq('track','ViewContent',{content_name:isKidsBirthday?'Música de aniversário infantil':'Música personalizada',content_type:'product',value:isKidsBirthday?29.90:19.90,currency:'BRL'});`}</Script><noscript><img height="1" width="1" style={{display:"none"}} src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`} alt=""/></noscript></>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && <Script id="google-tag" strategy="afterInteractive">{`if(!window.location.pathname.startsWith('/novo')){window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config','${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');var googleTag=document.createElement('script');googleTag.async=true;googleTag.src='https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}';document.head.appendChild(googleTag);}`}</Script>}
        <VisitCounter />
        {children}
      </body>
    </html>
  );
}
