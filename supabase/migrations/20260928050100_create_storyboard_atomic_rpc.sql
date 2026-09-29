begin;

drop policy if exists "storyboards_insert_own" on public.storyboards;
drop policy if exists "storyboards_update_own" on public.storyboards;
drop policy if exists "storyboards_delete_own" on public.storyboards;
revoke insert,update,delete on public.storyboards from authenticated;

create or replace function public.create_storyboard_with_panel_jobs(
  p_storyboard_id uuid,
  p_creator_id uuid,
  p_series_id uuid,
  p_scene_id uuid,
  p_script_id uuid,
  p_visual_plan_id uuid,
  p_version integer,
  p_blueprint jsonb,
  p_jobs jsonb
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_version < 1 or jsonb_typeof(p_jobs) <> 'array' or jsonb_array_length(p_jobs) < 1 then
    raise exception 'INVALID_STORYBOARD_PAYLOAD';
  end if;

  if not exists (
    select 1
    from public.scene_visual_plans vp
    where vp.id = p_visual_plan_id
      and vp.series_id = p_series_id
      and vp.scene_id = p_scene_id
      and vp.script_id = p_script_id
      and vp.creator_id = p_creator_id
  ) then
    raise exception 'STORYBOARD_PARENT_NOT_FOUND';
  end if;

  begin
    insert into public.storyboards(
      id,series_id,scene_id,script_id,visual_plan_id,creator_id,version,status,blueprint
    ) values (
      p_storyboard_id,p_series_id,p_scene_id,p_script_id,p_visual_plan_id,p_creator_id,p_version,'GENERATING',p_blueprint
    );

    insert into public.storyboard_panel_generations(
      id,storyboard_id,panel_id,creator_id,status,prompt_checksum,prompt_version,provider,model
    )
    select
      x.id,p_storyboard_id,x.panel_id,p_creator_id,'PENDING',x.prompt_checksum,x.prompt_version,x.provider,x.model
    from jsonb_to_recordset(p_jobs) as x(
      id uuid,
      panel_id uuid,
      prompt_checksum text,
      prompt_version text,
      provider text,
      model text
    );

    if (select count(*) from public.storyboard_panel_generations where storyboard_id=p_storyboard_id)
       <> jsonb_array_length(p_jobs) then
      raise exception 'STORYBOARD_JOB_COUNT_MISMATCH';
    end if;
  exception
    when unique_violation then
      return false;
  end;

  return true;
end;
$$;

revoke all on function public.create_storyboard_with_panel_jobs(uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb) from public,authenticated;
grant execute on function public.create_storyboard_with_panel_jobs(uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb,jsonb) to service_role;

commit;
