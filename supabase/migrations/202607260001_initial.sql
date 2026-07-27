create extension if not exists pgcrypto;

create type public.order_status as enum ('awaiting_payment', 'paid', 'queued', 'generating', 'ready', 'delivery_failed', 'cancelled');
create type public.job_status as enum ('queued', 'processing', 'submitted', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  status public.order_status not null default 'awaiting_payment',
  recipient text not null,
  style text not null,
  honoree text not null,
  story text not null,
  buyer_name text not null,
  buyer_phone text not null,
  amount_cents integer not null default 1990 check (amount_cents > 0),
  asaas_customer_id text,
  asaas_payment_id text unique,
  lyric_text text,
  music_url text,
  quiz_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  status public.job_status not null default 'queued',
  provider_task_id text unique,
  attempts integer not null default 0,
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (provider, event_key)
);

create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index generation_jobs_status_created_at_idx on public.generation_jobs (status, created_at);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.webhook_events enable row level security;

create policy "administrators can read profiles" on public.profiles for select using (auth.uid() = id);
create policy "administrators can manage orders" on public.orders for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "administrators can manage jobs" on public.generation_jobs for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "administrators can read webhook events" on public.webhook_events for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger touch_orders before update on public.orders for each row execute procedure public.touch_updated_at();
create trigger touch_generation_jobs before update on public.generation_jobs for each row execute procedure public.touch_updated_at();
