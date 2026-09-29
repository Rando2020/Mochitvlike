begin;
revoke all on function public.retry_storyboard_panel_generation(uuid) from public;
grant execute on function public.retry_storyboard_panel_generation(uuid) to authenticated;
commit;
