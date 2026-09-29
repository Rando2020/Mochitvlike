begin;

create table if not exists public.series_scenes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  episode_key text not null check (episode_key = 'episodeOne'),
  source_beat_id text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'READY', 'ARCHIVED')),
  blueprint jsonb not null,
  blueprint_schema_version text not null default '1.0',
  generation_source text not null
    check (generation_source in ('llm', 'repaired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique (series_id, episode_key, source_beat_id)
);

create index if not exists series_scenes_creator_series_idx
  on public.series_scenes (creator_id, series_id);

create index if not exists series_scenes_series_updated_idx
  on public.series_scenes (series_id, updated_at desc);

create index if not exists series_scenes_status_idx
  on public.series_scenes (status);

create or replace function public.set_series_scene_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists series_scenes_set_updated_at on public.series_scenes;
create trigger series_scenes_set_updated_at
before update on public.series_scenes
for each row
execute function public.set_series_scene_updated_at();

alter table public.series_scenes enable row level security;

drop policy if exists "series_scenes_select_own" on public.series_scenes;
create policy "series_scenes_select_own"
on public.series_scenes for select to authenticated
using (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series s
    where s.id = series_scenes.series_id
      and s.creator_id = (select auth.uid())
  )
);

drop policy if exists "series_scenes_insert_own" on public.series_scenes;
create policy "series_scenes_insert_own"
on public.series_scenes for insert to authenticated
with check (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series s
    where s.id = series_scenes.series_id
      and s.creator_id = (select auth.uid())
  )
);

drop policy if exists "series_scenes_update_own" on public.series_scenes;
create policy "series_scenes_update_own"
on public.series_scenes for update to authenticated
using (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series s
    where s.id = series_scenes.series_id
      and s.creator_id = (select auth.uid())
  )
)
with check (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series s
    where s.id = series_scenes.series_id
      and s.creator_id = (select auth.uid())
  )
);

drop policy if exists "series_scenes_delete_own" on public.series_scenes;
create policy "series_scenes_delete_own"
on public.series_scenes for delete to authenticated
using (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series s
    where s.id = series_scenes.series_id
      and s.creator_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.series_scenes to authenticated;

commit;
