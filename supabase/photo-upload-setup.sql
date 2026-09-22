-- ============================================================================
-- Self-service member photos
--
-- Lets each house's leader (or the admin) upload/replace photos for members
-- in their OWN house, right from the "Маалымат кошуу" (data entry) screen —
-- no more sending photo files to be added by hand.
--
-- Run this ONCE in the Supabase SQL Editor, after schema.sql has already
-- been applied. Safe to re-run (uses "if not exists" / "or replace" / drops
-- before recreating where needed).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Storage bucket for photos — public read (so the dashboard can show them
--    to anyone), 5 MB per file, images only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored as "<house_id>/<member_id>.<ext>" — the house_id prefix
-- is what lets a leader's write access be scoped to just their own house,
-- the same way weekly_metrics/house_activity already work.

drop policy if exists "public read member photos" on storage.objects;
create policy "public read member photos" on storage.objects
  for select using (bucket_id = 'member-photos');

drop policy if exists "leader/admin upload member photos" on storage.objects;
create policy "leader/admin upload member photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and (is_admin() or (storage.foldername(name))[1] = current_house_id()::text)
  );

drop policy if exists "leader/admin replace member photos" on storage.objects;
create policy "leader/admin replace member photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'member-photos'
    and (is_admin() or (storage.foldername(name))[1] = current_house_id()::text)
  )
  with check (
    bucket_id = 'member-photos'
    and (is_admin() or (storage.foldername(name))[1] = current_house_id()::text)
  );

drop policy if exists "leader/admin delete member photos" on storage.objects;
create policy "leader/admin delete member photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'member-photos'
    and (is_admin() or (storage.foldername(name))[1] = current_house_id()::text)
  );

-- ---------------------------------------------------------------------------
-- 2. Let a leader update their OWN house's members — but ONLY photo_url.
--    (Name/role/house/order/active stay admin-only, enforced below by a
--    trigger rather than RLS, since a row policy alone can't tell which
--    individual columns changed.)
-- ---------------------------------------------------------------------------
drop policy if exists "leader update own house members" on members;
create policy "leader update own house members" on members
  for update to authenticated
  using (is_admin() or house_id = current_house_id())
  with check (is_admin() or house_id = current_house_id());

create or replace function restrict_member_update_to_photo() returns trigger
language plpgsql as $$
begin
  if not is_admin() then
    if new.name is distinct from old.name
       or new.role is distinct from old.role
       or new.house_id is distinct from old.house_id
       or new.display_order is distinct from old.display_order
       or new.active is distinct from old.active
    then
      raise exception 'Leaders can only update a member''s photo';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restrict_member_update on members;
create trigger trg_restrict_member_update
  before update on members
  for each row execute function restrict_member_update_to_photo();
