# Relatório de validação — pagamento Pix, webhook e WhatsApp

## Objetivo

Validar o fluxo automático: cliente gera um Pix no site, paga pelo QR Code, o Asaas notifica o Supabase, o site mostra pagamento aprovado e o miniflux recebe os dados para iniciar o contato pelo WhatsApp.

## Fluxo implementado

1. O site chama a Edge Function `create-pix`.
2. A função cria um QR Code Pix estático e único no Asaas, com validade de 30 minutos e valor de R$ 19,90.
3. O pedido é salvo em `orders` com status `awaiting_payment` e com o identificador do QR Code em `asaas_static_qr_id`.
4. O cliente paga o Pix.
5. O Asaas deve enviar o evento `PAYMENT_RECEIVED` ao webhook do Supabase. Em Pix por QR Code estático, esse evento traz `payment.pixQrCodeId`.
6. A função `asaas-webhook` procura o pedido pelo `pixQrCodeId`, muda o status para `paid`, registra `paid_at` e evita processamento duplicado.
7. Para entrega por WhatsApp, a função envia o evento `PAYMENT_APPROVED` para o miniflux/WhatsEntregavel em `/api/webhooks/payment`.
8. O site consulta `get-payment-status` a cada 5 segundos enquanto o QR Code está aberto. Quando o pedido ficar `paid`, `generating` ou `ready`, ele exibe a animação de pagamento aprovado.

## Situação encontrada no último teste

- O pagamento entrou no Asaas.
- O pedido no Supabase continuou `awaiting_payment`.
- Não havia evento do provedor `asaas` em `webhook_events`.

Conclusão: o pagamento chegou ao Asaas, porém o Asaas não enviou — ou não conseguiu entregar — o webhook ao Supabase. Portanto, o miniflux não recebeu o evento de pagamento aprovado.

## Configuração obrigatória no Asaas

Criar ou revisar um webhook de cobranças com:

- **URL:** `https://mywafaatlssiphxecuej.supabase.co/functions/v1/asaas-webhook`
- **Status:** ativo
- **Fila de sincronização:** ativa
- **Eventos:** `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`
- **Token de autenticação:** exatamente o mesmo valor configurado no Secret `ASAAS_WEBHOOK_TOKEN` do Supabase.

Para QR Code estático, `PAYMENT_RECEIVED` é indispensável. O Asaas identifica a cobrança criada pelo Pix com o campo `pixQrCodeId`.

## Secrets que precisam existir no Supabase

### Pix / Asaas

- `ASAAS_API_URL` — produção: `https://api.asaas.com/v3`
- `ASAAS_API_KEY`
- `ASAAS_PIX_ADDRESS_KEY` — chave Pix ativa que receberá o dinheiro; não é Wallet ID
- `ASAAS_WEBHOOK_TOKEN`
- `MUSIC_PRICE_CENTS` — atualmente `1990`

### WhatsApp / miniflux

- `WHATSENTREGAVEL_URL`
- `WHATSENTREGAVEL_INTEGRATION_KEY`
- `WHATSENTREGAVEL_PAYMENT_SECRET`

O miniflux deve aceitar `POST /api/webhooks/payment`, validar o cabeçalho `x-payment-secret` e usar o payload abaixo.

## Payload esperado pelo miniflux após pagamento aprovado

```json
{
  "event": "PAYMENT_APPROVED",
  "idempotency_key": "payment:uuid-do-pedido",
  "integration_key": "configurada-no-supabase",
  "order_id": "uuid-do-pedido",
  "fulfillment": {
    "mode": "deliver_existing_preview_audio"
  },
  "customer": {
    "name": "nome do cliente",
    "phone": "55DDDNUMERO"
  },
  "lyric_text": "letra exata aprovada pelo cliente",
  "quiz": {
    "recipient": "relação escolhida",
    "style": "estilo musical",
    "music_style": "estilo musical",
    "voice_gender": "m ou f",
    "honoree": "nome do homenageado",
    "story": "história enviada",
    "preview_id": "uuid-da-prévia-ou-null",
    "fulfillment_mode": "deliver_existing_preview_audio",
    "site_variant": "audio_preview_whatsapp",
    "preview_audio_urls": [
      "https://url-da-primeira-prévia",
      "https://url-da-segunda-prévia"
    ]
  },
  "preview": {
    "id": "uuid-da-prévia-ou-null",
    "audios": [
      "https://url-da-primeira-prévia",
      "https://url-da-segunda-prévia"
    ]
  },
  "story": "história enviada"
}
```

