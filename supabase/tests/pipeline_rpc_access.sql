begin;
create temporary table pipeline_rpc_access (routine regprocedure, intended_role text);
insert into pipeline_rpc_access values
('public.claim_next_storyboard_panel_generation(integer)'::regprocedure, 'service_role'),
('public.renew_storyboard_panel_generation_lease(uuid,uuid,integer)'::regprocedure, 'service_role'),
('public.complete_storyboard_panel_generation(uuid,uuid,text,text,integer,integer,text)'::regprocedure, 'service_role'),
('public.fail_storyboard_panel_generation(uuid,uuid,text)'::regprocedure, 'service_role'),
('public.retry_storyboard_panel_generation(uuid)'::regprocedure, 'authenticated'),
('public.create_storyboard_with_panel_jobs(uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb)'::regprocedure, 'service_role'),
('public.create_scene_animatic(uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb)'::regprocedure, 'service_role'),
('public.create_motion_plan_with_jobs(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb)'::regprocedure, 'service_role'),
('public.claim_next_motion_clip_generation(integer)'::regprocedure, 'service_role'),
('public.renew_motion_clip_generation_lease(uuid,uuid,integer)'::regprocedure, 'service_role'),
('public.set_motion_provider_task(uuid,uuid,text)'::regprocedure, 'service_role'),
('public.complete_motion_clip_generation(uuid,uuid,text,text,numeric,integer,integer,text)'::regprocedure, 'service_role'),
('public.fail_motion_clip_generation(uuid,uuid,text)'::regprocedure, 'service_role'),
('public.retry_motion_clip_generation(uuid)'::regprocedure, 'authenticated'),
('public.create_episode_assembly(uuid,uuid,uuid,text,integer,jsonb,jsonb)'::regprocedure, 'service_role'),
('public.create_dialogue_audio_plan(uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb,jsonb)'::regprocedure, 'service_role'),
('public.claim_next_dialogue_audio_generation(integer)'::regprocedure, 'service_role'),
('public.renew_dialogue_audio_generation_lease(uuid,uuid,integer)'::regprocedure, 'service_role'),
('public.complete_dialogue_audio_generation(uuid,uuid,text,text,numeric,integer,integer,text,numeric,text)'::regprocedure, 'service_role'),
('public.fail_dialogue_audio_generation(uuid,uuid,text)'::regprocedure, 'service_role'),
('public.retry_dialogue_audio_generation(uuid)'::regprocedure, 'authenticated'),
('public.create_sound_design_plan(uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb)'::regprocedure, 'service_role'),
('public.claim_next_sound_generation(integer)'::regprocedure, 'service_role'),
('public.renew_sound_generation_lease(uuid,uuid,integer)'::regprocedure, 'service_role'),
('public.complete_sound_generation(uuid,uuid,text,text,text,numeric,text)'::regprocedure, 'service_role'),
('public.fail_sound_generation(uuid,uuid,text)'::regprocedure, 'service_role'),
('public.retry_sound_generation(uuid)'::regprocedure, 'authenticated'),
('public.create_production_frame_with_generation(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,boolean,text,text,text,text,jsonb,text,text,bigint)'::regprocedure, 'service_role'),
('public.claim_next_production_frame_generation(integer)'::regprocedure, 'service_role'),
('public.renew_production_frame_generation_lease(uuid,uuid,integer)'::regprocedure, 'service_role'),
('public.complete_production_frame_generation(uuid,uuid,text,text,text,integer,integer,text)'::regprocedure, 'service_role'),
('public.fail_production_frame_generation(uuid,uuid,text)'::regprocedure, 'service_role'),
('public.retry_production_frame_generation(uuid)'::regprocedure, 'authenticated');
-- Reproduce hosted default privileges, which the disposable CLI database does not apply.
do $$ declare r record; begin
 for r in select routine from pipeline_rpc_access loop
  execute format('grant execute on function %s to anon',r.routine);
 end loop;
end $$;
\ir ../migrations/20261004003600_revoke_anonymous_pipeline_execution.sql
select plan(5);
select is((select count(*)::integer from pipeline_rpc_access),33,'all pipeline RPCs covered');
select is((select count(*)::integer from pipeline_rpc_access where has_function_privilege('anon',routine,'EXECUTE')),0,'anonymous callers cannot execute pipeline RPCs');
select is((select count(*)::integer from pipeline_rpc_access where intended_role='service_role' and has_function_privilege('authenticated',routine,'EXECUTE')),0,'creator cannot execute worker RPCs');
select is((select count(*)::integer from pipeline_rpc_access where intended_role='authenticated' and has_function_privilege('authenticated',routine,'EXECUTE')),5,'owner checked retries retain creator access');
select is((select count(*)::integer from pipeline_rpc_access where has_function_privilege('service_role',routine,'EXECUTE')),33,'server retains all pipeline access');
select * from finish();
rollback;
