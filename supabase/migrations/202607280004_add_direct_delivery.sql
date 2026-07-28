alter table public.orders add column if not exists delivery_mode text not null default 'whatsapp' check (delivery_mode in ('whatsapp', 'download'));
alter table public.orders add column if not exists kie_task_id text unique;
