create table if not exists public.audio_previews (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  recipient text not null,
  style text not null,
  voice_gender text not null check (voice_gender in ('m', 'f')),
  honoree text not null,
  story text not null,
  lyric_text text not null,
  kie_task_id text unique,
  audio_url text,
  request_fingerprint text,
  error_message text,
  created_at timestamptz not null default now(),
  ready_at timestamptz
);

create index if not exists audio_previews_fingerprint_created_at_idx
  on public.audio_previews (request_fingerprint, created_at desc);

alter table public.audio_previews enable row level security;
