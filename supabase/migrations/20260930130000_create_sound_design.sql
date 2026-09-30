begin;

create table if not exists public.sound_design_plans(
 id uuid primary key,
 series_id uuid not null references public.series(id) on delete cascade,
 episode_assembly_id uuid not null references public.episode_assemblies(id) on delete cascade,
 dialogue_plan_id uuid null references public.dialogue_audio_plans(id) on delete set null,
 creator_id uuid not null references auth.users(id) on delete cascade,
 version integer not null check(version>=1),
 status text not null default 'GENERATING' check(status in('DRAFT','GENERATING','READY','PARTIAL','FAILED','ARCHIVED')),
 plan jsonb not null,
 plan_schema_version text not null default '1.0',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 archived_at timestamptz null,
 unique(episode_assembly_id,version)
);

create table if not exists public.sound_audio_generations(
 id uuid primary key,
 sound_plan_id uuid not null references public.sound_design_plans(id) on delete cascade,
 cue_id uuid not null,
 cue_type text not null check(cue_type in('MUSIC','AMBIENCE','SFX','FOLEY')),
 creator_id uuid not null references auth.users(id) on delete cascade,
 status text not null check(status in('PENDING','GENERATING','COMPLETED','FAILED','SKIPPED','LIBRARY')),
 provider text not null,
 model text not null,
 instruction_checksum text not null,
 instruction_version text not null,
 requested_duration_seconds numeric not null check(requested_duration_seconds>0),
 loopable boolean not null default false,
 storage_path text null,
 asset_url text null,
 mime_type text null,
 output_duration_seconds numeric null,
 duration_source text null check(duration_source is null or duration_source='REQUESTED'),
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
 unique(sound_plan_id,cue_id)
);

create index if not exists sound_plans_owner_episode_idx on public.sound_design_plans(creator_id,episode_assembly_id);
create index if not exists sound_generations_queue_idx on public.sound_audio_generations(status,lease_expires_at,created_at);
create index if not exists sound_generations_plan_idx on public.sound_audio_generations(sound_plan_id);

create or replace function public.touch_sound_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end $$;
drop trigger if exists sound_plans_touch on public.sound_design_plans;
create trigger sound_plans_touch before update on public.sound_design_plans for each row execute function public.touch_sound_updated_at();
drop trigger if exists sound_generations_touch on public.sound_audio_generations;
create trigger sound_generations_touch before update on public.sound_audio_generations for each row execute function public.touch_sound_updated_at();

alter table public.sound_design_plans enable row level security;
alter table public.sound_audio_generations enable row level security;
create policy "sound_plans_select_own" on public.sound_design_plans for select to authenticated using(
 creator_id=(select auth.uid()) and exists(select 1 from public.episode_assemblies ea where ea.id=sound_design_plans.episode_assembly_id and ea.series_id=sound_design_plans.series_id and ea.creator_id=(select auth.uid()))
);
create policy "sound_jobs_select_own" on public.sound_audio_generations for select to authenticated using(
 creator_id=(select auth.uid()) and exists(select 1 from public.sound_design_plans sp where sp.id=sound_audio_generations.sound_plan_id and sp.creator_id=(select auth.uid()))
);
grant select on public.sound_design_plans,public.sound_audio_generations to authenticated;
revoke insert,update,delete on public.sound_design_plans,public.sound_audio_generations from authenticated;

insert into storage.buckets(id,name,public) values('episode-sound','episode-sound',true) on conflict(id) do update set public=true;

