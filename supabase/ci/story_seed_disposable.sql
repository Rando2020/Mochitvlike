\set ON_ERROR_STOP on
-- CI-only disposable PostgreSQL fixture. Never execute against a hosted project.
create role anon nologin;
create role authenticated nologin;
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
'select nullif(current_setting(''request.jwt.claim.sub'', true),'''')::uuid';
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;

create table public.series (
  id uuid primary key,
  creator_id uuid not null references auth.users(id),
  status text not null,
  blueprint jsonb not null
);
alter table public.series enable row level security;
create policy series_select_own on public.series for select to authenticated
  using (creator_id=(select auth.uid()));
grant select on public.series to authenticated;

insert into auth.users values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.series values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','DRAFT','{"cast":[{"id":"char_orin"}],"identity":{"title":"Original canonical show"}}'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','DRAFT','{"cast":[{"id":"char_other"}],"identity":{"title":"Second owner show"}}');

\ir ../migrations/20261018090000_story_seed_plans_v1.sql

create or replace function public.assert_test(v_ok boolean, v_case text) returns void
  language plpgsql as $$
begin if v_ok is distinct from true then raise exception 'TEST_FAIL: %',v_case; end if; end $$;

select public.assert_test(
  has_function_privilege('anon','public.save_story_seed_plan_v1(uuid,integer,uuid,jsonb,boolean)','EXECUTE')=false,
  'anonymous RPC grant removed'
);
select public.assert_test(
  has_table_privilege('authenticated','public.story_seed_plans','INSERT')=false
  and has_table_privilege('authenticated','public.story_seed_plans','UPDATE')=false
  and has_table_privilege('authenticated','public.story_seed_plans','DELETE')=false,
  'direct client mutations disallowed'
);
select public.assert_test(
  (select relrowsecurity from pg_class where oid='public.story_seed_plans'::regclass)=true,
  'RLS enabled'
);
select public.assert_test(
  (select count(*) from pg_policies where schemaname='public' and tablename='story_seed_plans')=1,
  'owner SELECT policy'
);

begin;
set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- Owner A creates first locked plot seed.
select public.assert_test(
 (select revision=1 from public.save_story_seed_plan_v1(
    '11111111-1111-4111-8111-111111111111',0,
    '10000000-0000-4000-8000-000000000001',
    '[{"id":"33333333-3333-4333-8333-333333333333","title":"Must happen","type":"ENDING","placement":"FINALE","characterId":"char_orin","locked":true,"setup":"","consequence":"","payoff":""}]',
    false)),
 'first creator save'
);
select public.assert_test(
  (select count(*)=1 from public.story_seed_plans)=true,'creator A can read own plan'
);
-- Same exact request must not increment revision.
select public.assert_test(
  (select revision=1 from public.save_story_seed_plan_v1(
    '11111111-1111-4111-8111-111111111111',0,
    '10000000-0000-4000-8000-000000000001',
    '[{"id":"33333333-3333-4333-8333-333333333333","title":"Must happen","type":"ENDING","placement":"FINALE","characterId":"char_orin","locked":true,"setup":"","consequence":"","payoff":""}]',
    false)),
 'exact lost-response retry'
);

do $$
begin
  begin
    perform * from public.save_story_seed_plan_v1(
      '11111111-1111-4111-8111-111111111111', 1,
      '10000000-0000-4000-8000-000000000002',
      '[]'::jsonb,false);
    raise exception 'FAIL missing lock gate';
  exception when others then
    if sqlerrm <> 'STORY_LOCKED_CHANGE_REQUIRES_REVIEW' then raise; end if;
  end;
  begin
    perform * from public.save_story_seed_plan_v1(
      '11111111-1111-4111-8111-111111111111', 1,
      '10000000-0000-4000-8000-000000000001',
      '[]'::jsonb,false);
    raise exception 'FAIL same id with different payload';
  exception when others then
    if sqlerrm <> 'STORY_REQUEST_REUSED' then raise; end if;
  end;
  begin
    perform * from public.save_story_seed_plan_v1(
      '11111111-1111-4111-8111-111111111111', 1,
      '10000000-0000-4000-8000-000000000005',
      '[{"id":"44444444-4444-4444-8444-444444444444","title":"Mismatch","type":"EVENT","placement":"OPENING","characterId":"char_other","locked":false,"setup":"","consequence":"","payoff":""}]'::jsonb,false);
    raise exception 'FAIL foreign character association';
  exception when others then
    if sqlerrm <> 'STORY_CHARACTER_MISMATCH' then raise; end if;
  end;
end $$;

-- Explicit acknowledgement allows planned revision without rewriting canonical series.
select public.assert_test(
 (select revision=2 from public.save_story_seed_plan_v1(
    '11111111-1111-4111-8111-111111111111',1,
    '10000000-0000-4000-8000-000000000003',
    '[]'::jsonb,true)),
 'creator-approved lock revision'
);

do $$
begin
  begin
    perform * from public.save_story_seed_plan_v1(
      '11111111-1111-4111-8111-111111111111', 1,
      '10000000-0000-4000-8000-000000000004',
      '[]'::jsonb,true);
    raise exception 'FAIL stale update accepted';
  exception when others then
    if sqlerrm <> 'STORY_REVISION_CONFLICT' then raise; end if;
  end;
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select public.assert_test((select count(*)=0 from public.story_seed_plans),
    'owner B cannot read owner A story plan');
do $$
begin
  begin
    perform * from public.save_story_seed_plan_v1(
      '11111111-1111-4111-8111-111111111111',0,
      '20000000-0000-4000-8000-000000000001','[]'::jsonb,false);
    raise exception 'FAIL cross-owner write allowed';
  exception when others then
    if sqlerrm <> 'STORY_SERIES_NOT_FOUND' then raise; end if;
  end;
end $$;

select public.assert_test(
 (select revision=1 from public.save_story_seed_plan_v1(
   '22222222-2222-4222-8222-222222222222',0,
   '20000000-0000-4000-8000-000000000002',
   '[]'::jsonb,false)),
 'owner B can save own story'
);
commit;

-- Test archiving a series without exposing any creator record.
update public.series set status='ARCHIVED' where id='11111111-1111-4111-8111-111111111111';
begin;
set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  begin
    perform * from public.save_story_seed_plan_v1(
      '11111111-1111-4111-8111-111111111111',2,
      '10000000-0000-4000-8000-000000000006','[]'::jsonb,false);
    raise exception 'FAIL archived write accepted';
  exception when others then
    if sqlerrm <> 'STORY_SERIES_NOT_FOUND' then raise; end if;
  end;
end $$;
commit;

select public.assert_test(
 (select blueprint->'identity'->>'title' = 'Original canonical show'
  from public.series where id='11111111-1111-4111-8111-111111111111'),
 'series blueprint unchanged');
select 'PASS story seed isolated SQL: 2 owner RLS, RPC boundary, revision CAS, retry, locks, archived, canon' as verdict;
