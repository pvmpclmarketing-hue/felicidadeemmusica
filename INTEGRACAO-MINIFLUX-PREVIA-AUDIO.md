# Integração Miniflux — versões com prévia em áudio

Este documento descreve **somente** as versões que criam duas prévias em áudio antes do pagamento. Ele deve ser usado no projeto do Miniflux/WhatsApp.

## Versões e links públicos

| Versão | Link | Entrega após pagamento | O Miniflux participa? |
| --- | --- | --- | --- |
| Prévia em áudio + WhatsApp | `https://DOMINIO-DO-CLIENTE/versao-2` | Envia ao cliente as duas músicas já criadas na prévia | **Sim** |
| Prévia em áudio + download | `https://DOMINIO-DO-CLIENTE/versao-4` | Libera download diretamente no site | Não |
| Prévia em áudio + comprovante + download | `https://DOMINIO-DO-CLIENTE/versao-5` | Confere comprovante e libera no site as mesmas duas faixas completas da prévia | Não |

O Miniflux deve tratar apenas a **versão 2**. Nas versões 4 e 5, o Supabase entrega no próprio site; não deve haver geração ou envio por WhatsApp pelo Miniflux.

## Visão do fluxo da versão 2

```text
Cliente abre /versao-2
        ↓
Site gera letra + Kie gera 2 prévias de áudio
        ↓
Cliente escuta até 30 segundos de cada uma
        ↓
Cliente gera e paga o Pix
        ↓
Asaas → webhook do Supabase
        ↓
Supabase → webhook PAYMENT_APPROVED do Miniflux
        ↓
Miniflux envia no WhatsApp as 2 faixas que o cliente ouviu
```

## Webhooks que o Miniflux deve receber

### 1. Pedido criado, ainda não pago

O Supabase faz:

```http
POST {WHATSENTREGAVEL_URL}/api/webhooks/site
Content-Type: application/json
x-site-secret: {WHATSENTREGAVEL_SITE_SECRET}
```

Esse evento serve para o Miniflux registrar o cliente e o contexto do pedido. Ele **não autoriza produção nem envio**.

Payload resumido:

```json
{
  "integration_key": "chave-da-integracao",
  "order_id": "uuid-do-pedido",
  "name": "Nome do comprador",
  "phone": "55DDDNUMERO",
  "paid": false,
  "quiz": {
    "recipient": "esposa",
    "music_style": "Sertanejo",
    "voice_gender": "f",
    "honoree": "Maria",
    "story": "história enviada pelo cliente",
    "preview_id": "uuid-da-previa",
    "preview_audio_urls": ["https://audio-1", "https://audio-2"],
    "fulfillment_mode": "deliver_existing_preview_audio",
    "site_variant": "audio_preview_whatsapp"
  }
}
```

Responda `200` ou `204` rapidamente. O site não depende desse retorno para mostrar o Pix.

### 2. Pagamento aprovado — evento principal

Depois que o Asaas confirma o Pix, o Supabase faz:

```http
POST {WHATSENTREGAVEL_URL}/api/webhooks/payment
Content-Type: application/json
x-payment-secret: {WHATSENTREGAVEL_PAYMENT_SECRET}
```

Payload completo esperado:

```json
{
  "event": "PAYMENT_APPROVED",
  "idempotency_key": "payment:uuid-do-pedido",
  "integration_key": "chave-da-integracao",
  "order_id": "uuid-do-pedido",
  "customer": {
    "name": "Nome do comprador",
    "phone": "55DDDNUMERO"
  },
  "fulfillment": {
    "mode": "deliver_existing_preview_audio"
  },
  "lyric_text": "letra aprovada pelo cliente",
  "quiz": {
    "recipient": "relação com o homenageado",
    "style": "Sertanejo",
    "music_style": "Sertanejo",
    "voice_gender": "f",
    "honoree": "Maria",
    "story": "história do cliente",
    "preview_id": "uuid-da-previa",
    "preview_audio_urls": [
      "https://url-da-primeira-faixa",
      "https://url-da-segunda-faixa"
    ],
    "fulfillment_mode": "deliver_existing_preview_audio",
    "site_variant": "audio_preview_whatsapp"
  },
  "preview": {
    "id": "uuid-da-previa",
    "audios": [
      "https://url-da-primeira-faixa",
      "https://url-da-segunda-faixa"
    ]
  },
  "story": "história do cliente"
}
```

