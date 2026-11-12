-- ============================================================================
-- Private member photos
--
-- Until now the photo bucket was public: anyone with the project address
-- could list and open the photos, without logging in. After this file only a
-- logged-in captain or the admin can (the same rule as the results).
--
-- IMPORTANT: run this only AFTER the website version that loads photos with
-- signed links is deployed (src/services/photos.ts). The older version would
-- show initials instead of photos.
--
-- Deletes nothing. Safe to re-run. Needs private-site-2026-11.sql
-- (can_view_results).
-- ============================================================================

update storage.buckets set public = false where id = 'member-photos';

drop policy if exists "public read member photos" on storage.objects;
drop policy if exists "signed-in read member photos" on storage.objects;
create policy "signed-in read member photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'member-photos' and can_view_results());

-- Check: both rows must say "ok".
select 'bucket is private' as check, case when not public then 'ok' else 'STILL PUBLIC' end as result
from storage.buckets where id = 'member-photos'
union all
select 'no public read policy', case when count(*) = 0 then 'ok' else 'STILL THERE' end
from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public read member photos';