create or replace function public.create_sound_design_plan(
 p_plan_id uuid,p_creator_id uuid,p_series_id uuid,p_episode_assembly_id uuid,p_dialogue_plan_id uuid,p_version integer,p_plan jsonb,p_jobs jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_jobs integer;v_active integer;
begin
 if p_version<1 or jsonb_typeof(p_jobs)<>'array' then raise exception 'INVALID_SOUND_PAYLOAD';end if;
 if not exists(select 1 from public.episode_assemblies ea where ea.id=p_episode_assembly_id and ea.series_id=p_series_id and ea.creator_id=p_creator_id and ea.status='READY') then raise exception 'EPISODE_ASSEMBLY_NOT_READY';end if;
 if p_dialogue_plan_id is not null and not exists(select 1 from public.dialogue_audio_plans dp where dp.id=p_dialogue_plan_id and dp.episode_assembly_id=p_episode_assembly_id and dp.series_id=p_series_id and dp.creator_id=p_creator_id) then raise exception 'DIALOGUE_PLAN_NOT_FOUND';end if;
 select count(*) into v_jobs from jsonb_to_recordset(p_jobs) as x(id uuid);
 if v_jobs<>jsonb_array_length(p_jobs) then raise exception 'SOUND_JOB_PAYLOAD_INVALID';end if;
 select count(*) into v_active from jsonb_to_recordset(p_jobs) as x(status text) where x.status='PENDING';
 begin
  insert into public.sound_design_plans(id,series_id,episode_assembly_id,dialogue_plan_id,creator_id,version,status,plan)
  values(p_plan_id,p_series_id,p_episode_assembly_id,p_dialogue_plan_id,p_creator_id,p_version,case when v_active=0 then 'READY' else 'GENERATING' end,p_plan);
  insert into public.sound_audio_generations(id,sound_plan_id,cue_id,cue_type,creator_id,status,provider,model,instruction_checksum,instruction_version,requested_duration_seconds,loopable,storage_path,asset_url,mime_type,output_duration_seconds,duration_source,completed_at)
  select x.id,p_plan_id,x.cue_id,x.cue_type,p_creator_id,x.status,x.provider,x.model,x.instruction_checksum,x.instruction_version,x.requested_duration_seconds,x.loopable,x.storage_path,x.asset_url,x.mime_type,x.output_duration_seconds,x.duration_source,case when x.status='LIBRARY' then now() else null end
  from jsonb_to_recordset(p_jobs) as x(id uuid,cue_id uuid,cue_type text,status text,provider text,model text,instruction_checksum text,instruction_version text,requested_duration_seconds numeric,loopable boolean,storage_path text,asset_url text,mime_type text,output_duration_seconds numeric,duration_source text);
  if(select count(*) from public.sound_audio_generations where sound_plan_id=p_plan_id)<>jsonb_array_length(p_jobs) then raise exception 'SOUND_JOB_COUNT_MISMATCH';end if;
 exception when unique_violation then return false;
 end;
 return true;
end $$;
revoke all on function public.create_sound_design_plan(uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb) from public,authenticated;
grant execute on function public.create_sound_design_plan(uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb) to service_role;

create or replace function public.claim_next_sound_generation(p_lease_seconds integer default 180)
returns table(id uuid,sound_plan_id uuid,cue_id uuid,creator_id uuid,claim_token uuid,retry_count integer) language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_claim uuid:=gen_random_uuid();
begin
 select j.id into v_id from public.sound_audio_generations j where j.status='PENDING' or(j.status='GENERATING' and j.lease_expires_at<now()) order by j.created_at for update skip locked limit 1;
 if v_id is null then return;end if;
 update public.sound_audio_generations j set status='GENERATING',claim_token=v_claim,attempt_id=gen_random_uuid(),started_at=coalesce(j.started_at,now()),lease_expires_at=now()+make_interval(secs=>p_lease_seconds),sanitized_error_code=null,failed_at=null where j.id=v_id;
 return query select j.id,j.sound_plan_id,j.cue_id,j.creator_id,j.claim_token,j.retry_count from public.sound_audio_generations j where j.id=v_id;
end $$;
revoke all on function public.claim_next_sound_generation(integer) from public,authenticated;
grant execute on function public.claim_next_sound_generation(integer) to service_role;

create or replace function public.renew_sound_generation_lease(p_job_id uuid,p_claim_token uuid,p_lease_seconds integer default 180) returns boolean language sql security definer set search_path='' as $$
 update public.sound_audio_generations set lease_expires_at=now()+make_interval(secs=>p_lease_seconds) where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning true
$$;
revoke all on function public.renew_sound_generation_lease(uuid,uuid,integer) from public,authenticated;
grant execute on function public.renew_sound_generation_lease(uuid,uuid,integer) to service_role;

create or replace function public.complete_sound_generation(p_job_id uuid,p_claim_token uuid,p_storage_path text,p_asset_url text,p_mime_type text,p_output_duration_seconds numeric,p_duration_source text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;v_total integer;v_failed integer;v_active integer;v_resolved integer;
begin
 update public.sound_audio_generations set status='COMPLETED',storage_path=p_storage_path,asset_url=p_asset_url,mime_type=p_mime_type,output_duration_seconds=p_output_duration_seconds,duration_source=p_duration_source,completed_at=now(),claim_token=null,lease_expires_at=null,sanitized_error_code=null where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning sound_plan_id into v_plan;
 if v_plan is null then return false;end if;
 select count(*),count(*) filter(where status='FAILED'),count(*) filter(where status in('PENDING','GENERATING')),count(*) filter(where status in('COMPLETED','LIBRARY','SKIPPED')) into v_total,v_failed,v_active,v_resolved from public.sound_audio_generations where sound_plan_id=v_plan;
 update public.sound_design_plans set status=case when v_active>0 then 'GENERATING' when v_failed=0 and v_resolved=v_total then 'READY' when v_failed=v_total then 'FAILED' else 'PARTIAL' end where id=v_plan;
 return true;
end $$;
revoke all on function public.complete_sound_generation(uuid,uuid,text,text,text,numeric,text) from public,authenticated;
grant execute on function public.complete_sound_generation(uuid,uuid,text,text,text,numeric,text) to service_role;

create or replace function public.fail_sound_generation(p_job_id uuid,p_claim_token uuid,p_error_code text) returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;v_total integer;v_failed integer;v_active integer;v_resolved integer;
begin
 update public.sound_audio_generations set status='FAILED',sanitized_error_code=left(p_error_code,80),failed_at=now(),claim_token=null,lease_expires_at=null where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning sound_plan_id into v_plan;
 if v_plan is null then return false;end if;
 select count(*),count(*) filter(where status='FAILED'),count(*) filter(where status in('PENDING','GENERATING')),count(*) filter(where status in('COMPLETED','LIBRARY','SKIPPED')) into v_total,v_failed,v_active,v_resolved from public.sound_audio_generations where sound_plan_id=v_plan;
 update public.sound_design_plans set status=case when v_active>0 then 'GENERATING' when v_failed=0 and v_resolved=v_total then 'READY' when v_failed=v_total then 'FAILED' else 'PARTIAL' end where id=v_plan;
 return true;
end $$;
revoke all on function public.fail_sound_generation(uuid,uuid,text) from public,authenticated;
grant execute on function public.fail_sound_generation(uuid,uuid,text) to service_role;

create or replace function public.retry_sound_generation(p_job_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;
begin
 update public.sound_audio_generations j set status='PENDING',retry_count=retry_count+1,sanitized_error_code=null,failed_at=null,started_at=null,completed_at=null,claim_token=null,lease_expires_at=null,attempt_id=null,storage_path=null,asset_url=null,mime_type=null,output_duration_seconds=null,duration_source=null where j.id=p_job_id and j.creator_id=(select auth.uid()) and j.status='FAILED' and j.retry_count<3 returning sound_plan_id into v_plan;
 if v_plan is null then return false;end if;
 update public.sound_design_plans set status='GENERATING' where id=v_plan and creator_id=(select auth.uid());return true;
end $$;
revoke all on function public.retry_sound_generation(uuid) from public;
grant execute on function public.retry_sound_generation(uuid) to authenticated;

commit;
