# Felicidade em Música

Checkout de música personalizada com Vercel, Supabase, Asaas e WhatsEntregavel.

- `app/`: site público Next.js, publicado na Vercel.
- `supabase/`: banco PostgreSQL e Edge Functions para prévia de letra, Pix/Asaas e notificações ao WhatsEntregavel.

O site não gera a música final nem chama a Kie. Ele envia os dados do quiz e a confirmação de pagamento ao WhatsEntregavel; o fluxo configurado lá produz e entrega a música pelo WhatsApp.

Leia [DEPLOY.md](./DEPLOY.md) antes de publicar. Nenhuma chave de pagamento ou integração deve ser colocada no frontend.
