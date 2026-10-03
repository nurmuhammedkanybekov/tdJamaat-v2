-- ============================================================================
-- tdJamaat — seasons (Oct 2026).
--
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run
--
-- Safe to run more than once. Nothing changes for leaders today; the current
-- season keeps going exactly as before. What it adds:
--
--   1. SEASONS. A season is a run of weeks (first_week … last_week). Week
--      numbers keep counting up in the database (17, 18, …) so nothing that
--      already exists has to change; the website shows them per season
--      (season 2 starts again at "1-апта"). The running season has
--      last_week = null. Ending a season (admin panel) fills in last_week
--      and starts the next one.
--
--   2. WHO WAS IN WHICH HOUSE, PER WEEK. Every saved row now remembers the
--      person's house and role at the time it was saved (weekly_metrics
--      .house_id / .role). People change houses between seasons; with this,
--      last season's results stay in the house they were earned in, forever.
--      Existing rows are filled in from today's roster (nobody has moved yet).
--
--   3. TARGETS CARRY FORWARD WITHIN A SEASON ONLY. A new season starts from
--      the season minimums for each person's (possibly new) role, not from
--      last season's targets.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Seasons
-- ---------------------------------------------------------------------------
create table if not exists seasons (
  id serial primary key,
  name text not null,
  first_week int not null,
  last_week int,                       -- null = the running season
  created_at timestamptz not null default now(),
  check (last_week is null or last_week >= first_week - 1)
);

-- The current season (Sept 2026 →), covering every week that exists today.
insert into seasons (name, first_week)
select '2026–27', coalesce((select min(week_number) from weeks), 1)
where not exists (select 1 from seasons);

-- At most one running season.
create unique index if not exists seasons_one_running on seasons ((last_week is null)) where last_week is null;

alter table seasons enable row level security;
drop policy if exists "public read seasons" on seasons;
create policy "public read seasons" on seasons for select using (true);
drop policy if exists "admin manage seasons" on seasons;
create policy "admin manage seasons" on seasons
  for all to authenticated using (is_admin()) with check (is_admin());
grant select on seasons to anon, authenticated;
grant insert, update, delete on seasons to authenticated;
grant usage, select on sequence seasons_id_seq to authenticated;

-- Which season a week belongs to (null if none).
create or replace function season_start_for_week(wk int) returns int
language sql stable set search_path = public as $$
  select s.first_week from seasons s
  where wk >= s.first_week and (s.last_week is null or wk <= s.last_week)
  order by s.first_week desc limit 1;
$$;


-- ---------------------------------------------------------------------------
-- 2. House + role remembered on every saved row
-- ---------------------------------------------------------------------------
alter table weekly_metrics add column if not exists house_id uuid references houses(id);
alter table weekly_metrics add column if not exists role text;

update weekly_metrics wm
set house_id = m.house_id, role = m.role
from members m
where wm.member_id = m.id and (wm.house_id is null or wm.role is null);

create index if not exists idx_weekly_metrics_house on weekly_metrics(house_id);

-- New rows take the person's current house/role; an edit keeps what the row
-- already had (re-saving an old week never moves it to a new house).
create or replace function snapshot_member_house() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m_house uuid;
  m_role text;
begin
  if tg_op = 'UPDATE' then
    new.house_id := coalesce(old.house_id, new.house_id);
    new.role := coalesce(old.role, new.role);
  end if;
  if new.house_id is null or new.role is null then
    select m.house_id, m.role into m_house, m_role from members m where m.id = new.member_id;
    new.house_id := coalesce(new.house_id, m_house);
    new.role := coalesce(new.role, m_role);
  end if;
  return new;
end;
$$;

drop trigger if exists snapshot_member_house on weekly_metrics;
create trigger snapshot_member_house
  before insert or update on weekly_metrics
  for each row execute function snapshot_member_house();


-- ---------------------------------------------------------------------------
-- 3. Targets carry forward within the season only
--    (same functions as season-2026-09.sql / add-babh-2026-09.sql, with the
--    "earlier week" lookups limited to the week's own season)
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

  select wm.target into kept
  from weekly_metrics wm
  where wm.member_id = new.member_id
    and wm.week_number < new.week_number
    and wm.week_number >= season_start
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

create or replace function keep_targets_on_house_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  source jsonb;
  defaults jsonb;
  k text;
  merged jsonb := '{}'::jsonb;
  season_start int;
begin
  if current_house_id() is null then
    return new;
  end if;

  select s.activity_targets into defaults from season_settings s where s.id = 1;
  season_start := coalesce(season_start_for_week(new.week_number), 0);

  if tg_op = 'UPDATE' then
    source := old.activity;
  else
    select ha.activity into source
    from house_activity ha
    where ha.house_id = new.house_id
      and ha.week_number < new.week_number
      and ha.week_number >= season_start
    order by ha.week_number desc
    limit 1;
  end if;

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

-- ---------------------------------------------------------------------------
-- 4. "End the season" (admin panel button) — one atomic step:
--    the running season ends at the last opened week, its weeks are locked
--    (optional), and the next season starts with the next week number.
-- ---------------------------------------------------------------------------
create or replace function start_new_season(new_name text, lock_finished boolean default true) returns int
language plpgsql security definer set search_path = public as $$
declare
  cur seasons%rowtype;
  last_wk int;
  new_id int;
begin
  if not is_admin() then
    raise exception 'Жаңы сезонду админ гана баштай алат.' using errcode = '42501';
  end if;
  if coalesce(trim(new_name), '') = '' then
    raise exception 'Жаңы сезондун атын жазыңыз.';
  end if;

  select * into cur from seasons where last_week is null for update;
  select coalesce(max(week_number), 0) into last_wk from weeks;

  if cur.id is not null then
    update seasons set last_week = greatest(last_wk, cur.first_week - 1) where id = cur.id;
    if lock_finished and exists (
      select 1 from information_schema.columns where table_name = 'weeks' and column_name = 'locked'
    ) then
      execute 'update weeks set locked = true where week_number between $1 and $2' using cur.first_week, last_wk;
    end if;
  end if;

  insert into seasons (name, first_week) values (trim(new_name), last_wk + 1) returning id into new_id;
  return new_id;
end;
$$;

revoke all on function start_new_season(text, boolean) from public;
grant execute on function start_new_season(text, boolean) to authenticated;

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- Check (one result table): the season row, and that every saved row now
-- has a house (rows_without_house should be 0).
-- ---------------------------------------------------------------------------
select 'season' as item, name || ' · weeks ' || first_week || '…' || coalesce(last_week::text, 'now') as value from seasons
union all
select 'rows_without_house', count(*)::text from weekly_metrics where house_id is null
union all
select 'trigger', tgname::text from pg_trigger where tgname = 'snapshot_member_house';
