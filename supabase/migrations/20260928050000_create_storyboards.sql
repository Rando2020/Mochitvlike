begin;

create table if not exists public.storyboards (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  scene_id uuid not null references public.series_scenes(id) on delete cascade,
  script_id uuid not null references public.scene_scripts(id) on delete cascade,
  visual_plan_id uuid not null references public.scene_visual_plans(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version >= 1),
  status text not null default 'DRAFT' check (status in ('DRAFT','GENERATING','READY','PARTIAL','FAILED','ARCHIVED')),
  blueprint jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique (visual_plan_id, version)
);

create table if not exists public.storyboard_panel_generations (
  id uuid primary key default gen_random_uuid(),
  storyboard_id uuid not null references public.storyboards(id) on delete cascade,
  panel_id uuid not null,
  creator_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','GENERATING','COMPLETED','FAILED')),
  prompt_checksum text not null,
  prompt_version text not null,
  provider text not null,
  model text not null,
  storage_path text null,
  asset_url text null,
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
  unique (storyboard_id, panel_id)
);

create index if not exists storyboards_creator_visual_plan_idx on public.storyboards(creator_id,visual_plan_id);
create index if not exists storyboard_panel_generations_queue_idx on public.storyboard_panel_generations(status,lease_expires_at,created_at);
create index if not exists storyboard_panel_generations_storyboard_idx on public.storyboard_panel_generations(storyboard_id);

create or replace function public.touch_storyboard_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists storyboards_touch on public.storyboards;
create trigger storyboards_touch before update on public.storyboards for each row execute function public.touch_storyboard_updated_at();
drop trigger if exists storyboard_panel_generations_touch on public.storyboard_panel_generations;
create trigger storyboard_panel_generations_touch before update on public.storyboard_panel_generations for each row execute function public.touch_storyboard_updated_at();

alter table public.storyboards enable row level security;
alter table public.storyboard_panel_generations enable row level security;

create policy "storyboards_select_own" on public.storyboards for select to authenticated using (
 creator_id=(select auth.uid())
 and exists(select 1 from public.series s where s.id=series_id and s.creator_id=(select auth.uid()))
 and exists(select 1 from public.series_scenes sc where sc.id=scene_id and sc.series_id=series_id and sc.creator_id=(select auth.uid()))
 and exists(select 1 from public.scene_scripts ss where ss.id=script_id and ss.scene_id=scene_id and ss.series_id=series_id and ss.creator_id=(select auth.uid()))
 and exists(select 1 from public.scene_visual_plans vp where vp.id=visual_plan_id and vp.script_id=script_id and vp.scene_id=scene_id and vp.series_id=series_id and vp.creator_id=(select auth.uid()))
);
create policy "storyboards_insert_own" on public.storyboards for insert to authenticated with check (
 creator_id=(select auth.uid())
 and exists(select 1 from public.scene_visual_plans vp where vp.id=visual_plan_id and vp.script_id=script_id and vp.scene_id=scene_id and vp.series_id=series_id and vp.creator_id=(select auth.uid()))
);
create policy "storyboards_update_own" on public.storyboards for update to authenticated using (creator_id=(select auth.uid())) with check (
 creator_id=(select auth.uid())
 and exists(select 1 from public.scene_visual_plans vp where vp.id=visual_plan_id and vp.script_id=script_id and vp.scene_id=scene_id and vp.series_id=series_id and vp.creator_id=(select auth.uid()))
);
create policy "storyboards_delete_own" on public.storyboards for delete to authenticated using (creator_id=(select auth.uid()));

create policy "storyboard_jobs_select_own" on public.storyboard_panel_generations for select to authenticated using (
 creator_id=(select auth.uid())
 and exists(select 1 from public.storyboards sb where sb.id=storyboard_id and sb.creator_id=(select auth.uid()))
);

grant select,insert,update,delete on public.storyboards to authenticated;
grant select on public.storyboard_panel_generations to authenticated;

insert into storage.buckets(id,name,public)
values('storyboard-panels','storyboard-panels',true)
on conflict(id) do update set public=true;

create or replace function public.claim_next_storyboard_panel_generation(p_lease_seconds integer default 120)
returns table(id uuid,storyboard_id uuid,panel_id uuid,creator_id uuid,claim_token uuid,retry_count integer)
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_claim uuid:=gen_random_uuid();
begin
 select j.id into v_id
 from public.storyboard_panel_generations j
 where j.status='PENDING' or (j.status='GENERATING' and j.lease_expires_at < now())
 order by j.created_at for update skip locked limit 1;
 if v_id is null then return; end if;
 update public.storyboard_panel_generations j
 set status='GENERATING',claim_token=v_claim,attempt_id=gen_random_uuid(),
     started_at=coalesce(j.started_at,now()),lease_expires_at=now()+make_interval(secs=>p_lease_seconds),
     sanitized_error_code=null,failed_at=null
 where j.id=v_id;
 return query select j.id,j.storyboard_id,j.panel_id,j.creator_id,j.claim_token,j.retry_count
 from public.storyboard_panel_generations j where j.id=v_id;
