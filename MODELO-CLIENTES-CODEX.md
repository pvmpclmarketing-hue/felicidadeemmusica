# Contexto para Codex — template de música personalizada

Leia este documento antes de alterar o template. O projeto usa Next.js na Vercel e Supabase para banco, APIs e Edge Functions. Cada instalação pertence a um único cliente e deve ter ambiente próprio.

## Regras de segurança

- Nunca exponha `OPENAI_API_KEY`, `KIE_API_KEY`, `ASAAS_API_KEY`, `META_CAPI_ACCESS_TOKEN`, tokens de webhook ou secrets do Supabase no frontend.
- Preserve a separação por `order_id`, `preview_id` e `kie_task_id`; ela impede que um cliente receba conteúdo de outro.
- URLs completas de áudio só podem ser retornadas após `orders.status = ready`. A página de entrega usa `get-order-delivery-secure`.
- Não regenere faixas quando `quiz_data.preview_audio_urls` já tiver duas URLs únicas.
- Não troque o projeto Supabase, Pix, domínio ou chaves de um cliente por valores de outro.

## Rotas e comportamento das seis versões

| Rota | Prévia | Pagamento | Depois do pagamento | Entrega |
| --- | --- | --- | --- | --- |
| `/` | Letra gerada com OpenAI | Asaas | Evento para WhatsApp | Miniflux/WhatsApp |
| `/versao-2` | 2 prévias em áudio Kie, limitadas a 30 s | Asaas | Envia as 2 URLs já criadas | Miniflux/WhatsApp |
| `/versao-3` | Letra | Asaas | Kie gera música completa | Download no site |
| `/versao-4` | 2 prévias em áudio Kie | Asaas | Não chama Kie novamente | Download das mesmas 2 faixas completas |
| `/versao-5` | 2 prévias em áudio Kie | Pix manual + comprovante | Não chama Kie novamente | Download das mesmas 2 faixas completas |
| `/versao-6` | Letra | Pix manual + comprovante | Kie gera música completa após validação | Download no site |

## Fluxos obrigatórios

### Gatilho de pagamento para WhatsEntregavel

Somente as versões 1 e 2 entregam por WhatsApp. Quando o Asaas aprova o Pix, `asaas-webhook` envia `PAYMENT_APPROVED` ao endpoint do WhatsEntregavel com `integration_key`, `idempotency_key` e o campo obrigatório `fulfillment.mode`:

| Versão | `fulfillment.mode` | Ação no WhatsEntregavel |
| --- | --- | --- |
| 1 (prévia de letra) | `generate_music_in_miniflux` | Gerar a faixa a partir de `lyric_text`, `quiz.music_style` e `quiz.voice_gender`; depois enviar. |
| 2 (prévia em áudio) | `deliver_existing_preview_audio` | Enviar exatamente as duas URLs em `preview.audios`; nunca gerar nova faixa. |

Não remova esse campo nem use um gatilho genérico. O receptor resolve o WhatsApp da conta por `integration_key`; nunca envie `connection_id`. Para o contrato completo, consulte `MODIFICACAO_SITE_GATILHOS_PAGAMENTO.md`.

### Versões 4 e 5: prévia em áudio

1. O quiz gera letra e duas prévias Kie.
2. `audio_previews` guarda `lyric_text`, `audio_url` e `audio_urls`.
3. O cliente escuta apenas 30 segundos no frontend; as URLs originais continuam completas.
4. Ao criar pedido, copie as duas URLs únicas para `orders.quiz_data.preview_audio_urls` e `orders.music_versions`.
5. Após pagamento ou comprovante aprovado, defina o pedido como `ready` e entregue essas duas URLs. Não crie tarefa nova na Kie.

### Versões 3 e 6: prévia em letra

1. O cliente aprova a letra e cria o pedido.
2. Após Pix confirmado (v3) ou comprovante aprovado (v6), inicie a Kie com `lyric_text`, estilo e voz.
3. Enquanto o status for `generating`, `/entrega?pedido=<uuid>` mostra carregamento.
4. `kie-delivery-webhook` recebe o callback, remove repetidas, guarda no máximo duas URLs e marca o pedido como `ready`.

### Versões 5 e 6: Pix manual

1. Cliente vê recebedor e chave Pix, toca em copiar e o site cria o pedido.
2. O próximo passo é o upload de JPG, PNG ou PDF do comprovante, com opção de copiar a chave novamente.
3. `verify-manual-receipt` envia o arquivo para OpenAI Vision, validando comprovante Pix, valor e chave/CNPJ do recebedor.
4. Se inválido, devolve mensagem clara e não inicia entrega.
5. Se válido, v5 libera as prévias completas e v6 inicia a Kie.

## Funções principais

| Função | Responsabilidade |
| --- | --- |
| `generate-lyrics` / `revise-lyrics` | Letra e única alteração permitida |
| `transcribe-story-audio` | Transcreve áudio da história com OpenAI |
| `generate-audio-preview` / `kie-preview-webhook` | Cria e armazena duas prévias Kie |
| `create-pix` | Pedido e QR Pix estático Asaas |
| `asaas-webhook` | Confirma Pix Asaas, idempotente por evento |
| `create-manual-pix-order` | Cria pedido para Pix manual |
| `verify-manual-receipt` | Lê comprovante e libera ou inicia produção |
| `kie-delivery-webhook` | Salva as duas faixas completas da Kie |
| `get-order-delivery-secure` | Retorna áudio somente para pedido `ready` |
| `api_call_logs` | Diagnóstico de chamadas e erros |

## Dados enviados pelo quiz

Preserve estes nomes: `recipient`, `style`, `music_style`, `voice_gender`, `honoree`, `story`, `preview_id`, `preview_audio_urls`, `lyric_text`, `buyerName` e `buyerPhone`.

O estilo é `quiz.music_style` e a voz é `quiz.voice_gender` com `m` ou `f`. O fluxo de WhatsApp deve receber também `lyric_text` e `preview.audios` quando a prévia for em áudio.

## Rastreamento

- `InitiateCheckout`: quando o Pix é criado.
- `Purchase`: no webhook Asaas ou após comprovante aprovado.
- Meta Pixel é frontend; CAPI é backend. O `event_id` deve continuar determinístico por pedido.

## Alterações permitidas

Pode alterar marca, cores, textos, preço, mídia e suporte do cliente. Antes de mudar um fluxo, confirme qual versão está sendo alterada e preserve as regras acima. Rode o build antes de publicar e teste pelo menos um pedido em sandbox ou com comprovante de teste.
