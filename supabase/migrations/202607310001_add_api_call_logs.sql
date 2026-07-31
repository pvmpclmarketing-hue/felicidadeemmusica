-- Histórico técnico de todas as Edge Functions. Não armazena corpo de quiz,
-- letra, áudio, telefone ou qualquer outro dado sensível do cliente.
create table if not exists public.api_call_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  function_name text not null,
  method text not null,
  http_status integer not null,
  outcome text not null check (outcome in ('success', 'error')),
  duration_ms integer not null check (duration_ms >= 0),
  correlation_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists api_call_logs_created_at_idx on public.api_call_logs (created_at desc);
create index if not exists api_call_logs_function_created_at_idx on public.api_call_logs (function_name, created_at desc);
create index if not exists api_call_logs_errors_idx on public.api_call_logs (created_at desc) where outcome = 'error';
create index if not exists api_call_logs_correlation_idx on public.api_call_logs (correlation_id) where correlation_id is not null;

alter table public.api_call_logs enable row level security;

-- Os registros são gravados exclusivamente pelas Edge Functions com service role.
revoke all on public.api_call_logs from anon, authenticated;
