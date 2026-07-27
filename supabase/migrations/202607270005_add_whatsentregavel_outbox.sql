create table if not exists public.outbound_notifications (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null unique,
  path text not null,
  secret_header text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outbound_notifications_status_created_at_idx on public.outbound_notifications (status, created_at);
alter table public.outbound_notifications enable row level security;
create trigger touch_outbound_notifications before update on public.outbound_notifications for each row execute procedure public.touch_updated_at();
