"use client";
import Link from "next/link";

export default function PaymentCompleted() {
  return <main className="grid min-h-screen place-items-center bg-[#17142e] p-5 text-center text-white"><section className="max-w-md"><p className="text-sm font-bold uppercase tracking-[.2em] text-[#f1b55d]">Pagamento recebido</p><h1 className="mt-4 font-[family-name:var(--font-playfair)] text-5xl">Estamos confirmando seu pedido.</h1><p className="mt-5 leading-relaxed text-white/70">Assim que a InfinitePay confirmar o pagamento, suas versões completas serão liberadas automaticamente. Esta página não libera conteúdo sozinha.</p><Link href="/" className="mt-8 inline-block rounded-2xl bg-[#f1b55d] px-6 py-4 font-bold text-[#17142e]">Voltar ao início</Link></section></main>;
}
