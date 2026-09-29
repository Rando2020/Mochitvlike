begin;

create table if not exists public.scene_scripts (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.series_scenes(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version >= 1),
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'APPROVED', 'ARCHIVED')),
  script jsonb not null,
  script_schema_version text not null default '1.0',
  generation_source text not null
    check (generation_source in ('llm', 'repaired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique (scene_id, version)
);

create index if not exists scene_scripts_creator_series_idx
  on public.scene_scripts (creator_id, series_id);

create index if not exists scene_scripts_scene_version_idx
  on public.scene_scripts (scene_id, version desc);

create index if not exists scene_scripts_status_idx
  on public.scene_scripts (status);

create or replace function public.set_scene_script_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scene_scripts_set_updated_at on public.scene_scripts;
create trigger scene_scripts_set_updated_at
before update on public.scene_scripts
for each row
execute function public.set_scene_script_updated_at();

alter table public.scene_scripts enable row level security;

drop policy if exists "scene_scripts_select_own" on public.scene_scripts;
create policy "scene_scripts_select_own"
on public.scene_scripts for select to authenticated
using (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series s
    where s.id = scene_scripts.series_id
      and s.creator_id = (select auth.uid())
  )
  and exists (
    select 1 from public.series_scenes sc
    where sc.id = scene_scripts.scene_id
      and sc.series_id = scene_scripts.series_id
      and sc.creator_id = (select auth.uid())
  )
);

drop policy if exists "scene_scripts_insert_own" on public.scene_scripts;
create policy "scene_scripts_insert_own"
on public.scene_scripts for insert to authenticated
with check (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series s
    where s.id = scene_scripts.series_id
      and s.creator_id = (select auth.uid())
  )
  and exists (
    select 1 from public.series_scenes sc
    where sc.id = scene_scripts.scene_id
      and sc.series_id = scene_scripts.series_id
      and sc.creator_id = (select auth.uid())
  )
);

drop policy if exists "scene_scripts_update_own" on public.scene_scripts;
create policy "scene_scripts_update_own"
on public.scene_scripts for update to authenticated
using (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series_scenes sc
    where sc.id = scene_scripts.scene_id
      and sc.series_id = scene_scripts.series_id
      and sc.creator_id = (select auth.uid())
  )
)
with check (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series s
    where s.id = scene_scripts.series_id
      and s.creator_id = (select auth.uid())
  )
  and exists (
    select 1 from public.series_scenes sc
    where sc.id = scene_scripts.scene_id
      and sc.series_id = scene_scripts.series_id
      and sc.creator_id = (select auth.uid())
  )
);

drop policy if exists "scene_scripts_delete_own" on public.scene_scripts;
create policy "scene_scripts_delete_own"
on public.scene_scripts for delete to authenticated
using (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.series_scenes sc
    where sc.id = scene_scripts.scene_id
      and sc.series_id = scene_scripts.series_id
      and sc.creator_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.scene_scripts to authenticated;

commit;
