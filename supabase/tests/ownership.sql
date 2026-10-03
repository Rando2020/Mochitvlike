begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
insert into auth.users(id, email) values
 ('11111111-1111-4111-8111-111111111111', 'owner@example.invalid'),
 ('22222222-2222-4222-8222-222222222222', 'other@example.invalid');
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select lives_ok($$insert into public.series(id, creator_id, title, blueprint, blueprint_schema_version, generation_source)
values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Smoke', '{}', '1.0', 'fallback')$$, 'Owner can save a project');
select is((select count(*) from public.series), 1::bigint, 'Owner can reload saved project');
select ok(not has_function_privilege('authenticated', 'public.claim_next_storyboard_panel_generation(integer)', 'EXECUTE'), 'Creator cannot claim worker jobs');
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*) from public.series), 0::bigint, 'Another creator cannot read the project');
select throws_ok($$insert into public.series(creator_id, title, blueprint, blueprint_schema_version, generation_source)
values ('11111111-1111-4111-8111-111111111111','Forbidden', '{}', '1.0', 'fallback')$$,
 '42501', 'new row violates row-level security policy for table "series"', 'Another creator cannot write under owner identity');
reset role;
select * from finish();
rollback;
