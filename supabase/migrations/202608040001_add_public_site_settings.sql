create table if not exists public.site_public_settings (
  id boolean primary key default true check (id),
  support_whatsapp text not null default '5522992885365',
  updated_at timestamptz not null default now()
);

alter table public.site_public_settings enable row level security;

grant select on public.site_public_settings to anon, authenticated;

create policy "Public site settings are readable"
on public.site_public_settings
for select
to anon, authenticated
using (true);

insert into public.site_public_settings (id, support_whatsapp)
values (true, '5522992885365')
on conflict (id) do nothing;
