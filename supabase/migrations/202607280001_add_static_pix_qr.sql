alter table public.orders add column if not exists asaas_static_qr_id text;
create unique index if not exists orders_asaas_static_qr_id_key on public.orders (asaas_static_qr_id) where asaas_static_qr_id is not null;
