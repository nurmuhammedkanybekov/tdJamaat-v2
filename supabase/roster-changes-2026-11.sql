-- ============================================================================
-- tdJamaat — roster changes during a season (Nov 2026).
--
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run
--
-- Safe to run more than once. Nothing about normal saving changes; this only
-- makes three roster situations come out right:
--
--   1. ROLE CHANGES. When someone gets a new role (e.g. a member becomes the
--      captain), their next weeks start from the new role's plans. Before,
--      the database copied last week's plan forward, so a new captain kept
--      the member plans (К-К 7 instead of 20).
--
--   2. HOUSE MOVES. A saved week belongs to the house it was earned in
--      (weekly_metrics.house_id). Now the leader who may edit a saved week is
--      that house's leader:
--        - someone who moved from Pannonia to Damjanich: their old Pannonia
--          weeks stay editable by Pannonia, not by Damjanich;
--        - their weeks from the move on belong to Damjanich.
--      New weeks still go to the house the person is in today.
--
--   3. ADMIN CORRECTIONS. The admin can set the house/role a saved week
--      belongs to (the admin panel does this when a move or a new role
--      starts from a chosen week). Leaders still can't.
--
-- Needs seasons-2026-10.sql (weekly_metrics.house_id / .role) to have run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Plans carry forward within the season AND the same role only
-- ---------------------------------------------------------------------------
create or replace function keep_targets_on_weekly_metrics() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  kept jsonb;
  member_role text;
  season_start int;
begin
  if current_house_id() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.target := old.target;
    return new;
  end if;

  season_start := coalesce(season_start_for_week(new.week_number), 0);
  select m.role into member_role from members m where m.id = new.member_id;

  select wm.target into kept
  from weekly_metrics wm
  where wm.member_id = new.member_id
    and wm.week_number < new.week_number
    and wm.week_number >= season_start
    and wm.role is not distinct from member_role
  order by wm.week_number desc
  limit 1;

  if kept is null then
    select s.role_targets -> member_role into kept from season_settings s where s.id = 1;
  end if;

  new.target := coalesce(kept, new.target);
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. House/role of a saved week: set once; only the admin can change it
-- ---------------------------------------------------------------------------
create or replace function snapshot_member_house() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m_house uuid;
  m_role text;
begin
  if tg_op = 'UPDATE' then
    if is_admin() then
      new.house_id := coalesce(new.house_id, old.house_id);
      new.role := coalesce(new.role, old.role);
    else
      new.house_id := coalesce(old.house_id, new.house_id);
      new.role := coalesce(old.role, new.role);
    end if;
  end if;
  if new.house_id is null or new.role is null then
    select m.house_id, m.role into m_house, m_role from members m where m.id = new.member_id;
    new.house_id := coalesce(new.house_id, m_house);
    new.role := coalesce(new.role, m_role);
  end if;
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Who may write a week's row: the house it belongs to
--    existing row → its own house (weekly_metrics.house_id)
--    new row      → the person's current house (the trigger above fills
--                   house_id before this check runs)
--    rows from before seasons-2026-10.sql without a house → today's house
-- ---------------------------------------------------------------------------
drop policy if exists "leader/admin write weekly_metrics" on weekly_metrics;
create policy "leader/admin write weekly_metrics" on weekly_metrics
  for all to authenticated
  using (
    is_admin()
    or house_id = current_house_id()
    or (house_id is null and member_id in (select id from members where house_id = current_house_id()))
  )
  with check (
    is_admin()
    or house_id = current_house_id()
    or (house_id is null and member_id in (select id from members where house_id = current_house_id()))
  );

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- Check: one row per item, all should say "ok".
-- ---------------------------------------------------------------------------
select 'plans follow the role' as check_item,
       case when prosrc like '%is not distinct from member_role%' then 'ok' else 'MISSING' end as result
from pg_proc where proname = 'keep_targets_on_weekly_metrics'
union all
select 'admin can set a week''s house/role',
       case when prosrc like '%if is_admin() then%' then 'ok' else 'MISSING' end
from pg_proc where proname = 'snapshot_member_house'
union all
select 'leaders write their own house''s weeks',
       case when count(*) = 1 then 'ok' else 'MISSING' end
from pg_policies where tablename = 'weekly_metrics' and policyname = 'leader/admin write weekly_metrics';
