-- ============================================================================
-- tdJamaat — season setup (Sept 2026). Run ONCE, before the season starts.
--
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run
--
-- Safe to run more than once. What it does:
--
--   1. Stores the season's minimums (targets) in the database:
--        per role:      imam 20 / orun basar 10 / member 7 pages (К-К), etc.
--        per house:     the 6 mini-card activities.
--      The app reads them from here, so they're defined in exactly one place.
--
--   2. Targets are set by the ADMIN only. A house leader enters results
--      (Факт) only — even if someone bypassed the website and wrote to the
--      database directly, the database itself keeps the target the admin set
--      (or the role minimum). A leader cannot lower their own members'
--      targets to boost percentages.
--
--   3. Only the admin opens a new week. Leaders fill in weeks that exist.
--      (Removes the "leader opens next week" rule if an earlier fix added it.)
--
--   4. Fixes Pannonia's week 2: an early test save stored leader-level targets
--      for every member (e.g. К-К 20 for regular members instead of 7).
--      Those rows are reset to the correct minimum for each person's role.
--      (All their week-2 results are zeros, so nothing real is lost.)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Season settings (single row)
-- ---------------------------------------------------------------------------
create table if not exists season_settings (
  id int primary key default 1 check (id = 1),
  role_targets jsonb not null,
  activity_targets jsonb not null,
  updated_at timestamptz not null default now()
);

insert into season_settings (id, role_targets, activity_targets) values (
  1,
  '{
     "imam":   {"К-К": 20, "СВТ": 2100, "КТП": 70, "ТХЖ": 2, "ДТА": 1, "ИСТГ": 700, "НФ": 7, "ТСП": 10},
     "zam":    {"К-К": 10, "СВТ": 1400, "КТП": 40, "ТХЖ": 1, "ДТА": 1, "ИСТГ": 350, "НФ": 7, "ТСП": 7},
     "member": {"К-К": 7,  "СВТ": 700,  "КТП": 30, "ТХЖ": 1, "ДТА": 1, "ИСТГ": 200, "НФ": 7, "ТСП": 7}
   }'::jsonb,
  '{"БГМДТ": 7, "КПТ": 7, "И-Н.2": 7, "КИТЕП": 7, "СПОРТ": 1, "ТСПХ": 7, "БАБХ": 7}'::jsonb
)
on conflict (id) do nothing;   -- re-running never overwrites minimums you've since changed

alter table season_settings enable row level security;
drop policy if exists "public read season_settings" on season_settings;
create policy "public read season_settings" on season_settings for select using (true);
drop policy if exists "admin manage season_settings" on season_settings;
create policy "admin manage season_settings" on season_settings
  for all to authenticated using (is_admin()) with check (is_admin());

grant select on season_settings to anon, authenticated;
grant insert, update, delete on season_settings to authenticated;


-- ---------------------------------------------------------------------------
-- 2. Leaders can't set targets — enforced by the database
--
-- Only applies to a house-leader session (a JWT carrying house_id). The
-- admin, and anything run here in the SQL editor, pass through untouched.
--   new row  → target = that member's most recent earlier target
--              (so an admin's custom target carries forward),
--              or the role minimum if they have none yet
--   update   → target stays exactly what it was
-- ---------------------------------------------------------------------------
create or replace function keep_targets_on_weekly_metrics() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  kept jsonb;
  member_role text;
begin
  if current_house_id() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.target := old.target;
    return new;
  end if;

  select wm.target into kept
  from weekly_metrics wm
  where wm.member_id = new.member_id and wm.week_number < new.week_number
  order by wm.week_number desc
  limit 1;

  if kept is null then
    select m.role into member_role from members m where m.id = new.member_id;
    select s.role_targets -> member_role into kept from season_settings s where s.id = 1;
  end if;

  new.target := coalesce(kept, new.target);
  return new;
end;
$$;

drop trigger if exists keep_targets_on_weekly_metrics on weekly_metrics;
create trigger keep_targets_on_weekly_metrics
  before insert or update on weekly_metrics
  for each row execute function keep_targets_on_weekly_metrics();


-- Same rule for the house mini-card: a leader's save keeps each activity's
-- "actual" but takes the "target" from the admin-set/previous value.
create or replace function keep_targets_on_house_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  source jsonb;      -- this week's saved row (update) or the house's latest earlier week
  defaults jsonb;    -- season_settings.activity_targets
  k text;
  merged jsonb := '{}'::jsonb;
begin
  if current_house_id() is null then
    return new;
  end if;

  select s.activity_targets into defaults from season_settings s where s.id = 1;

  if tg_op = 'UPDATE' then
    source := old.activity;
  else
    select ha.activity into source
    from house_activity ha
    where ha.house_id = new.house_id and ha.week_number < new.week_number
    order by ha.week_number desc
    limit 1;
  end if;

  -- Target per activity: the admin-set/previous value if there is one, else
  -- the season default (covers an activity added mid-season, like БАБХ),
  -- and only if neither exists, what was sent.
  for k in select jsonb_object_keys(new.activity) loop
    merged := merged || jsonb_build_object(
      k,
      jsonb_build_object(
        'actual', coalesce(new.activity -> k -> 'actual', '0'::jsonb),
        'target', coalesce(source -> k -> 'target', defaults -> k, new.activity -> k -> 'target')
      )
    );
  end loop;

  new.activity := merged;
  return new;
end;
$$;

drop trigger if exists keep_targets_on_house_activity on house_activity;
create trigger keep_targets_on_house_activity
  before insert or update on house_activity
  for each row execute function keep_targets_on_house_activity();


-- ---------------------------------------------------------------------------
-- 3. Only the admin opens weeks
-- ---------------------------------------------------------------------------
drop policy if exists "leader opens next week" on weeks;


-- ---------------------------------------------------------------------------
-- 4. Pannonia week 2 → correct role minimums
-- ---------------------------------------------------------------------------
update weekly_metrics wm
set target = s.role_targets -> m.role,
    updated_at = now()
from members m, houses h, season_settings s
where wm.member_id = m.id
  and m.house_id = h.id
  and h.slug = 'pannonia'
  and wm.week_number = 2
  and s.id = 1;


-- ---------------------------------------------------------------------------
-- Check (one result table). You should see:
--   * 6 "Pannonia week 2" rows: Бахтиер imam → К-К 20, Мехмет zam → К-К 10,
--     the four members → К-К 7
--   * 2 "trigger" rows
--   * "weeks policy" rows WITHOUT "leader opens next week"
-- ---------------------------------------------------------------------------
select * from (
  select 1 as sort, 'Pannonia week 2' as check_item,
         m.name || ' (' || m.role || ')' as detail,
         'К-К ' || (wm.target ->> 'К-К') || ', СВТ ' || (wm.target ->> 'СВТ') || ', ТСП ' || (wm.target ->> 'ТСП') as value
  from weekly_metrics wm
  join members m on m.id = wm.member_id
  join houses h on h.id = m.house_id
  where h.slug = 'pannonia' and wm.week_number = 2
  union all
  select 2, 'trigger', tgname::text, 'installed'
  from pg_trigger
  where tgname in ('keep_targets_on_weekly_metrics', 'keep_targets_on_house_activity')
  union all
  select 3, 'weeks policy', policyname::text, cmd::text
  from pg_policies where tablename = 'weeks'
) checks
order by sort, detail;
