# Publicação: Vercel + Supabase + Railway

## 1. Supabase: banco e pagamentos

1. Crie um projeto Supabase e execute a migração em `supabase/migrations/202607260001_initial.sql` pelo SQL Editor.
2. Nas Edge Functions, cadastre os segredos: `ASAAS_API_KEY`, `ASAAS_API_URL`, `ASAAS_WEBHOOK_TOKEN` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Publique `create-pix` e `asaas-webhook` usando a CLI do Supabase. O arquivo `supabase/config.toml` deixa ambas públicas; a função de Pix valida os campos e a do Asaas valida o token do cabeçalho.
4. No Asaas, cadastre como webhook `https://SEU-PROJETO.supabase.co/functions/v1/asaas-webhook`, com os eventos `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`. O token configurado no Asaas deve ser igual a `ASAAS_WEBHOOK_TOKEN`.

## 2. Vercel: site público

1. Importe esta pasta `site-novo` como projeto Next.js.
2. Em Environment Variables, configure somente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Faça o deploy. Chaves do Asaas, Kie, Supabase Service Role e WhatsApp nunca entram na Vercel pública.

## 3. Railway: geração de música

1. Crie um serviço apontando para a pasta `railway-worker`.
2. Cadastre as variáveis de `railway-worker/.env.example`.
3. Confirme com a documentação da Kie o endpoint, payload e formato da resposta; o adaptador fica concentrado em `railway-worker/src/index.js`.
4. Quando o Asaas confirmar o pagamento, a função cria uma tarefa. O worker consulta a fila a cada 30 segundos e envia a tarefa à Kie.

## Próxima etapa: painel e WhatsApp via QR Code

O banco já separa pedidos, tarefas e eventos. O painel deverá usar Supabase Auth e só administradores terão acesso aos pedidos. A conexão por QR Code do WhatsApp deve ficar em um adaptador do Railway, isolada do checkout; não grave sessão, QR ou credenciais no frontend nem no banco sem criptografia.