end $$;
revoke all on function public.claim_next_storyboard_panel_generation(integer) from public,authenticated;
grant execute on function public.claim_next_storyboard_panel_generation(integer) to service_role;

create or replace function public.renew_storyboard_panel_generation_lease(p_job_id uuid,p_claim_token uuid,p_lease_seconds integer default 120)
returns boolean language sql security definer set search_path='' as $$
 update public.storyboard_panel_generations set lease_expires_at=now()+make_interval(secs=>p_lease_seconds)
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning true
$$;
revoke all on function public.renew_storyboard_panel_generation_lease(uuid,uuid,integer) from public,authenticated;
grant execute on function public.renew_storyboard_panel_generation_lease(uuid,uuid,integer) to service_role;

create or replace function public.complete_storyboard_panel_generation(p_job_id uuid,p_claim_token uuid,p_storage_path text,p_asset_url text,p_width integer,p_height integer,p_mime_type text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_storyboard uuid; v_completed integer; v_failed integer; v_total integer;
begin
 update public.storyboard_panel_generations
 set status='COMPLETED',storage_path=p_storage_path,asset_url=p_asset_url,width=p_width,height=p_height,mime_type=p_mime_type,
     completed_at=now(),lease_expires_at=null,claim_token=null,sanitized_error_code=null
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning storyboard_id into v_storyboard;
 if v_storyboard is null then return false; end if;
 select count(*),count(*) filter(where status='COMPLETED'),count(*) filter(where status='FAILED')
 into v_total,v_completed,v_failed from public.storyboard_panel_generations where storyboard_id=v_storyboard;
 update public.storyboards set status=case when v_completed=v_total then 'READY'
   when v_failed>0 and v_completed>0 and v_completed+v_failed=v_total then 'PARTIAL'
   when v_failed=v_total then 'FAILED' else 'GENERATING' end where id=v_storyboard;
 return true;
end $$;
revoke all on function public.complete_storyboard_panel_generation(uuid,uuid,text,text,integer,integer,text) from public,authenticated;
grant execute on function public.complete_storyboard_panel_generation(uuid,uuid,text,text,integer,integer,text) to service_role;

create or replace function public.fail_storyboard_panel_generation(p_job_id uuid,p_claim_token uuid,p_error_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_storyboard uuid; v_completed integer; v_failed integer; v_total integer;
begin
 update public.storyboard_panel_generations
 set status='FAILED',sanitized_error_code=left(p_error_code,80),failed_at=now(),lease_expires_at=null,claim_token=null
 where id=p_job_id and status='GENERATING' and claim_token=p_claim_token returning storyboard_id into v_storyboard;
 if v_storyboard is null then return false; end if;
 select count(*),count(*) filter(where status='COMPLETED'),count(*) filter(where status='FAILED')
 into v_total,v_completed,v_failed from public.storyboard_panel_generations where storyboard_id=v_storyboard;
 update public.storyboards set status=case when v_failed=v_total then 'FAILED'
   when v_completed+v_failed=v_total and v_completed>0 then 'PARTIAL' else 'GENERATING' end where id=v_storyboard;
 return true;
end $$;
revoke all on function public.fail_storyboard_panel_generation(uuid,uuid,text) from public,authenticated;
grant execute on function public.fail_storyboard_panel_generation(uuid,uuid,text) to service_role;

create or replace function public.retry_storyboard_panel_generation(p_job_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_storyboard uuid;
begin
 update public.storyboard_panel_generations j
 set status='PENDING',retry_count=retry_count+1,sanitized_error_code=null,failed_at=null,started_at=null,completed_at=null,claim_token=null,lease_expires_at=null,attempt_id=null
 where j.id=p_job_id and j.creator_id=(select auth.uid()) and j.status='FAILED' and j.retry_count<3
 returning storyboard_id into v_storyboard;
 if v_storyboard is null then return false; end if;
 update public.storyboards set status='GENERATING' where id=v_storyboard and creator_id=(select auth.uid());
 return true;
end $$;
grant execute on function public.retry_storyboard_panel_generation(uuid) to authenticated;

commit;