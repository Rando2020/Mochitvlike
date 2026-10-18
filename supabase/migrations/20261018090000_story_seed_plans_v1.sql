begin;

-- Isolated authoring state: never modify the approved SeriesBlueprint or prior media artifacts.
create table public.story_seed_plans (
  series_id uuid primary key references public.series(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  seeds jsonb not null default '[]'::jsonb
    check (jsonb_typeof(seeds) = 'array' and jsonb_array_length(seeds) <= 60),
  last_request_id uuid not null,
  updated_at timestamptz not null default now()
);
create index story_seed_plans_creator_idx on public.story_seed_plans(creator_id, updated_at desc);
alter table public.story_seed_plans enable row level security;
create policy "story_seed_plans_select_own" on public.story_seed_plans
  for select to authenticated
  using (
    creator_id = (select auth.uid())
    and exists (select 1 from public.series s
      where s.id = story_seed_plans.series_id and s.creator_id = (select auth.uid()))
  );
revoke all on public.story_seed_plans from public, anon, authenticated;
grant select on public.story_seed_plans to authenticated;

-- RLS only exposes reads. A privileged atomic writer lives in a private,
-- non-PostgREST schema. Keep all pre-existing PUBLIC security-definer
-- routine expectations intact and prevent accidental API exposure.
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;
create or replace function app_private.save_story_seed_plan_checked_v1(
  p_series_id uuid,
  p_expected_revision integer,
  p_request_id uuid,
  p_seeds jsonb,
  p_acknowledge_locked_change boolean default false
)
returns table(revision integer, seeds jsonb, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_blueprint jsonb;
  v_existing public.story_seed_plans%rowtype;
  v_seed jsonb;
  v_previous jsonb;
  v_ids text[] := array[]::text[];
  v_character_id text;
begin
  if v_user is null then raise exception 'STORY_NOT_AUTHENTICATED'; end if;
  if p_request_id is null or p_expected_revision < 0 or p_expected_revision is null then
    raise exception 'STORY_INVALID_INPUT';
  end if;

  -- Lock owning series so archive/blueprint edits and plan changes cannot race.
  select s.blueprint into v_blueprint from public.series s
  where s.id = p_series_id and s.creator_id = v_user and s.status <> 'ARCHIVED'
  for update;
  if not found then raise exception 'STORY_SERIES_NOT_FOUND'; end if;

  if p_seeds is null or jsonb_typeof(p_seeds) is distinct from 'array'
     or jsonb_array_length(p_seeds) > 60 then
    raise exception 'STORY_INVALID_INPUT';
  end if;

  for v_seed in select value from jsonb_array_elements(p_seeds) loop
    if jsonb_typeof(v_seed) is distinct from 'object'
       or jsonb_typeof(v_seed->'id') is distinct from 'string'
       or jsonb_typeof(v_seed->'title') is distinct from 'string'
       or jsonb_typeof(v_seed->'characterId') is distinct from 'string'
       or jsonb_typeof(v_seed->'type') is distinct from 'string'
       or jsonb_typeof(v_seed->'placement') is distinct from 'string'
       or jsonb_typeof(v_seed->'locked') is distinct from 'boolean'
       or jsonb_typeof(v_seed->'setup') is distinct from 'string'
       or jsonb_typeof(v_seed->'consequence') is distinct from 'string'
       or jsonb_typeof(v_seed->'payoff') is distinct from 'string'
       or (select count(*) from jsonb_object_keys(v_seed)) <> 9
    then raise exception 'STORY_INVALID_INPUT'; end if;
    if (v_seed->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or v_seed->>'id' = any(v_ids)
       or char_length(btrim(v_seed->>'title')) not between 1 and 240
       or char_length(v_seed->>'setup') > 600
       or char_length(v_seed->>'consequence') > 600
       or char_length(v_seed->>'payoff') > 600
       or v_seed->>'type' not in ('EVENT','REVEAL','RELATIONSHIP','ENDING')
       or v_seed->>'placement' not in ('OPENING','MIDPOINT','FINALE','UNPLACED')
    then raise exception 'STORY_INVALID_INPUT'; end if;
    v_ids := array_append(v_ids,v_seed->>'id');
    v_character_id := v_seed->>'characterId';
    if not exists (
      select 1 from jsonb_array_elements(v_blueprint->'cast') c
      where c->>'id' = v_character_id
    ) then raise exception 'STORY_CHARACTER_MISMATCH'; end if;
  end loop;

  select * into v_existing from public.story_seed_plans p
  where p.series_id = p_series_id for update;

  if found then
    if v_existing.last_request_id = p_request_id then
      if v_existing.seeds <> p_seeds then raise exception 'STORY_REQUEST_REUSED'; end if;
      return query select v_existing.revision, v_existing.seeds, v_existing.updated_at;
      return;
    end if;
    if v_existing.revision <> p_expected_revision then
      raise exception 'STORY_REVISION_CONFLICT';
    end if;
    if not coalesce(p_acknowledge_locked_change,false) then
      for v_previous in select value from jsonb_array_elements(v_existing.seeds)
        where value->>'locked' = 'true'
      loop
        if not exists (
          select 1 from jsonb_array_elements(p_seeds) newer
          where newer->>'id' = v_previous->>'id' and newer = v_previous
        ) then raise exception 'STORY_LOCKED_CHANGE_REQUIRES_REVIEW'; end if;
      end loop;
    end if;
    update public.story_seed_plans p
      set seeds=p_seeds, revision=p.revision+1, last_request_id=p_request_id, updated_at=now()
    where p.series_id=p_series_id
    returning p.revision,p.seeds,p.updated_at into v_existing.revision,v_existing.seeds,v_existing.updated_at;
  else
    if p_expected_revision <> 0 then raise exception 'STORY_REVISION_CONFLICT'; end if;
    insert into public.story_seed_plans(series_id,creator_id,seeds,revision,last_request_id)
      values (p_series_id,v_user,p_seeds,1,p_request_id)
    returning story_seed_plans.revision,story_seed_plans.seeds,story_seed_plans.updated_at
      into v_existing.revision,v_existing.seeds,v_existing.updated_at;
  end if;

  return query select v_existing.revision, v_existing.seeds, v_existing.updated_at;
end;
$$;
revoke all on function app_private.save_story_seed_plan_checked_v1(uuid,integer,uuid,jsonb,boolean) from public, anon;
grant execute on function app_private.save_story_seed_plan_checked_v1(uuid,integer,uuid,jsonb,boolean) to authenticated;

-- The public RPC runs as the caller and can invoke only the guarded private
-- writer, which verifies auth.uid(), series ownership, row state and payload.
create or replace function public.save_story_seed_plan_v1(
  p_series_id uuid,
  p_expected_revision integer,
  p_request_id uuid,
  p_seeds jsonb,
  p_acknowledge_locked_change boolean default false
)
returns table(revision integer, seeds jsonb, updated_at timestamptz)
language sql security invoker set search_path = ''
as $sql$
  select * from app_private.save_story_seed_plan_checked_v1($1,$2,$3,$4,$5);
$sql$;
revoke all on function public.save_story_seed_plan_v1(uuid,integer,uuid,jsonb,boolean) from public, anon;
grant execute on function public.save_story_seed_plan_v1(uuid,integer,uuid,jsonb,boolean) to authenticated;

commit;
