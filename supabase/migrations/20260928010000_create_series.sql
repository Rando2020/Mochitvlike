begin;

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 150),
  slug text null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  blueprint jsonb not null,
  blueprint_schema_version text not null
    check (blueprint_schema_version ~ '^[0-9]+\.[0-9]+$'),
  generation_source text not null
    check (generation_source in ('llm', 'repaired', 'fallback')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null
);

create index if not exists series_creator_id_idx
  on public.series (creator_id);

create index if not exists series_creator_updated_idx
  on public.series (creator_id, updated_at desc);

create index if not exists series_status_idx
  on public.series (status);

create index if not exists series_slug_idx
  on public.series (slug)
  where slug is not null;

create or replace function public.set_series_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists series_set_updated_at on public.series;
create trigger series_set_updated_at
before update on public.series
for each row
execute function public.set_series_updated_at();

alter table public.series enable row level security;

drop policy if exists "series_select_own" on public.series;
create policy "series_select_own"
on public.series
for select
to authenticated
using ((select auth.uid()) = creator_id);

drop policy if exists "series_insert_own" on public.series;
create policy "series_insert_own"
on public.series
for insert
to authenticated
with check ((select auth.uid()) = creator_id);

drop policy if exists "series_update_own" on public.series;
create policy "series_update_own"
on public.series
for update
to authenticated
using ((select auth.uid()) = creator_id)
with check ((select auth.uid()) = creator_id);

drop policy if exists "series_delete_own" on public.series;
create policy "series_delete_own"
on public.series
for delete
to authenticated
using ((select auth.uid()) = creator_id);

grant select, insert, update, delete on public.series to authenticated;

commit;
