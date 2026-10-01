begin;

create table if not exists public.production_reference_assets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  type text not null check (type in ('CHARACTER','STYLE','LOCATION','POSE','DEPTH','LINEART','ABILITY','PROP')),
  asset_url text not null,
  checksum text not null check (checksum ~ '^[0-9a-fA-F]{64}$'),
  source text not null check (source in ('OWNED','COMMISSIONED','LICENSED','OPT_IN','PUBLIC_DOMAIN','SYNTHETIC')),
  approved boolean not null default false,
  benchmark_only boolean not null default false,
  creator_approved boolean not null default false,
  character_id text null,
  ability_id text null,
  model_compatibility jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (not benchmark_only or approved = false)
);
create index if not exists production_reference_assets_series_idx on public.production_reference_assets(series_id,creator_id);

create table if not exists public.character_performance_bibles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  character_id text not null,
  version integer not null check (version > 0),
  bible jsonb not null,
  created_at timestamptz not null default now(),
  unique(series_id,character_id,version)
);
create index if not exists character_performance_bibles_series_idx on public.character_performance_bibles(series_id,creator_id);

create table if not exists public.production_frame_performance_bindings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  storyboard_id uuid not null references public.storyboards(id) on delete cascade,
  storyboard_panel_id uuid not null,
  character_id text not null,
  action_pattern_id text null,
  signature_action_id text null,
  ability_id text null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(action_pattern_id,signature_action_id,ability_id) between 1 and 1),
  unique(storyboard_id,storyboard_panel_id,character_id)
);

create table if not exists public.production_frames (
  id uuid primary key,
  creator_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  scene_id uuid not null references public.series_scenes(id) on delete cascade,
  script_id uuid not null references public.scene_scripts(id) on delete cascade,
  visual_plan_id uuid not null references public.scene_visual_plans(id) on delete cascade,
  storyboard_id uuid not null references public.storyboards(id) on delete cascade,
  storyboard_panel_id uuid not null,
  version integer not null check (version > 0),
  status text not null default 'GENERATING' check (status in ('DRAFT','GENERATING','READY','FAILED','ARCHIVED')),
  selected_generation_id uuid null,
  development_visual boolean not null default false,
  model_id text not null,
  model_revision text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storyboard_panel_id,version)
);
create index if not exists production_frames_storyboard_idx on public.production_frames(storyboard_id,creator_id);
create index if not exists production_frames_panel_idx on public.production_frames(storyboard_panel_id,version desc);

