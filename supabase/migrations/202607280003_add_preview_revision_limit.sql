alter table public.audio_previews add column if not exists revision_used boolean not null default false;
