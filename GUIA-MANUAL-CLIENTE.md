# Guia de configuração do cliente

Este template deve ser instalado em um Supabase, GitHub e Vercel exclusivos para cada cliente. Não compartilhe banco de dados, chaves de API, Pix, pedidos ou domínio entre clientes.

## 1. Preparar o repositório

1. Faça uma cópia desta pasta em um novo repositório GitHub do cliente.
2. Edite o nome, textos, mídia e a oferta comercial antes de publicar.
3. Mantenha `.env.example` apenas como referência: ele não deve receber chaves reais.

## 2. Criar o Supabase do cliente

1. Crie um projeto novo no Supabase.
2. No terminal da pasta do cliente, conecte a CLI ao projeto e aplique as migrações:

```bash
supabase db push --project-ref SEU_PROJECT_REF
```

3. Publique todas as Edge Functions da pasta `supabase/functions/`, incluindo as funções de áudio, comprovante, pagamento e entrega. Use `--no-verify-jwt` para as funções públicas do checkout.
4. Confirme no banco as tabelas de pedidos, prévias, eventos de webhook e `api_call_logs`.

## 3. Secrets do Supabase

Cadastre em **Project Settings → Edge Functions → Secrets**. Nunca coloque estes valores na Vercel com prefixo `NEXT_PUBLIC_`.

| Secret | Quando é necessário | Uso |
| --- | --- | --- |
| `OPENAI_API_KEY` | Todas as versões | Letra, revisão, transcrição de áudio e leitura de comprovante |
| `KIE_API_KEY` | Versões 2 a 6 | Geração de prévias e/ou músicas completas |
| `KIE_CALLBACK_SECRET` | Versões 2 a 6 | Protege os callbacks da Kie |
| `MUSIC_PRICE_CENTS` | Todas | Preço em centavos, por exemplo `1990` |
| `ASAAS_API_URL` | Versões 1 a 4 | Sandbox: `https://api-sandbox.asaas.com/v3`; produção: `https://api.asaas.com/v3` |
| `ASAAS_API_KEY` | Versões 1 a 4 | Chave privada da conta Asaas do cliente |
| `ASAAS_PIX_ADDRESS_KEY` | Versões 1 a 4 | Wallet/address key da conta Asaas |
| `ASAAS_WEBHOOK_TOKEN` | Versões 1 a 4 | Mesmo token configurado no webhook Asaas |
| `MANUAL_PIX_KEY` | Versões 5 e 6 | Chave Pix do recebedor, sem pontuação se for CNPJ |
| `MANUAL_PIX_RECEIVER` | Versões 5 e 6 | Nome completo do recebedor exibido no checkout manual |
| `META_CAPI_PIXEL_ID` | Opcional | Pixel Meta usado pela API de Conversões |
| `META_CAPI_ACCESS_TOKEN` | Opcional | Token privado da CAPI Meta |
| `SITE_URL` | Recomendado | Domínio final do cliente |

Para entrega por WhatsApp nas versões 1 e 2, configure também `WHATSENTREGAVEL_URL`, `WHATSENTREGAVEL_INTEGRATION_KEY`, `WHATSENTREGAVEL_SITE_SECRET` e `WHATSENTREGAVEL_PAYMENT_SECRET`.

O `WHATSENTREGAVEL_INTEGRATION_KEY` é a chave fixa exibida no painel do WhatsEntregavel em **Conexões → Integração do seu site**. Não use `connection_id` no site. Após pagamento aprovado, o sistema envia automaticamente `fulfillment.mode`: na versão 1 ele pede geração no Miniflux; na versão 2 entrega as duas URLs já prontas da prévia. Veja `MODIFICACAO_SITE_GATILHOS_PAGAMENTO.md` antes de configurar os dois fluxos no painel.

## 4. Configurar o Asaas

1. Gere a `ASAAS_PIX_ADDRESS_KEY` na conta do cliente.
2. Cadastre o webhook:

```text
https://SEU_PROJECT_REF.supabase.co/functions/v1/asaas-webhook
```

3. Informe no Asaas o mesmo valor salvo como `ASAAS_WEBHOOK_TOKEN`.
4. Assine os eventos `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`.
5. Faça primeiro um pagamento em sandbox e confira o status do pedido no Supabase.

## 5. Configurar a Vercel

Importe o repositório do cliente na Vercel como Next.js e adicione as variáveis públicas:

```text
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
NEXT_PUBLIC_SITE_URL=https://dominio-do-cliente.com.br
NEXT_PUBLIC_MUSIC_PRICE_CENTS=1990
NEXT_PUBLIC_MANUAL_PIX_RECEIVER=Nome do recebedor
NEXT_PUBLIC_MANUAL_PIX_KEY=chave-pix-exibida
NEXT_PUBLIC_SUPPORT_WHATSAPP=55DDDNÚMERO
NEXT_PUBLIC_META_PIXEL_ID=opcional
NEXT_PUBLIC_GA_MEASUREMENT_ID=opcional
```

Sempre faça novo deploy após mudar qualquer variável `NEXT_PUBLIC_*`.

## 6. Valor, Pix e comprovante manual

Use centavos: R$ 19,90 = `1990`; R$ 37,00 = `3700`.

- Nas versões com Asaas, o valor vem de `MUSIC_PRICE_CENTS` e o QR é criado automaticamente para cada pedido.
- Nas versões 5 e 6, o site mostra `NEXT_PUBLIC_MANUAL_PIX_RECEIVER` e `NEXT_PUBLIC_MANUAL_PIX_KEY`. O servidor precisa ter os mesmos dados em `MANUAL_PIX_RECEIVER` e `MANUAL_PIX_KEY`.
- O comprovante é validado por visão da OpenAI: ele confere se é comprovante Pix, valor e chave/CNPJ do recebedor. A versão 5 libera as músicas já criadas na prévia; a versão 6 só inicia a geração depois da confirmação.

Atualize também os textos de preço e oferta no frontend quando o valor mudar.

## 7. Pixel Meta e Google Analytics

1. No Meta, coloque o ID público em `NEXT_PUBLIC_META_PIXEL_ID` e a CAPI nos Secrets `META_CAPI_PIXEL_ID` e `META_CAPI_ACCESS_TOKEN`.
2. No Google Analytics, coloque o ID `G-...` em `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
3. O site registra visualização, início de checkout ao criar Pix e compra quando o pagamento é aprovado.

## 8. Checklist de entrega

- Teste `/`, `/versao-2`, `/versao-3`, `/versao-4`, `/versao-5` e `/versao-6` no celular.
- Gere uma prévia de áudio e confirme que aparecem duas faixas de 30 segundos.
- Teste Asaas em sandbox e valide o webhook.
- Teste o Pix manual com comprovante real nas versões 5 e 6.
- Na versão 5, confirme que o pagamento não gera uma nova música: apenas libera as duas prévias completas.
- Na versão 6, confirme que o pagamento inicia a Kie e a entrega aparece depois do callback.
- Confirme o botão único de baixar as duas músicas e o WhatsApp de suporte na tela final.
- Veja `api_call_logs` no Supabase se qualquer etapa falhar.
