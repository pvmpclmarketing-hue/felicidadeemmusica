# Gatilhos de pagamento para WhatsEntregavel

Somente pagamentos das versões que entregam pelo WhatsApp enviam `PAYMENT_APPROVED` ao WhatsEntregavel.

| Versão | Momento | Modo | Responsável pela entrega |
| --- | --- | --- | --- |
| 1 | Asaas confirma Pix | `generate_music_in_miniflux` | WhatsEntregavel/Miniflux |
| 2 | Asaas confirma Pix | `deliver_existing_preview_audio` | WhatsEntregavel/Miniflux |
| 3 a 6 | — | — | Site, sem webhook para o Minifluxo |

O Miniflux deve salvar a `idempotency_key` antes de agir. As versões 3, 4, 5 e 6 não enviam cliente, letra, áudio, comprovante, pedido ou qualquer outra informação ao Minifluxo.
