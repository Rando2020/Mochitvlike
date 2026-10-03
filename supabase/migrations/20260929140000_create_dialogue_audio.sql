begin;

create table if not exists public.voice_casts (
  id uuid primary key,
  series_id uuid not null references public.series(id) on delete cascade,
  episode_assembly_id uuid not null references public.episode_assemblies(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check(version>=1),
  "cast" jsonb not null,
  cast_schema_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique(episode_assembly_id,version)
);

create table if not exists public.dialogue_audio_plans (
  id uuid primary key,
  series_id uuid not null references public.series(id) on delete cascade,
  episode_assembly_id uuid not null references public.episode_assemblies(id) on delete cascade,
  voice_cast_id uuid not null references public.voice_casts(id) on delete restrict,
  creator_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check(version>=1),
  status text not null default 'GENERATING' check(status in ('GENERATING','READY','PARTIAL','FAILED','ARCHIVED')),
  plan jsonb not null,
  plan_schema_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique(episode_assembly_id,version)
);

create table if not exists public.dialogue_audio_generations (
  id uuid primary key,
  dialogue_plan_id uuid not null references public.dialogue_audio_plans(id) on delete cascade,
  line_id uuid not null,
  script_block_id text not null,
  character_id text not null,
  creator_id uuid not null references auth.users(id) on delete cascade,
  status text not null check(status in ('PENDING','GENERATING','COMPLETED','FAILED')),
  provider text not null,
  model text not null,
  provider_voice_id text not null,
  instruction_checksum text not null,
  instruction_version text not null,
  text_checksum text not null,
  episode_start_seconds numeric not null check(episode_start_seconds>=0),
  visual_window_seconds numeric not null check(visual_window_seconds>0),
  storage_path text null,
  asset_url text null,
  mime_type text null,
  output_duration_seconds numeric null,
  sample_rate integer null,
  channels integer null,
  timing_difference_seconds numeric null,
  timing_fit text not null default 'UNKNOWN' check(timing_fit in ('UNKNOWN','FITS','TOO_LONG','VERY_SHORT')),
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
  unique(dialogue_plan_id,line_id)
);

create index if not exists voice_casts_owner_episode_idx on public.voice_casts(creator_id,episode_assembly_id);
create index if not exists dialogue_plans_owner_episode_idx on public.dialogue_audio_plans(creator_id,episode_assembly_id);
create index if not exists dialogue_generations_queue_idx on public.dialogue_audio_generations(status,lease_expires_at,created_at);
create index if not exists dialogue_generations_plan_idx on public.dialogue_audio_generations(dialogue_plan_id);

create or replace function public.touch_dialogue_audio_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists voice_casts_touch on public.voice_casts;
create trigger voice_casts_touch before update on public.voice_casts for each row execute function public.touch_dialogue_audio_updated_at();
drop trigger if exists dialogue_plans_touch on public.dialogue_audio_plans;
create trigger dialogue_plans_touch before update on public.dialogue_audio_plans for each row execute function public.touch_dialogue_audio_updated_at();
drop trigger if exists dialogue_generations_touch on public.dialogue_audio_generations;
create trigger dialogue_generations_touch before update on public.dialogue_audio_generations for each row execute function public.touch_dialogue_audio_updated_at();

alter table public.voice_casts enable row level security;
alter table public.dialogue_audio_plans enable row level security;
alter table public.dialogue_audio_generations enable row level security;

create policy "voice_casts_select_own" on public.voice_casts for select to authenticated using (
  creator_id=(select auth.uid())
  and exists(select 1 from public.episode_assemblies ea where ea.id=voice_casts.episode_assembly_id and ea.series_id=voice_casts.series_id and ea.creator_id=(select auth.uid()))
);
create policy "dialogue_plans_select_own" on public.dialogue_audio_plans for select to authenticated using (
  creator_id=(select auth.uid())
  and exists(select 1 from public.episode_assemblies ea where ea.id=dialogue_audio_plans.episode_assembly_id and ea.series_id=dialogue_audio_plans.series_id and ea.creator_id=(select auth.uid()))
);
create policy "dialogue_jobs_select_own" on public.dialogue_audio_generations for select to authenticated using (
  creator_id=(select auth.uid())
  and exists(select 1 from public.dialogue_audio_plans dp where dp.id=dialogue_audio_generations.dialogue_plan_id and dp.creator_id=(select auth.uid()))
);

grant select on public.voice_casts,public.dialogue_audio_plans,public.dialogue_audio_generations to authenticated;
revoke insert,update,delete on public.voice_casts,public.dialogue_audio_plans,public.dialogue_audio_generations from authenticated;

insert into storage.buckets(id,name,public)
values('dialogue-audio','dialogue-audio',true)
on conflict(id) do update set public=true;

create or replace function public.create_dialogue_audio_plan(
  p_voice_cast_id uuid,p_dialogue_plan_id uuid,p_creator_id uuid,p_series_id uuid,p_episode_assembly_id uuid,p_version integer,p_cast jsonb,p_plan jsonb,p_jobs jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_job_count integer;
begin
  if p_version<1 or jsonb_typeof(p_jobs)<>'array' or jsonb_array_length(p_jobs)<1 then raise exception 'INVALID_DIALOGUE_AUDIO_PAYLOAD'; end if;
  if not exists(select 1 from public.episode_assemblies ea where ea.id=p_episode_assembly_id and ea.series_id=p_series_id and ea.creator_id=p_creator_id and ea.status='READY')
    then raise exception 'EPISODE_ASSEMBLY_NOT_READY'; end if;

  select count(*) into v_job_count from jsonb_to_recordset(p_jobs) as x(id uuid);
  if v_job_count<>jsonb_array_length(p_jobs) then raise exception 'DIALOGUE_JOB_PAYLOAD_INVALID'; end if;

  begin
    insert into public.voice_casts(id,series_id,episode_assembly_id,creator_id,version,"cast")
    values(p_voice_cast_id,p_series_id,p_episode_assembly_id,p_creator_id,p_version,p_cast);

    insert into public.dialogue_audio_plans(id,series_id,episode_assembly_id,voice_cast_id,creator_id,version,status,plan)
    values(p_dialogue_plan_id,p_series_id,p_episode_assembly_id,p_voice_cast_id,p_creator_id,p_version,'GENERATING',p_plan);

    insert into public.dialogue_audio_generations(
      id,dialogue_plan_id,line_id,script_block_id,character_id,creator_id,status,provider,model,provider_voice_id,
      instruction_checksum,instruction_version,text_checksum,episode_start_seconds,visual_window_seconds
    )
    select x.id,p_dialogue_plan_id,x.line_id,x.script_block_id,x.character_id,p_creator_id,'PENDING',x.provider,x.model,x.provider_voice_id,
      x.instruction_checksum,x.instruction_version,x.text_checksum,x.episode_start_seconds,x.visual_window_seconds
    from jsonb_to_recordset(p_jobs) as x(
      id uuid,line_id uuid,script_block_id text,character_id text,provider text,model text,provider_voice_id text,
      instruction_checksum text,instruction_version text,text_checksum text,episode_start_seconds numeric,visual_window_seconds numeric
    );

    if (select count(*) from public.dialogue_audio_generations where dialogue_plan_id=p_dialogue_plan_id)<>jsonb_array_length(p_jobs)
      then raise exception 'DIALOGUE_JOB_COUNT_MISMATCH'; end if;
  exception when unique_violation then return false;
  end;
  return true;
end $$;
revoke all on function public.create_dialogue_audio_plan(uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb,jsonb) from public,authenticated;
grant execute on function public.create_dialogue_audio_plan(uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb,jsonb) to service_role;

create or replace function public.claim_next_dialogue_audio_generation(p_lease_seconds integer default 180)
returns table(id uuid,dialogue_plan_id uuid,line_id uuid,creator_id uuid,claim_token uuid,retry_count integer)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_claim uuid:=gen_random_uuid();
begin
  select j.id into v_id from public.dialogue_audio_generations j
  where j.status='PENDING' or (j.status='GENERATING' and j.lease_expires_at<now())
  order by j.created_at for update skip locked limit 1;
  if v_id is null then return; end if;
  update public.dialogue_audio_generations j set
    status='GENERATING',claim_token=v_claim,attempt_id=gen_random_uuid(),started_at=coalesce(j.started_at,now()),
    lease_expires_at=now()+make_interval(secs=>p_lease_seconds),sanitized_error_code=null,failed_at=null
  where j.id=v_id;
  return query select j.id,j.dialogue_plan_id,j.line_id,j.creator_id,j.claim_token,j.retry_count
  from public.dialogue_audio_generations j where j.id=v_id;
end $$;
revoke all on function public.claim_next_dialogue_audio_generation(integer) from public,authenticated;
grant execute on function public.claim_next_dialogue_audio_generation(integer) to service_role;

create or replace function public.renew_dialogue_audio_generation_lease(p_job_id uuid,p_claim_token uuid,p_lease_seconds integer default 180)
returns boolean language sql security definer set search_path='' as $$
 update public.dialogue_audio_generations set lease_expires_at=now()+make_interval(secs=>p_lease_seconds)
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning true
$$;
revoke all on function public.renew_dialogue_audio_generation_lease(uuid,uuid,integer) from public,authenticated;
grant execute on function public.renew_dialogue_audio_generation_lease(uuid,uuid,integer) to service_role;

create or replace function public.complete_dialogue_audio_generation(
 p_job_id uuid,p_claim_token uuid,p_storage_path text,p_asset_url text,p_output_duration_seconds numeric,p_sample_rate integer,p_channels integer,p_mime_type text,
 p_timing_difference_seconds numeric,p_timing_fit text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;v_total integer;v_completed integer;v_failed integer;v_active integer;
begin
 update public.dialogue_audio_generations set status='COMPLETED',storage_path=p_storage_path,asset_url=p_asset_url,mime_type=p_mime_type,
 output_duration_seconds=p_output_duration_seconds,sample_rate=p_sample_rate,channels=p_channels,timing_difference_seconds=p_timing_difference_seconds,timing_fit=p_timing_fit,
 completed_at=now(),lease_expires_at=null,claim_token=null,sanitized_error_code=null
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning dialogue_plan_id into v_plan;
 if v_plan is null then return false;end if;
 select count(*),count(*) filter(where status='COMPLETED'),count(*) filter(where status='FAILED'),count(*) filter(where status in('PENDING','GENERATING'))
 into v_total,v_completed,v_failed,v_active from public.dialogue_audio_generations where dialogue_plan_id=v_plan;
 update public.dialogue_audio_plans set status=case when v_active>0 then 'GENERATING' when v_failed=0 and v_completed=v_total then 'READY' when v_failed=v_total then 'FAILED' else 'PARTIAL' end where id=v_plan;
 return true;
end $$;
revoke all on function public.complete_dialogue_audio_generation(uuid,uuid,text,text,numeric,integer,integer,text,numeric,text) from public,authenticated;
grant execute on function public.complete_dialogue_audio_generation(uuid,uuid,text,text,numeric,integer,integer,text,numeric,text) to service_role;

create or replace function public.fail_dialogue_audio_generation(p_job_id uuid,p_claim_token uuid,p_error_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;v_total integer;v_completed integer;v_failed integer;v_active integer;
begin
 update public.dialogue_audio_generations set status='FAILED',sanitized_error_code=left(p_error_code,80),failed_at=now(),lease_expires_at=null,claim_token=null
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning dialogue_plan_id into v_plan;
 if v_plan is null then return false;end if;
 select count(*),count(*) filter(where status='COMPLETED'),count(*) filter(where status='FAILED'),count(*) filter(where status in('PENDING','GENERATING'))
 into v_total,v_completed,v_failed,v_active from public.dialogue_audio_generations where dialogue_plan_id=v_plan;
 update public.dialogue_audio_plans set status=case when v_active>0 then 'GENERATING' when v_failed=0 and v_completed=v_total then 'READY' when v_failed=v_total then 'FAILED' else 'PARTIAL' end where id=v_plan;
 return true;
end $$;
revoke all on function public.fail_dialogue_audio_generation(uuid,uuid,text) from public,authenticated;
grant execute on function public.fail_dialogue_audio_generation(uuid,uuid,text) to service_role;

create or replace function public.retry_dialogue_audio_generation(p_job_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_plan uuid;
begin
 update public.dialogue_audio_generations j set status='PENDING',retry_count=retry_count+1,sanitized_error_code=null,failed_at=null,
 started_at=null,completed_at=null,claim_token=null,lease_expires_at=null,attempt_id=null,storage_path=null,asset_url=null,mime_type=null,
 output_duration_seconds=null,sample_rate=null,channels=null,timing_difference_seconds=null,timing_fit='UNKNOWN'
 where j.id=p_job_id and j.creator_id=(select auth.uid()) and j.status='FAILED' and j.retry_count<3
 returning dialogue_plan_id into v_plan;
 if v_plan is null then return false;end if;
 update public.dialogue_audio_plans set status='GENERATING' where id=v_plan and creator_id=(select auth.uid());
 return true;
end $$;
revoke all on function public.retry_dialogue_audio_generation(uuid) from public;
grant execute on function public.retry_dialogue_audio_generation(uuid) to authenticated;

commit;
