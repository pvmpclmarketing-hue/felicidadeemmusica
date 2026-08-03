# Contexto do template de música personalizada

Use este documento antes de alterar o projeto. Ele contém seis funis publicados a partir da mesma base Next.js + Supabase.

## Versões

| Rota | Prévia | Pagamento | Entrega |
|---|---|---|---|
| `/` | Letra GPT | Asaas Pix | WhatsApp |
| `/versao-2` | Duas prévias em áudio Kie, 30 s cada | Asaas Pix | WhatsApp |
| `/versao-3` | Letra GPT | Asaas Pix | Download das duas faixas |
| `/versao-4` | Duas prévias Kie | Asaas Pix | Download das duas faixas |
| `/versao-5` | Duas prévias Kie | Pix manual + comprovante com visão GPT | Download das duas faixas |
| `/versao-6` | Letra GPT | Pix manual + comprovante com visão GPT | Download das duas faixas |

## Arquitetura

- `app/`: frontend Next.js publicado na Vercel.
- `supabase/migrations/`: schema PostgreSQL; aplicar no projeto do cliente.
- `supabase/functions/`: Edge Functions. Todas as chaves ficam somente nos Secrets do Supabase.
- Kie cria duas variações por tarefa. Os callbacks `kie-preview-webhook` e `kie-delivery-webhook` armazenam todos os links retornados, não apenas o primeiro.
- `/entrega?pedido=<id>` consulta `get-order-delivery` a cada seis segundos e exibe os dois players/downloads quando a Kie conclui.

## Eventos e rastreamento

- O frontend envia `InitiateCheckout` para Pixel Meta e `begin_checkout` para Google quando o Pix é gerado com sucesso.
- `asaas-webhook` envia `Purchase` por CAPI quando o Asaas confirma o pagamento.
- `verify-manual-receipt` envia `Purchase` por CAPI depois de validar o comprovante.
- O `event_id` de compra é determinístico por pedido para impedir duplicidade no CAPI.

## Configuração por cliente

Preencha `.env.example` no provedor certo. Nunca exponha `OPENAI_API_KEY`, `KIE_API_KEY`, `ASAAS_API_KEY` ou `META_CAPI_ACCESS_TOKEN` no frontend.

Pagamento Asaas: defina `ASAAS_API_URL`, `ASAAS_API_KEY`, `ASAAS_PIX_ADDRESS_KEY`, `ASAAS_WEBHOOK_TOKEN` e `MUSIC_PRICE_CENTS` nos Secrets do Supabase. O endpoint `create-pix` cria QR estático único por pedido e `asaas-webhook` confirma `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`.

Pagamento manual: defina `NEXT_PUBLIC_MANUAL_PIX_RECEIVER`, `NEXT_PUBLIC_MANUAL_PIX_KEY`, `MANUAL_PIX_KEY` e `MUSIC_PRICE_CENTS`. A visão GPT extrai JSON do comprovante e compara o CNPJ/chave normalizada, aceitando formatação como `12.345.678/0001-90` ou somente dígitos.

Para mudar preço, altere `MUSIC_PRICE_CENTS` e `NEXT_PUBLIC_MUSIC_PRICE_CENTS` com o mesmo valor em centavos. Atualize também o texto comercial se ele mencionar preço fixo.

## Alterações seguras

- Preserve os nomes dos campos enviados pelo quiz: `recipient`, `style`, `voiceGender`, `honoree`, `story`, `buyerName`, `buyerPhone`.
- Preserve a única revisão de prévia. Ela é protegida no banco (`revision_used`).
- Não renderize links completos antes de pagamento aprovado nas versões 3–6.
- Não mova chaves para `NEXT_PUBLIC_*` exceto identificadores públicos de Pixel, Google e Supabase.
