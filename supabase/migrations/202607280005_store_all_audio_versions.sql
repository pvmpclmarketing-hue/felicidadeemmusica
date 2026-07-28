alter table public.audio_previews
  add column if not exists audio_urls jsonb not null default '[]'::jsonb;
