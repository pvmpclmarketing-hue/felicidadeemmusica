# Gatilhos de pagamento do WhatsEntregavel

O endpoint de pagamento continua sendo:

```text
POST https://minifluxo.vercel.app/api/webhooks/payment
```

Envie os headers abaixo. `x-payment-secret` deve ser igual ao Secret `WHATSENTREGAVEL_PAYMENT_SECRET` deste cliente.

```http
x-payment-secret: SEU_SEGREDO
content-type: application/json
```

Envie também `integration_key`, usando a chave fixa da conta no WhatsEntregavel. Não envie `connection_id`.

## Campo obrigatório: `fulfillment.mode`

Todo `PAYMENT_APPROVED` precisa ter um destes valores:

| Valor | Quando usar | Ação esperada |
| --- | --- | --- |
| `deliver_existing_preview_audio` | Versão 2: o comprador ouviu duas prévias geradas no site | Enviar exatamente as duas URLs de `preview.audios`. Não chamar Kie. |
| `generate_music_in_miniflux` | Versão 1: há letra aprovada, sem áudio pronto | Gerar a música no fluxo usando `lyric_text`, `quiz.music_style` e `quiz.voice_gender`. |

## Exemplo: duas faixas já prontas

```json
{
  "event": "PAYMENT_APPROVED",
  "idempotency_key": "payment:uuid-do-pedido",
  "integration_key": "CHAVE_DA_CONTA",
  "order_id": "uuid-do-pedido",
  "customer": { "name": "Ana Martins", "phone": "5511999999999" },
  "fulfillment": { "mode": "deliver_existing_preview_audio" },
  "preview": { "audios": ["https://arquivo-1.mp3", "https://arquivo-2.mp3"] }
}
```

## Exemplo: gerar no Miniflux

```json
{
  "event": "PAYMENT_APPROVED",
  "idempotency_key": "payment:uuid-do-pedido",
  "integration_key": "CHAVE_DA_CONTA",
  "order_id": "uuid-do-pedido",
  "customer": { "name": "Ana Martins", "phone": "5511999999999" },
  "fulfillment": { "mode": "generate_music_in_miniflux" },
  "lyric_text": "Letra completa aprovada...",
  "story": "História enviada no quiz...",
  "quiz": { "music_style": "Sertanejo romântico", "voice_gender": "f" }
}
```

## Regras de segurança

- Salve `idempotency_key` antes de iniciar qualquer envio ou geração; se ele se repetir, responda sucesso sem duplicar a entrega.
- Para `deliver_existing_preview_audio`, exija exatamente duas URLs públicas MP3 em `preview.audios`.
- Para `generate_music_in_miniflux`, exija `lyric_text`, `quiz.music_style` e `quiz.voice_gender` (`m` ou `f`).
- As versões 3 a 6 entregam pelo próprio site e não devem acionar este webhook.
