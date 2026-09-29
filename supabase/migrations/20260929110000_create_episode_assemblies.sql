begin;

create table if not exists public.episode_assemblies (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  episode_key text not null check(episode_key in ('episodeOne')),
  creator_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check(version>=1),
  status text not null default 'READY' check(status in ('DRAFT','READY','ARCHIVED')),
  timeline jsonb not null,
  timeline_schema_version text not null default '1.0',
  preview_storage_path text null,
  preview_url text null,
  preview_mime_type text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique(series_id,episode_key,version)
);

create table if not exists public.episode_assembly_scenes (
  episode_assembly_id uuid not null references public.episode_assemblies(id) on delete cascade,
  scene_id uuid not null references public.series_scenes(id) on delete restrict,
  animatic_id uuid not null references public.scene_animatics(id) on delete restrict,
  motion_plan_id uuid not null references public.motion_plans(id) on delete restrict,
  scene_order integer not null check(scene_order>=0),
  primary key(episode_assembly_id,scene_order),
  unique(episode_assembly_id,scene_id)
);

create index if not exists episode_assemblies_owner_idx on public.episode_assemblies(creator_id,series_id,episode_key);
create index if not exists episode_assembly_scenes_motion_idx on public.episode_assembly_scenes(motion_plan_id);

create or replace function public.touch_episode_assembly_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists episode_assemblies_touch on public.episode_assemblies;
create trigger episode_assemblies_touch before update on public.episode_assemblies for each row execute function public.touch_episode_assembly_updated_at();

alter table public.episode_assemblies enable row level security;
alter table public.episode_assembly_scenes enable row level security;

create policy "episode_assemblies_select_own" on public.episode_assemblies for select to authenticated using (
  creator_id=(select auth.uid())
  and exists(select 1 from public.series s where s.id=series_id and s.creator_id=(select auth.uid()))
);
create policy "episode_assembly_scenes_select_own" on public.episode_assembly_scenes for select to authenticated using (
  exists(
    select 1 from public.episode_assemblies ea
    join public.motion_plans mp on mp.id=motion_plan_id
    where ea.id=episode_assembly_id
      and ea.creator_id=(select auth.uid())
      and mp.creator_id=(select auth.uid())
      and mp.series_id=ea.series_id
      and mp.scene_id=scene_id
      and mp.animatic_id=animatic_id
  )
);

grant select on public.episode_assemblies to authenticated;
grant select on public.episode_assembly_scenes to authenticated;
revoke insert,update,delete on public.episode_assemblies from authenticated;
revoke insert,update,delete on public.episode_assembly_scenes from authenticated;

create or replace function public.create_episode_assembly(
  p_assembly_id uuid,p_creator_id uuid,p_series_id uuid,p_episode_key text,p_version integer,p_timeline jsonb,p_scenes jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  if p_episode_key<>'episodeOne' or p_version<1 or jsonb_typeof(p_scenes)<>'array' or jsonb_array_length(p_scenes)<1 then raise exception 'INVALID_EPISODE_ASSEMBLY_PAYLOAD'; end if;
  if not exists(select 1 from public.series s where s.id=p_series_id and s.creator_id=p_creator_id) then raise exception 'EPISODE_SERIES_NOT_FOUND'; end if;

  select count(*) into v_count
  from jsonb_to_recordset(p_scenes) as x(scene_id uuid,animatic_id uuid,motion_plan_id uuid,scene_order integer)
  join public.motion_plans mp on mp.id=x.motion_plan_id
  where mp.creator_id=p_creator_id and mp.series_id=p_series_id and mp.scene_id=x.scene_id and mp.animatic_id=x.animatic_id and mp.status='READY';

  if v_count<>jsonb_array_length(p_scenes) then raise exception 'EPISODE_MOTION_INCOMPLETE'; end if;

  begin
    insert into public.episode_assemblies(id,series_id,episode_key,creator_id,version,status,timeline)
    values(p_assembly_id,p_series_id,p_episode_key,p_creator_id,p_version,'READY',p_timeline);

    insert into public.episode_assembly_scenes(episode_assembly_id,scene_id,animatic_id,motion_plan_id,scene_order)
    select p_assembly_id,x.scene_id,x.animatic_id,x.motion_plan_id,x.scene_order
    from jsonb_to_recordset(p_scenes) as x(scene_id uuid,animatic_id uuid,motion_plan_id uuid,scene_order integer)
    order by x.scene_order;

    if (select count(*) from public.episode_assembly_scenes where episode_assembly_id=p_assembly_id)<>jsonb_array_length(p_scenes)
      then raise exception 'EPISODE_SCENE_COUNT_MISMATCH'; end if;
  exception when unique_violation then return false;
  end;
  return true;
end $$;

revoke all on function public.create_episode_assembly(uuid,uuid,uuid,text,integer,jsonb,jsonb) from public,authenticated;
grant execute on function public.create_episode_assembly(uuid,uuid,uuid,text,integer,jsonb,jsonb) to service_role;

commit;
