# Guia manual para criar uma instalação de cliente

## 1. Criar os três serviços

1. Crie um repositório GitHub do cliente e envie esta pasta para ele.
2. Crie um projeto Supabase novo para cada cliente. Não compartilhe banco, chaves, Pix ou pedidos entre clientes.
3. Importe o repositório na Vercel e escolha o framework Next.js.

## 2. Configurar Supabase

No terminal da pasta do cliente, autentique a CLI e execute `supabase db push --project-ref SEU_PROJECT_REF`. Depois publique as funções em `supabase/functions/` usando `supabase functions deploy NOME --project-ref SEU_PROJECT_REF --no-verify-jwt`.

Na tela **Project Settings > Edge Functions > Secrets**, copie os valores privados de `.env.example`: OpenAI, Kie, Asaas, Meta CAPI e, se aplicável, WhatsEntregavel. Use uma `KIE_CALLBACK_SECRET` longa e aleatória. Em seguida, configure na Kie os callbacks que o sistema envia automaticamente em cada geração.

No Asaas, cadastre o webhook em `https://SEU_PROJECT_REF.supabase.co/functions/v1/asaas-webhook` e use o mesmo valor de `ASAAS_WEBHOOK_TOKEN` como token do webhook. Se estiver testando, use `https://api-sandbox.asaas.com/v3`; produção usa `https://api.asaas.com/v3`.

## 3. Configurar Vercel

Em **Settings > Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_MUSIC_PRICE_CENTS`, `NEXT_PUBLIC_MANUAL_PIX_RECEIVER` e `NEXT_PUBLIC_MANUAL_PIX_KEY`. Faça um novo deploy após alterar variáveis `NEXT_PUBLIC_*`.

## 4. Valor e Pix do cliente

Use centavos: R$ 19,90 = `1990`; R$ 37,00 = `3700`.

- Com Asaas: o valor aplicado à cobrança vem de `MUSIC_PRICE_CENTS`; a chave usada é `ASAAS_PIX_ADDRESS_KEY` do Asaas do cliente.
- Com comprovante manual: informe o nome do recebedor em `NEXT_PUBLIC_MANUAL_PIX_RECEIVER`, a chave em `NEXT_PUBLIC_MANUAL_PIX_KEY` e a mesma chave no Secret `MANUAL_PIX_KEY`. Para CNPJ, use apenas 14 números no Secret; o sistema reconhece o formato com pontuação no comprovante.

Também pesquise no projeto por `R$ 19,90` para adaptar textos de oferta, FAQ e botões à proposta comercial do cliente.

## 5. Meta e Google

Crie um Pixel no Meta e adicione seu ID público em `NEXT_PUBLIC_META_PIXEL_ID`. No Gerenciador de Eventos, crie um token da API de Conversões e salve-o apenas como `META_CAPI_ACCESS_TOKEN`; salve o mesmo Pixel ID como `META_CAPI_PIXEL_ID`. Use `META_CAPI_TEST_EVENT_CODE` somente durante os testes.

Crie uma propriedade GA4 e coloque o ID `G-...` em `NEXT_PUBLIC_GA_MEASUREMENT_ID`. O site marca início de checkout quando o Pix aparece e compra aprovada quando o backend confirma o pagamento.

## 6. Checklist antes de entregar

- Faça um pedido de teste e confirme que o QR Pix é do cliente correto.
- Confira o webhook Asaas em Logs de Webhooks.
- Gere uma prévia e confirme que aparecem duas variações.
- Pague em sandbox e confirme o evento Purchase no Meta Test Events.
- Teste mobile, as seis rotas e o download duplo nas versões 3–6.
