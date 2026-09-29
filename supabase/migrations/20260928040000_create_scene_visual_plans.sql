begin;

create table if not exists public.scene_visual_plans (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scene_scripts(id) on delete cascade,
  scene_id uuid not null references public.series_scenes(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version >= 1),
  status text not null default 'DRAFT' check (status in ('DRAFT','APPROVED','ARCHIVED')),
  plan jsonb not null,
  plan_schema_version text not null default '1.0',
  generation_source text not null check (generation_source in ('llm','repaired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique (script_id, version)
);

create index if not exists scene_visual_plans_creator_series_idx on public.scene_visual_plans (creator_id, series_id);
create index if not exists scene_visual_plans_script_version_idx on public.scene_visual_plans (script_id, version desc);

create or replace function public.set_scene_visual_plan_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scene_visual_plans_set_updated_at on public.scene_visual_plans;
create trigger scene_visual_plans_set_updated_at
before update on public.scene_visual_plans
for each row execute function public.set_scene_visual_plan_updated_at();

alter table public.scene_visual_plans enable row level security;

drop policy if exists "scene_visual_plans_select_own" on public.scene_visual_plans;
create policy "scene_visual_plans_select_own"
on public.scene_visual_plans for select to authenticated
using (
  creator_id = (select auth.uid())
  and exists (select 1 from public.series s where s.id = scene_visual_plans.series_id and s.creator_id = (select auth.uid()))
  and exists (select 1 from public.series_scenes sc where sc.id = scene_visual_plans.scene_id and sc.series_id = scene_visual_plans.series_id and sc.creator_id = (select auth.uid()))
  and exists (select 1 from public.scene_scripts ss where ss.id = scene_visual_plans.script_id and ss.scene_id = scene_visual_plans.scene_id and ss.series_id = scene_visual_plans.series_id and ss.creator_id = (select auth.uid()))
);

drop policy if exists "scene_visual_plans_insert_own" on public.scene_visual_plans;
create policy "scene_visual_plans_insert_own"
on public.scene_visual_plans for insert to authenticated
with check (
  creator_id = (select auth.uid())
  and exists (select 1 from public.series s where s.id = scene_visual_plans.series_id and s.creator_id = (select auth.uid()))
  and exists (select 1 from public.series_scenes sc where sc.id = scene_visual_plans.scene_id and sc.series_id = scene_visual_plans.series_id and sc.creator_id = (select auth.uid()))
  and exists (select 1 from public.scene_scripts ss where ss.id = scene_visual_plans.script_id and ss.scene_id = scene_visual_plans.scene_id and ss.series_id = scene_visual_plans.series_id and ss.creator_id = (select auth.uid()))
);

drop policy if exists "scene_visual_plans_update_own" on public.scene_visual_plans;
create policy "scene_visual_plans_update_own"
on public.scene_visual_plans for update to authenticated
using (creator_id = (select auth.uid()))
with check (
  creator_id = (select auth.uid())
  and exists (select 1 from public.series s where s.id = scene_visual_plans.series_id and s.creator_id = (select auth.uid()))
  and exists (select 1 from public.series_scenes sc where sc.id = scene_visual_plans.scene_id and sc.series_id = scene_visual_plans.series_id and sc.creator_id = (select auth.uid()))
  and exists (select 1 from public.scene_scripts ss where ss.id = scene_visual_plans.script_id and ss.scene_id = scene_visual_plans.scene_id and ss.series_id = scene_visual_plans.series_id and ss.creator_id = (select auth.uid()))
);

drop policy if exists "scene_visual_plans_delete_own" on public.scene_visual_plans;
create policy "scene_visual_plans_delete_own"
on public.scene_visual_plans for delete to authenticated
using (creator_id = (select auth.uid()));

grant select, insert, update, delete on public.scene_visual_plans to authenticated;

commit;