create table if not exists public.production_frame_generations (
  id uuid primary key,
  production_frame_id uuid not null references public.production_frames(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model_id text not null,
  model_revision text not null,
  architecture text not null check (architecture in ('SDXL','SD3','FLUX','OTHER')),
  spec jsonb not null,
  spec_checksum text not null check (spec_checksum ~ '^[0-9a-fA-F]{64}$'),
  prompt_checksum text not null check (prompt_checksum ~ '^[0-9a-fA-F]{64}$'),
  seed bigint not null check (seed >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','GENERATING','COMPLETED','FAILED','SUPERSEDED')),
  attempt_id uuid null,
  claim_token uuid null,
  lease_expires_at timestamptz null,
  heartbeat_at timestamptz null,
  retry_count integer not null default 0 check (retry_count between 0 and 3),
  error_code text null,
  output_url text null,
  storage_path text null,
  mime_type text null,
  width integer null,
  height integer null,
  output_checksum text null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  failed_at timestamptz null
);
alter table public.production_frames drop constraint if exists production_frames_selected_generation_fk;
alter table public.production_frames add constraint production_frames_selected_generation_fk foreign key(selected_generation_id) references public.production_frame_generations(id) on delete set null;
create index if not exists production_frame_generations_queue_idx on public.production_frame_generations(status,lease_expires_at,created_at);

insert into storage.buckets(id,name,public) values ('production-frames','production-frames',true)
on conflict(id) do update set public=excluded.public;

alter table public.production_reference_assets enable row level security;
alter table public.character_performance_bibles enable row level security;
alter table public.production_frame_performance_bindings enable row level security;
alter table public.production_frames enable row level security;
alter table public.production_frame_generations enable row level security;

drop policy if exists "production_refs_select_own" on public.production_reference_assets;
create policy "production_refs_select_own" on public.production_reference_assets for select to authenticated using ((select auth.uid())=creator_id);
drop policy if exists "performance_bibles_select_own" on public.character_performance_bibles;
create policy "performance_bibles_select_own" on public.character_performance_bibles for select to authenticated using ((select auth.uid())=creator_id);
drop policy if exists "frame_bindings_select_own" on public.production_frame_performance_bindings;
create policy "frame_bindings_select_own" on public.production_frame_performance_bindings for select to authenticated using ((select auth.uid())=creator_id);
drop policy if exists "production_frames_select_own" on public.production_frames;
create policy "production_frames_select_own" on public.production_frames for select to authenticated using ((select auth.uid())=creator_id);
drop policy if exists "production_generations_select_own" on public.production_frame_generations;
create policy "production_generations_select_own" on public.production_frame_generations for select to authenticated using ((select auth.uid())=creator_id);

grant select on public.production_reference_assets,public.character_performance_bibles,public.production_frame_performance_bindings,public.production_frames,public.production_frame_generations to authenticated;
revoke insert,update,delete on public.production_reference_assets,public.character_performance_bibles,public.production_frame_performance_bindings,public.production_frames,public.production_frame_generations from authenticated;

create or replace function public.create_production_frame_with_generation(
 p_frame_id uuid,p_generation_id uuid,p_creator_id uuid,p_series_id uuid,p_scene_id uuid,p_script_id uuid,p_visual_plan_id uuid,p_storyboard_id uuid,p_panel_id uuid,
 p_version integer,p_development_visual boolean,p_model_id text,p_model_revision text,p_provider text,p_architecture text,p_spec jsonb,p_spec_checksum text,p_prompt_checksum text,p_seed bigint
) returns boolean
language plpgsql security definer set search_path=''
as $$
begin
 if not exists(
  select 1 from public.storyboards s
  where s.id=p_storyboard_id and s.creator_id=p_creator_id and s.series_id=p_series_id and s.scene_id=p_scene_id and s.script_id=p_script_id and s.visual_plan_id=p_visual_plan_id
 ) then raise exception 'PRODUCTION_FRAME_PARENT_NOT_FOUND'; end if;
 begin
  insert into public.production_frames(id,creator_id,series_id,scene_id,script_id,visual_plan_id,storyboard_id,storyboard_panel_id,version,status,development_visual,model_id,model_revision)
  values(p_frame_id,p_creator_id,p_series_id,p_scene_id,p_script_id,p_visual_plan_id,p_storyboard_id,p_panel_id,p_version,'GENERATING',p_development_visual,p_model_id,p_model_revision);
  insert into public.production_frame_generations(id,production_frame_id,creator_id,provider,model_id,model_revision,architecture,spec,spec_checksum,prompt_checksum,seed,status)
  values(p_generation_id,p_frame_id,p_creator_id,p_provider,p_model_id,p_model_revision,p_architecture,p_spec,p_spec_checksum,p_prompt_checksum,p_seed,'PENDING');
 exception when unique_violation then return false;
 end;
 return true;
end; $$;
revoke all on function public.create_production_frame_with_generation(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,boolean,text,text,text,text,jsonb,text,text,bigint) from public,authenticated;
grant execute on function public.create_production_frame_with_generation(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,boolean,text,text,text,text,jsonb,text,text,bigint) to service_role;

create or replace function public.claim_next_production_frame_generation(p_lease_seconds integer default 180)
returns table(id uuid,claim_token uuid)
language plpgsql security definer set search_path=''
as $$
declare v_id uuid;v_token uuid:=gen_random_uuid();
begin
 select g.id into v_id from public.production_frame_generations g
 where g.status='PENDING' or (g.status='GENERATING' and g.lease_expires_at<now())
 order by g.created_at for update skip locked limit 1;
 if v_id is null then return; end if;
 update public.production_frame_generations set status='GENERATING',claim_token=v_token,attempt_id=gen_random_uuid(),lease_expires_at=now()+make_interval(secs=>greatest(30,p_lease_seconds)),heartbeat_at=now(),started_at=coalesce(started_at,now())
 where production_frame_generations.id=v_id;
 return query select v_id,v_token;
end; $$;
revoke all on function public.claim_next_production_frame_generation(integer) from public,authenticated;
grant execute on function public.claim_next_production_frame_generation(integer) to service_role;

create or replace function public.renew_production_frame_generation_lease(p_job_id uuid,p_claim_token uuid,p_lease_seconds integer default 180)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 update public.production_frame_generations set lease_expires_at=now()+make_interval(secs=>greatest(30,p_lease_seconds)),heartbeat_at=now()
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token;
 return found;
end; $$;
revoke all on function public.renew_production_frame_generation_lease(uuid,uuid,integer) from public,authenticated;
grant execute on function public.renew_production_frame_generation_lease(uuid,uuid,integer) to service_role;

create or replace function public.complete_production_frame_generation(
 p_job_id uuid,p_claim_token uuid,p_storage_path text,p_output_url text,p_mime_type text,p_width integer,p_height integer,p_output_checksum text
) returns boolean language plpgsql security definer set search_path=''
as $$
declare v_frame uuid;
begin
 update public.production_frame_generations set status='COMPLETED',storage_path=p_storage_path,output_url=p_output_url,mime_type=p_mime_type,width=p_width,height=p_height,output_checksum=p_output_checksum,completed_at=now(),lease_expires_at=null,heartbeat_at=now()
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning production_frame_id into v_frame;
 if v_frame is null then return false; end if;
 update public.production_frames set status='READY',selected_generation_id=p_job_id,updated_at=now() where id=v_frame;
 return true;
end; $$;
revoke all on function public.complete_production_frame_generation(uuid,uuid,text,text,text,integer,integer,text) from public,authenticated;
grant execute on function public.complete_production_frame_generation(uuid,uuid,text,text,text,integer,integer,text) to service_role;

create or replace function public.fail_production_frame_generation(p_job_id uuid,p_claim_token uuid,p_error_code text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_frame uuid;
begin
 update public.production_frame_generations set status='FAILED',error_code=left(p_error_code,80),failed_at=now(),lease_expires_at=null,heartbeat_at=now()
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning production_frame_id into v_frame;
 if v_frame is null then return false; end if;
 update public.production_frames set status='FAILED',updated_at=now() where id=v_frame;
 return true;
end; $$;
revoke all on function public.fail_production_frame_generation(uuid,uuid,text) from public,authenticated;
grant execute on function public.fail_production_frame_generation(uuid,uuid,text) to service_role;

create or replace function public.retry_production_frame_generation(p_job_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_frame uuid;
begin
 update public.production_frame_generations g set status='PENDING',retry_count=retry_count+1,error_code=null,claim_token=null,attempt_id=null,lease_expires_at=null,failed_at=null
 where g.id=p_job_id and g.status='FAILED' and g.retry_count<3 and g.creator_id=(select auth.uid()) returning production_frame_id into v_frame;
 if v_frame is null then return false; end if;
 update public.production_frames set status='GENERATING',updated_at=now() where id=v_frame and creator_id=(select auth.uid());
 return true;
end; $$;
revoke all on function public.retry_production_frame_generation(uuid) from public;
grant execute on function public.retry_production_frame_generation(uuid) to authenticated;

commit;
