begin;

alter table public.production_reference_assets
  add column if not exists status text not null default 'UPLOADED',
  add column if not exists storage_path text null,
  add column if not exists reference_role text null,
  add column if not exists ability_slot text null,
  add column if not exists location_id text null,
  add column if not exists prop_id text null,
  add column if not exists provenance jsonb not null default '{}'::jsonb,
  add column if not exists width integer null,
  add column if not exists height integer null,
  add column if not exists mime_type text null,
  add column if not exists notes text null,
  add column if not exists version integer not null default 1,
  add column if not exists replaces_reference_id uuid null references public.production_reference_assets(id) on delete set null,
  add column if not exists technical_valid boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz null;

update public.production_reference_assets
set status='REVIEW_REQUIRED', approved=false, creator_approved=false
where approved=true and benchmark_only=false and status='UPLOADED';

alter table public.production_reference_assets
  drop constraint if exists production_reference_assets_status_check;
alter table public.production_reference_assets
  add constraint production_reference_assets_status_check check (status in ('UPLOADED','REVIEW_REQUIRED','APPROVED','REJECTED','ARCHIVED'));

alter table public.production_reference_assets
  drop constraint if exists production_reference_assets_reference_role_check;
alter table public.production_reference_assets
  add constraint production_reference_assets_reference_role_check check (reference_role is null or reference_role in ('PRIMARY_IDENTITY','PROFILE','FULL_BODY','COSTUME','EXPRESSION','TURNAROUND','OTHER'));

alter table public.production_reference_assets
  drop constraint if exists production_reference_assets_ability_slot_check;
alter table public.production_reference_assets
  add constraint production_reference_assets_ability_slot_check check (ability_slot is null or ability_slot in ('ACTIVATION_POSE','WINDUP','RELEASE','IMPACT','AFTERMATH','VFX_ISOLATION','PALETTE','SHAPE_LANGUAGE','MOTION_ARROWS'));

alter table public.production_reference_assets
  drop constraint if exists production_reference_assets_approval_consistency;
alter table public.production_reference_assets
  add constraint production_reference_assets_approval_consistency check (
    (status='APPROVED' and approved=true and creator_approved=true and benchmark_only=false)
    or
    (status<>'APPROVED' and approved=false)
  );

alter table public.production_reference_assets
  drop constraint if exists production_reference_assets_visual_metadata_check;
alter table public.production_reference_assets
  add constraint production_reference_assets_visual_metadata_check check (
    (width is null and height is null and mime_type is null and storage_path is null)
    or
    (width > 0 and height > 0 and mime_type in ('image/png','image/jpeg','image/webp') and storage_path is not null)
  );

create unique index if not exists production_reference_primary_identity_active_idx
  on public.production_reference_assets(series_id,character_id)
  where type='CHARACTER' and reference_role='PRIMARY_IDENTITY' and status='APPROVED';

create unique index if not exists production_reference_ability_slot_active_idx
  on public.production_reference_assets(series_id,ability_id,ability_slot)
  where type='ABILITY' and ability_slot is not null and status='APPROVED';

create index if not exists production_reference_status_idx
  on public.production_reference_assets(creator_id,series_id,status,created_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('production-references','production-references',false,10485760,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.set_production_reference_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;

drop trigger if exists production_reference_set_updated_at on public.production_reference_assets;
create trigger production_reference_set_updated_at before update on public.production_reference_assets
for each row execute function public.set_production_reference_updated_at();

create or replace function public.freeze_approved_production_reference()
returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='APPROVED' then
  if new.storage_path is distinct from old.storage_path
    or new.checksum is distinct from old.checksum
    or new.asset_url is distinct from old.asset_url
    or new.width is distinct from old.width
    or new.height is distinct from old.height
    or new.mime_type is distinct from old.mime_type
    or new.series_id is distinct from old.series_id
    or new.character_id is distinct from old.character_id
    or new.ability_id is distinct from old.ability_id
    or new.location_id is distinct from old.location_id
    or new.prop_id is distinct from old.prop_id
    or new.reference_role is distinct from old.reference_role
    or new.ability_slot is distinct from old.ability_slot
    or new.provenance is distinct from old.provenance
  then raise exception 'APPROVED_REFERENCE_IMMUTABLE'; end if;
 end if;
 return new;
end; $$;

drop trigger if exists production_reference_freeze_approved on public.production_reference_assets;
create trigger production_reference_freeze_approved before update on public.production_reference_assets
for each row execute function public.freeze_approved_production_reference();

drop policy if exists "production_reference_storage_select_own" on storage.objects;
create policy "production_reference_storage_select_own" on storage.objects
for select to authenticated
using (
 bucket_id='production-references'
 and (storage.foldername(name))[1]='users'
 and (storage.foldername(name))[2]=(select auth.uid())::text
);

revoke insert,update,delete on public.production_reference_assets from authenticated;
grant select on public.production_reference_assets to authenticated;

commit;
