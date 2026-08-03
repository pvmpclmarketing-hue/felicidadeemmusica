# Gatilhos de pagamento em todas as versões

Todo pagamento aprovado envia `PAYMENT_APPROVED` ao WhatsEntregavel com `integration_key`, `idempotency_key` e `fulfillment.mode`.

| Versão | Momento | Modo | Responsável pela entrega |
| --- | --- | --- | --- |
| 1 | Asaas confirma Pix | `generate_music_in_miniflux` | WhatsEntregavel/Miniflux |
| 2 | Asaas confirma Pix | `deliver_existing_preview_audio` | WhatsEntregavel/Miniflux |
| 3 | Asaas confirma Pix | `site_delivery` | Site |
| 4 | Asaas confirma Pix | `site_delivery` | Site |
| 5 | Comprovante aprovado | `site_delivery` | Site |
| 6 | Comprovante aprovado | `site_delivery` | Site |

O Miniflux deve salvar a `idempotency_key` antes de agir. Para `site_delivery`, registre o pagamento e responda sucesso, sem gerar música ou enviar WhatsApp. Isso evita duplicar as músicas entregues diretamente pelo site.
