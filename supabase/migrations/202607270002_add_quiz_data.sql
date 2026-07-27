alter table public.orders add column if not exists quiz_data jsonb not null default '{}'::jsonb;