## Regra obrigatória para o Miniflux

Quando `fulfillment.mode` for `deliver_existing_preview_audio`:

1. Validar o segredo `x-payment-secret`.
2. Persistir `idempotency_key` **antes** de iniciar qualquer automação.
3. Exigir exatamente duas URLs em `preview.audios`. Cada URL já é uma faixa completa; não usar links alternativos de stream da Kie.
4. Enviar as duas URLs para o WhatsApp do campo `customer.phone`.
5. **Não chamar a Kie e não gerar outra música.** Essas são as duas faixas que o cliente já ouviu como prévia.
6. Retornar `200` ou `204`.

Se o evento chegar outra vez com a mesma `idempotency_key`, responder sucesso sem repetir mensagens, produção ou entrega.

## Separação de segurança entre versões

O Miniflux não deve decidir pelo link acessado nem pelo texto da história. A decisão é exclusivamente pelo campo abaixo:

| `fulfillment.mode` | Ação |
| --- | --- |
| `deliver_existing_preview_audio` | Enviar as duas URLs de `preview.audios`; não chamar Kie. |
| `generate_music_in_miniflux` | Não é a versão 2. Só gerar na Kie se o outro fluxo tiver sido configurado explicitamente para isso. |

Também valide `quiz.site_variant`. Para este projeto deve ser exatamente `audio_preview_whatsapp`.

## Webhooks externos que não pertencem ao Miniflux

Estes endpoints são apenas referência para diagnóstico e devem permanecer configurados fora do Miniflux:

| Origem | Destino | Papel |
| --- | --- | --- |
| Asaas | `https://SEU_PROJECT_REF.supabase.co/functions/v1/asaas-webhook` | Confirma pagamento Pix e dispara `PAYMENT_APPROVED`. |
| Kie | `https://SEU_PROJECT_REF.supabase.co/functions/v1/kie-preview-webhook?secret={KIE_CALLBACK_SECRET}` | Salva as duas URLs de prévia antes do checkout. |

No Asaas, os eventos obrigatórios são `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`. O token configurado no Asaas deve ser igual ao Secret `ASAAS_WEBHOOK_TOKEN` do Supabase.

## Variáveis que precisam coincidir

| No Supabase | No Miniflux | Uso |
| --- | --- | --- |
| `WHATSENTREGAVEL_URL` | URL base pública do Miniflux | O Supabase monta as rotas `/api/webhooks/site` e `/api/webhooks/payment`. |
| `WHATSENTREGAVEL_INTEGRATION_KEY` | `integration_key` esperado | Identifica esta integração. |
| `WHATSENTREGAVEL_SITE_SECRET` | Validação de `x-site-secret` | Protege o evento de pedido criado. |
| `WHATSENTREGAVEL_PAYMENT_SECRET` | Validação de `x-payment-secret` | Protege o evento de pagamento aprovado. |

## Diagnóstico rápido

- **O cliente pagou, mas o Miniflux não recebeu nada:** verificar primeiro os registros `api_call_logs` e `outbound_notifications` no Supabase; depois os Logs de Webhook do Asaas.
- **Chegou `PAYMENT_APPROVED`, mas não há exatamente duas URLs:** não enviar nem gerar nova música; registrar falha e acionar suporte. A prévia ainda não está completa.
- **O mesmo pagamento gerou duas mensagens:** a idempotência por `idempotency_key` não foi aplicada no Miniflux.
- **O Miniflux devolveu erro:** o Supabase guarda a tentativa em `outbound_notifications` com `status = failed` e `last_error`; o reenvio usa a mesma chave de idempotência.
