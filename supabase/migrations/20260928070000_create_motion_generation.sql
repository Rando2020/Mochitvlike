begin;

create table if not exists public.motion_plans (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  scene_id uuid not null references public.series_scenes(id) on delete cascade,
  script_id uuid not null references public.scene_scripts(id) on delete cascade,
  visual_plan_id uuid not null references public.scene_visual_plans(id) on delete cascade,
  storyboard_id uuid not null references public.storyboards(id) on delete cascade,
  animatic_id uuid not null references public.scene_animatics(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check(version>=1),
  status text not null default 'GENERATING' check(status in ('DRAFT','GENERATING','READY','PARTIAL','FAILED','ARCHIVED')),
  plan jsonb not null,
  plan_schema_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique(animatic_id,version)
);

create table if not exists public.motion_clip_generations (
  id uuid primary key default gen_random_uuid(),
  motion_plan_id uuid not null references public.motion_plans(id) on delete cascade,
  motion_clip_id uuid not null,
  creator_id uuid not null references auth.users(id) on delete cascade,
  status text not null check(status in ('PENDING','GENERATING','COMPLETED','FAILED','SKIPPED')),
  prompt_checksum text null,
  prompt_version text null,
  provider text null,
  model text null,
  provider_duration_seconds integer null,
  provider_task_id text null,
  storage_path text null,
  asset_url text null,
  output_duration_seconds numeric null,
  width integer null,
  height integer null,
  mime_type text null,
  retry_count integer not null default 0,
  sanitized_error_code text null,
  claim_token uuid null,
  lease_expires_at timestamptz null,
  attempt_id uuid null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  failed_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique(motion_plan_id,motion_clip_id)
);

create index if not exists motion_plans_creator_animatic_idx on public.motion_plans(creator_id,animatic_id);
create index if not exists motion_clip_generations_queue_idx on public.motion_clip_generations(status,lease_expires_at,created_at);
create index if not exists motion_clip_generations_plan_idx on public.motion_clip_generations(motion_plan_id);

create or replace function public.touch_motion_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists motion_plans_touch on public.motion_plans;
create trigger motion_plans_touch before update on public.motion_plans for each row execute function public.touch_motion_updated_at();
drop trigger if exists motion_clip_generations_touch on public.motion_clip_generations;
create trigger motion_clip_generations_touch before update on public.motion_clip_generations for each row execute function public.touch_motion_updated_at();

alter table public.motion_plans enable row level security;
alter table public.motion_clip_generations enable row level security;

create policy "motion_plans_select_own" on public.motion_plans for select to authenticated using (
  creator_id=(select auth.uid())
  and exists(select 1 from public.scene_animatics a where a.id=animatic_id and a.storyboard_id=storyboard_id and a.visual_plan_id=visual_plan_id and a.script_id=script_id and a.scene_id=scene_id and a.series_id=series_id and a.creator_id=(select auth.uid()))
);
create policy "motion_jobs_select_own" on public.motion_clip_generations for select to authenticated using (
  creator_id=(select auth.uid())
  and exists(select 1 from public.motion_plans mp where mp.id=motion_plan_id and mp.creator_id=(select auth.uid()))
);

grant select on public.motion_plans to authenticated;
grant select on public.motion_clip_generations to authenticated;
revoke insert,update,delete on public.motion_plans from authenticated;
revoke insert,update,delete on public.motion_clip_generations from authenticated;

insert into storage.buckets(id,name,public)
values('motion-clips','motion-clips',true)
on conflict(id) do update set public=true;

create or replace function public.create_motion_plan_with_jobs(
  p_motion_plan_id uuid,p_creator_id uuid,p_series_id uuid,p_scene_id uuid,p_script_id uuid,p_visual_plan_id uuid,
  p_storyboard_id uuid,p_animatic_id uuid,p_version integer,p_plan jsonb,p_jobs jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_pending integer;
begin
  if p_version<1 or jsonb_typeof(p_jobs)<>'array' or jsonb_array_length(p_jobs)<1 then raise exception 'INVALID_MOTION_PAYLOAD'; end if;
  if not exists(
    select 1 from public.scene_animatics a
    where a.id=p_animatic_id and a.storyboard_id=p_storyboard_id and a.visual_plan_id=p_visual_plan_id
      and a.script_id=p_script_id and a.scene_id=p_scene_id and a.series_id=p_series_id and a.creator_id=p_creator_id
  ) then raise exception 'MOTION_PARENT_NOT_FOUND'; end if;

  select count(*) into v_pending from jsonb_to_recordset(p_jobs) as x(status text) where x.status='PENDING';

  begin
    insert into public.motion_plans(id,series_id,scene_id,script_id,visual_plan_id,storyboard_id,animatic_id,creator_id,version,status,plan)
    values(p_motion_plan_id,p_series_id,p_scene_id,p_script_id,p_visual_plan_id,p_storyboard_id,p_animatic_id,p_creator_id,p_version,case when v_pending=0 then 'READY' else 'GENERATING' end,p_plan);

    insert into public.motion_clip_generations(
      id,motion_plan_id,motion_clip_id,creator_id,status,prompt_checksum,prompt_version,provider,model,provider_duration_seconds
    )
    select x.id,p_motion_plan_id,x.motion_clip_id,p_creator_id,x.status,x.prompt_checksum,x.prompt_version,x.provider,x.model,x.provider_duration_seconds
    from jsonb_to_recordset(p_jobs) as x(
      id uuid,motion_clip_id uuid,status text,prompt_checksum text,prompt_version text,provider text,model text,provider_duration_seconds integer
    );

    if (select count(*) from public.motion_clip_generations where motion_plan_id=p_motion_plan_id)<>jsonb_array_length(p_jobs)
      then raise exception 'MOTION_JOB_COUNT_MISMATCH'; end if;
  exception when unique_violation then return false;
  end;
  return true;
end $$;
revoke all on function public.create_motion_plan_with_jobs(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb) from public,authenticated;
grant execute on function public.create_motion_plan_with_jobs(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb) to service_role;

create or replace function public.claim_next_motion_clip_generation(p_lease_seconds integer default 900)
returns table(id uuid,motion_plan_id uuid,motion_clip_id uuid,creator_id uuid,claim_token uuid,retry_count integer,provider_task_id text)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_claim uuid:=gen_random_uuid();
begin
  select j.id into v_id from public.motion_clip_generations j
  where j.status='PENDING' or (j.status='GENERATING' and j.lease_expires_at<now())
  order by j.created_at for update skip locked limit 1;
  if v_id is null then return; end if;
  update public.motion_clip_generations j set
    status='GENERATING',claim_token=v_claim,attempt_id=gen_random_uuid(),started_at=coalesce(j.started_at,now()),
    lease_expires_at=now()+make_interval(secs=>p_lease_seconds),sanitized_error_code=null,failed_at=null
  where j.id=v_id;
  return query select j.id,j.motion_plan_id,j.motion_clip_id,j.creator_id,j.claim_token,j.retry_count,j.provider_task_id
  from public.motion_clip_generations j where j.id=v_id;
end $$;
revoke all on function public.claim_next_motion_clip_generation(integer) from public,authenticated;
grant execute on function public.claim_next_motion_clip_generation(integer) to service_role;

create or replace function public.renew_motion_clip_generation_lease(p_job_id uuid,p_claim_token uuid,p_lease_seconds integer default 900)
returns boolean language sql security definer set search_path='' as $$
 update public.motion_clip_generations set lease_expires_at=now()+make_interval(secs=>p_lease_seconds)
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning true
$$;
revoke all on function public.renew_motion_clip_generation_lease(uuid,uuid,integer) from public,authenticated;
grant execute on function public.renew_motion_clip_generation_lease(uuid,uuid,integer) to service_role;

create or replace function public.set_motion_provider_task(p_job_id uuid,p_claim_token uuid,p_provider_task_id text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_existing text;
begin
  select provider_task_id into v_existing from public.motion_clip_generations
  where id=p_job_id and status='GENERATING' and claim_token=p_claim_token for update;
  if not found then return false; end if;
  if v_existing is not null and v_existing<>p_provider_task_id then return false; end if;
  update public.motion_clip_generations set provider_task_id=coalesce(provider_task_id,p_provider_task_id) where id=p_job_id;
  return true;
end $$;
revoke all on function public.set_motion_provider_task(uuid,uuid,text) from public,authenticated;
grant execute on function public.set_motion_provider_task(uuid,uuid,text) to service_role;

create or replace function public.complete_motion_clip_generation(
 p_job_id uuid,p_claim_token uuid,p_storage_path text,p_asset_url text,p_output_duration_seconds numeric,p_width integer,p_height integer,p_mime_type text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;v_total integer;v_completed integer;v_failed integer;v_skipped integer;v_active integer;
begin
 update public.motion_clip_generations set status='COMPLETED',storage_path=p_storage_path,asset_url=p_asset_url,
 output_duration_seconds=p_output_duration_seconds,width=p_width,height=p_height,mime_type=p_mime_type,completed_at=now(),
 lease_expires_at=null,claim_token=null,sanitized_error_code=null
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning motion_plan_id into v_plan;
 if v_plan is null then return false;end if;
 select count(*),count(*) filter(where status='COMPLETED'),count(*) filter(where status='FAILED'),count(*) filter(where status='SKIPPED'),
 count(*) filter(where status in('PENDING','GENERATING')) into v_total,v_completed,v_failed,v_skipped,v_active
 from public.motion_clip_generations where motion_plan_id=v_plan;
 update public.motion_plans set status=case
   when v_active>0 then 'GENERATING'
   when v_failed=0 and v_completed+v_skipped=v_total then 'READY'
   when v_failed=v_total then 'FAILED'
   else 'PARTIAL' end
 where id=v_plan;
 return true;
end $$;
revoke all on function public.complete_motion_clip_generation(uuid,uuid,text,text,numeric,integer,integer,text) from public,authenticated;
grant execute on function public.complete_motion_clip_generation(uuid,uuid,text,text,numeric,integer,integer,text) to service_role;

create or replace function public.fail_motion_clip_generation(p_job_id uuid,p_claim_token uuid,p_error_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;v_total integer;v_completed integer;v_failed integer;v_skipped integer;v_active integer;
begin
 update public.motion_clip_generations set status='FAILED',sanitized_error_code=left(p_error_code,80),failed_at=now(),lease_expires_at=null,claim_token=null
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning motion_plan_id into v_plan;
 if v_plan is null then return false;end if;
 select count(*),count(*) filter(where status='COMPLETED'),count(*) filter(where status='FAILED'),count(*) filter(where status='SKIPPED'),
 count(*) filter(where status in('PENDING','GENERATING')) into v_total,v_completed,v_failed,v_skipped,v_active
 from public.motion_clip_generations where motion_plan_id=v_plan;
 update public.motion_plans set status=case
   when v_active>0 then 'GENERATING'
   when v_failed=0 and v_completed+v_skipped=v_total then 'READY'
   when v_failed=v_total then 'FAILED'
   else 'PARTIAL' end
 where id=v_plan;
 return true;
end $$;
revoke all on function public.fail_motion_clip_generation(uuid,uuid,text) from public,authenticated;
grant execute on function public.fail_motion_clip_generation(uuid,uuid,text) to service_role;

create or replace function public.retry_motion_clip_generation(p_job_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;
begin
 update public.motion_clip_generations j set status='PENDING',retry_count=retry_count+1,sanitized_error_code=null,failed_at=null,
 started_at=null,completed_at=null,claim_token=null,lease_expires_at=null,attempt_id=null,provider_task_id=null,
 storage_path=null,asset_url=null,output_duration_seconds=null,width=null,height=null,mime_type=null
 where j.id=p_job_id and j.creator_id=(select auth.uid()) and j.status='FAILED' and j.retry_count<3
 returning motion_plan_id into v_plan;
 if v_plan is null then return false;end if;
 update public.motion_plans set status='GENERATING' where id=v_plan and creator_id=(select auth.uid());
 return true;
end $$;
revoke all on function public.retry_motion_clip_generation(uuid) from public;
grant execute on function public.retry_motion_clip_generation(uuid) to authenticated;

commit;