`quiz.music_style` é o campo de gênero musical a ser usado pelo miniflux. `quiz.voice_gender` recebe `m` ou `f`. `lyric_text` contém a letra exata aprovada pelo cliente e deve ser enviada à Kie como prompt; não use apenas `story` quando `lyric_text` estiver disponível.

`preview.audios` é o campo principal para o miniflux: contém as duas prévias geradas pela Kie nas versões com prévia em áudio. `quiz.preview_audio_urls` é mantido como cópia de compatibilidade. Nas versões que exibem apenas letra, ambas as listas ficam vazias.

## Regra obrigatória de separação dos fluxos

O miniflux deve usar **somente** `fulfillment.mode` para decidir o que fazer:

| `fulfillment.mode` | Origem | Ação do miniflux |
| --- | --- | --- |
| `deliver_existing_preview_audio` | Versão do site com prévia em música | Não chamar a Kie. Usar `preview.audios[0]` e `preview.audios[1]` para enviar as duas músicas que o cliente ouviu na prévia. |
| `generate_music_in_miniflux` | Versão do site com prévia de letra | Chamar a Kie dentro do fluxo usando `lyric_text` como `prompt`, `quiz.music_style` como estilo e `quiz.voice_gender` como voz. |

`quiz.site_variant` identifica a origem: `audio_preview_whatsapp` para a versão que entrega os áudios da prévia e `lyric_preview_whatsapp` para a versão que gera a música no miniflux. Se o modo for `deliver_existing_preview_audio`, o miniflux deve exigir exatamente duas URLs em `preview.audios`; se não houver duas, deve interromper e registrar erro em vez de gerar outra música.

## O que o miniflux deve conferir

1. A rota `/api/webhooks/payment` está publicada e aceita `POST`.
2. O cabeçalho `x-payment-secret` é validado com o mesmo valor de `WHATSENTREGAVEL_PAYMENT_SECRET`.
3. O retorno HTTP é `200` ou `204` rapidamente.
4. O fluxo não depende de dados adicionais além do payload recebido.
5. O telefone é tratado como número brasileiro no formato `55` + DDD + número, sem símbolos.
6. O fluxo é idempotente por `idempotency_key` (formato `payment:<order_id>`): se o mesmo evento chegar novamente, não deve enviar mensagens duplicadas nem iniciar produção duplicada.

## Idempotência implementada

- O Supabase registra cada evento recebido do Asaas em `webhook_events` com chave única.
- A mudança do pedido para `paid` só acontece quando o status anterior é `awaiting_payment`; somente uma requisição concorrente consegue essa atualização.
- A saída para o miniflux é gravada em `outbound_notifications` com `event_key` único no formato `payment:<order_id>`.
- O payload leva `idempotency_key` no mesmo formato. O miniflux deve persistir essa chave antes de iniciar a produção ou enviar WhatsApp; se ela já existir, deve responder sucesso sem repetir a ação.
- Reenvios técnicos só podem tentar novamente a mesma notificação pendente/falha; nunca devem criar uma segunda notificação para o mesmo pedido.

## Teste de ponta a ponta

1. Confirme os Secrets acima no Supabase.
2. Confirme a URL, token, eventos e fila no Asaas.
3. Gere um novo Pix no site e faça um pagamento de R$ 19,90.
4. No Asaas, confira em **Logs de Webhooks** se a entrega retornou HTTP 200.
5. No Supabase, confira se `orders.status` mudou de `awaiting_payment` para `paid`.
6. Confirme que há um evento do provedor `asaas` em `webhook_events`.
7. Confirme que `outbound_notifications` criou e enviou o evento `payment:<order_id>`.
8. Confirme que a tela do QR Code exibe “Pagamento aprovado”.
9. Confirme que o miniflux recebeu o payload e iniciou o fluxo de WhatsApp uma única vez.

## Diagnóstico rápido

- **Asaas recebeu, mas pedido continua `awaiting_payment`:** webhook do Asaas não está configurado, está com token diferente, fila interrompida ou evento `PAYMENT_RECEIVED` não foi selecionado.
- **Pedido ficou `paid`, mas WhatsApp não disparou:** verificar `WHATSENTREGAVEL_URL`, `WHATSENTREGAVEL_INTEGRATION_KEY`, `WHATSENTREGAVEL_PAYMENT_SECRET`, rota do miniflux e `outbound_notifications`.
- **Tela não muda após pagamento, mas pedido está `paid`:** verificar se `get-payment-status` está publicado e se o navegador está na versão atual do site.
