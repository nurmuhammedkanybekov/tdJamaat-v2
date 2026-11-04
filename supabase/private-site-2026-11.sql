-- ============================================================================
-- tdJamaat — private site (Nov 2026).
--
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run
--
-- Run AFTER the new website version is deployed. Safe to run more than once.
--
--   1. ONLY CAPTAINS AND THE ADMIN CAN SEE THE RESULTS. People, weekly
--      results, mini-cards, plans and seasons are readable only by a
--      logged-in captain or the admin. Without logging in, the database
--      returns nothing. Only the house names (for the login screen) and the
--      week numbers (for the daily keep-alive) stay readable.
--
--   2. ROLES COME FROM app_metadata. Until now every rule read the role and
--      house from user_metadata — which any logged-in user can change about
--      themselves (a captain could have made themselves admin). Roles are
--      now read from app_metadata, which only the server key can set.
--      Step 2a copies each existing account's role into app_metadata first,
--      so nobody is locked out; scripts/create-auth-users.js sets both from
--      now on. A user without a role in app_metadata (e.g. someone who
--      signed up on their own) can read and write nothing.
--
-- Also turn off sign-ups: Authentication → Sign In / Providers → Email →
-- "Allow new users to sign up" off. (Even if left on, such a user gets
-- nothing — see 2.)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 2a. Copy each existing account's role/house into app_metadata
-- ---------------------------------------------------------------------------
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_strip_nulls(jsonb_build_object(
       'role', raw_user_meta_data ->> 'role',
       'house_id', raw_user_meta_data ->> 'house_id'))
where email like '%@tdjamaat.internal'
  and raw_user_meta_data ->> 'role' in ('admin', 'leader');


-- ---------------------------------------------------------------------------
-- 2b. Roles are read from app_metadata only
-- ---------------------------------------------------------------------------
create or replace function is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function current_house_id() returns uuid
language sql stable as $$
  select case when auth.jwt() -> 'app_metadata' ->> 'role' = 'leader'
              then nullif(auth.jwt() -> 'app_metadata' ->> 'house_id', '')::uuid end;
$$;

-- Who may see results: the admin and the captains (house logins).
create or replace function can_view_results() returns boolean
language sql stable as $$
  select is_admin() or current_house_id() is not null;
$$;

-- The change history labels who saved, from the same protected place.
create or replace function log_weekly_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec_house uuid;
  rec_member uuid;
  rec_week int;
  old_payload jsonb;
  new_payload jsonb;
begin
  begin
    if tg_table_name = 'weekly_metrics' then
      rec_member := coalesce(new.member_id, old.member_id);
      rec_week := coalesce(new.week_number, old.week_number);
      select m.house_id into rec_house from members m where m.id = rec_member;
      if tg_op <> 'INSERT' then old_payload := jsonb_build_object('actual', old.actual, 'target', old.target, 'excused', coalesce(to_jsonb(old) -> 'excused', 'false'::jsonb)); end if;
      if tg_op <> 'DELETE' then new_payload := jsonb_build_object('actual', new.actual, 'target', new.target, 'excused', coalesce(to_jsonb(new) -> 'excused', 'false'::jsonb)); end if;
    else
      rec_house := coalesce(new.house_id, old.house_id);
      rec_week := coalesce(new.week_number, old.week_number);
      if tg_op <> 'INSERT' then old_payload := jsonb_build_object('activity', old.activity); end if;
      if tg_op <> 'DELETE' then new_payload := jsonb_build_object('activity', new.activity); end if;
    end if;

    -- A re-save with identical values isn't a change worth recording.
    if tg_op = 'UPDATE' and old_payload is not distinct from new_payload then
      return null;
    end if;

    insert into audit_log (table_name, house_id, member_id, week_number, action, actor_id, actor_role, actor_house_id, old_data, new_data)
    values (
      tg_table_name, rec_house, rec_member, rec_week, tg_op,
      auth.uid(),
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'database'),
      current_house_id(),
      old_payload, new_payload
    );
  exception when others then
    raise warning 'tdJamaat audit log skipped: %', sqlerrm;
  end;
  return null;
end;
$$;


-- ---------------------------------------------------------------------------
-- 1. Results: captains and the admin only
-- ---------------------------------------------------------------------------
drop policy if exists "public read members" on members;
drop policy if exists "signed-in read members" on members;
create policy "signed-in read members" on members for select using (can_view_results());

drop policy if exists "public read weekly_metrics" on weekly_metrics;
drop policy if exists "signed-in read weekly_metrics" on weekly_metrics;
create policy "signed-in read weekly_metrics" on weekly_metrics for select using (can_view_results());

drop policy if exists "public read house_activity" on house_activity;
drop policy if exists "signed-in read house_activity" on house_activity;
create policy "signed-in read house_activity" on house_activity for select using (can_view_results());

drop policy if exists "public read season_settings" on season_settings;
drop policy if exists "signed-in read season_settings" on season_settings;
create policy "signed-in read season_settings" on season_settings for select using (can_view_results());

drop policy if exists "public read seasons" on seasons;
drop policy if exists "signed-in read seasons" on seasons;
create policy "signed-in read seasons" on seasons for select using (can_view_results());

-- houses ("public read houses") and weeks ("public read weeks") stay readable:
-- house names for the login screen, week numbers for /api/keepalive.

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- Check: every row should say "ok".
-- ---------------------------------------------------------------------------
select 'accounts with a protected role' as check_item,
       case when count(*) filter (where raw_app_meta_data ->> 'role' in ('admin', 'leader')) >= 1 then 'ok (' || count(*) filter (where raw_app_meta_data ->> 'role' in ('admin', 'leader')) || ' accounts)' else 'MISSING — run scripts/create-auth-users.js' end
from auth.users where email like '%@tdjamaat.internal'
union all
select 'admin account has its role',
       case when exists (select 1 from auth.users where email = 'admin@tdjamaat.internal' and raw_app_meta_data ->> 'role' = 'admin') then 'ok' else 'MISSING' end
union all
select 'results hidden from visitors',
       case when not exists (select 1 from pg_policies where policyname in ('public read members', 'public read weekly_metrics', 'public read house_activity')) then 'ok' else 'MISSING' end;
