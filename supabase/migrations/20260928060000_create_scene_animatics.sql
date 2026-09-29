begin;

create table if not exists public.scene_animatics (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  scene_id uuid not null references public.series_scenes(id) on delete cascade,
  script_id uuid not null references public.scene_scripts(id) on delete cascade,
  visual_plan_id uuid not null references public.scene_visual_plans(id) on delete cascade,
  storyboard_id uuid not null references public.storyboards(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version >= 1),
  status text not null default 'READY' check (status in ('DRAFT','READY','ARCHIVED')),
  timeline jsonb not null,
  timeline_schema_version text not null default '1.0',
  preview_storage_path text null,
  preview_url text null,
  preview_mime_type text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique (storyboard_id, version)
);

create index if not exists scene_animatics_creator_storyboard_idx on public.scene_animatics(creator_id,storyboard_id);

create or replace function public.touch_scene_animatic_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists scene_animatics_touch on public.scene_animatics;
create trigger scene_animatics_touch before update on public.scene_animatics
for each row execute function public.touch_scene_animatic_updated_at();

alter table public.scene_animatics enable row level security;

create policy "scene_animatics_select_own"
on public.scene_animatics for select to authenticated
using (
  creator_id=(select auth.uid())
  and exists(select 1 from public.series s where s.id=series_id and s.creator_id=(select auth.uid()))
  and exists(select 1 from public.series_scenes sc where sc.id=scene_id and sc.series_id=series_id and sc.creator_id=(select auth.uid()))
  and exists(select 1 from public.scene_scripts ss where ss.id=script_id and ss.scene_id=scene_id and ss.series_id=series_id and ss.creator_id=(select auth.uid()))
  and exists(select 1 from public.scene_visual_plans vp where vp.id=visual_plan_id and vp.script_id=script_id and vp.scene_id=scene_id and vp.series_id=series_id and vp.creator_id=(select auth.uid()))
  and exists(select 1 from public.storyboards sb where sb.id=storyboard_id and sb.visual_plan_id=visual_plan_id and sb.script_id=script_id and sb.scene_id=scene_id and sb.series_id=series_id and sb.creator_id=(select auth.uid()))
);

grant select on public.scene_animatics to authenticated;
revoke insert,update,delete on public.scene_animatics from authenticated;

create or replace function public.create_scene_animatic(
  p_animatic_id uuid,
  p_creator_id uuid,
  p_series_id uuid,
  p_scene_id uuid,
  p_script_id uuid,
  p_visual_plan_id uuid,
  p_storyboard_id uuid,
  p_version integer,
  p_timeline jsonb
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_version < 1 then raise exception 'INVALID_ANIMATIC_VERSION'; end if;

  if not exists (
    select 1 from public.storyboards sb
    where sb.id=p_storyboard_id
      and sb.series_id=p_series_id
      and sb.scene_id=p_scene_id
      and sb.script_id=p_script_id
      and sb.visual_plan_id=p_visual_plan_id
      and sb.creator_id=p_creator_id
  ) then raise exception 'ANIMATIC_PARENT_NOT_FOUND'; end if;

  begin
    insert into public.scene_animatics(
      id,series_id,scene_id,script_id,visual_plan_id,storyboard_id,creator_id,version,status,timeline,timeline_schema_version
    ) values (
      p_animatic_id,p_series_id,p_scene_id,p_script_id,p_visual_plan_id,p_storyboard_id,p_creator_id,p_version,'READY',p_timeline,'1.0'
    );
  exception when unique_violation then
    return false;
  end;

  return true;
end $$;

revoke all on function public.create_scene_animatic(uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb) from public,authenticated;
grant execute on function public.create_scene_animatic(uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb) to service_role;

commit;
