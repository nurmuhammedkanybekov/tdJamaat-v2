-- ============================================================================
-- tdJamaat — members set their own photo (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs members-2026-11.sql (run it first).
--
-- A member signed in with Google may:
--   - see the photos of their own house (the house page shows them), and
--   - upload, replace or remove ONE file: their own, "<house>/<member>.<ext>".
--   - change photo_url on their own row only (the existing trigger
--     restrict_member_update_to_photo keeps name, role, house… admin-only).
-- Captains and the admin keep exactly the rights they had.
-- ============================================================================

-- Is this storage path the signed-in member's own photo?
create or replace function is_my_photo(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select current_member_id() is not null
     and split_part(path, '/', 1) = member_house_id()::text
     and split_part(split_part(path, '/', 2), '.', 1) = current_member_id()::text
     and array_length(string_to_array(path, '/'), 1) = 2;
$$;

drop policy if exists "member reads own house photos" on storage.objects;
create policy "member reads own house photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'member-photos' and current_member_id() is not null
         and (storage.foldername(name))[1] = member_house_id()::text);

drop policy if exists "member uploads own photo" on storage.objects;
create policy "member uploads own photo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'member-photos' and is_my_photo(name));

drop policy if exists "member replaces own photo" on storage.objects;
create policy "member replaces own photo" on storage.objects
  for update to authenticated
  using (bucket_id = 'member-photos' and is_my_photo(name))
  with check (bucket_id = 'member-photos' and is_my_photo(name));

drop policy if exists "member removes own photo" on storage.objects;
create policy "member removes own photo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'member-photos' and is_my_photo(name));

drop policy if exists "member updates own photo_url" on members;
create policy "member updates own photo_url" on members
  for update to authenticated
  using (id = current_member_id())
  with check (id = current_member_id());

-- Check: the five new rules.
select tablename, policyname, cmd from pg_policies
where policyname in ('member reads own house photos', 'member uploads own photo', 'member replaces own photo', 'member removes own photo', 'member updates own photo_url')
order by policyname;
