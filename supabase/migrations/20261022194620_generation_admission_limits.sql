-- Only server credentials can reserve paid generation capacity.
create table public.generation_admissions (
  id uuid primary key,
  creator_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 minutes'),
  finished_at timestamptz
);
create index generation_admissions_started on public.generation_admissions(started_at);
alter table public.generation_admissions enable row level security;
revoke all on public.generation_admissions from public, anon, authenticated;
grant select, insert, update, delete on public.generation_admissions to service_role;

create function public.reserve_generation(p_creator_id uuid, p_id uuid)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  -- Global transaction lock makes count + insert atomic across serverless instances.
  perform pg_advisory_xact_lock(74219022026::bigint);
  delete from public.generation_admissions where started_at < now() - interval '2 days';
  if exists (select 1 from public.generation_admissions where creator_id = p_creator_id
      and finished_at is null and expires_at > now()) then return 'CONCURRENT'; end if;
  if (select count(*) from public.generation_admissions where creator_id = p_creator_id
      and started_at > now() - interval '1 hour') >= 3 then return 'USER_LIMIT'; end if;
  if (select count(*) from public.generation_admissions where started_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') >= 20 then return 'GLOBAL_LIMIT'; end if;
  insert into public.generation_admissions(id, creator_id) values (p_id, p_creator_id);
  return 'ACCEPTED';
end;
$$;
revoke all on function public.reserve_generation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_generation(uuid, uuid) to service_role;
