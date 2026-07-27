alter table public.orders
  add column if not exists music_versions jsonb not null default '[]'::jsonb;
