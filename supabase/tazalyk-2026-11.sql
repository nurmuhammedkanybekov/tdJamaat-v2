-- ============================================================================
-- tdJamaat — Тазалык (cleanliness) and week dates (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs the earlier files (SETUP.md, steps 1–11).
--   Run it BEFORE deploying the website version that shows Тазалык — the
--   website copes without it (no Тазалык anywhere), and nothing else changes.
--
-- What it does:
--
--   1. WEEK DATES. The jamaat week runs Thursday → Wednesday. weeks.start_date
--      and end_date already exist (they were empty). A new week now gets its
--      dates from the week before it; the admin sets the first Thursday once
--      in the website (Админ панели → Апталар), which fills every week of the
--      season (set_week_dates below).
--
--   2. ТАЗАЛЫК. A house-level score of up to 25 points, added to the house
--      rating in the weeks the admin switches it on (weeks.tazalyk — off by
--      default, so nothing changes until the admin decides). Five checklist
--      items rated 0–5 each (the admin can rename them); the website turns
--      the ratings into points (src/utils/tazalyk.ts).
--
--   3. A NEW LOGIN: the inspector (role 'inspector'), whose only job is to
--      rate Тазалык for every house. Captains may rate their own house and
--      the admin any house; whoever saved last is recorded. A locked week can
--      be changed by the admin only. Every change goes to the change history.
--      The inspector sees no results — only house names, weeks and Тазалык.
--
--   The account itself is created with scripts/create-auth-users.js: add an
--   "inspector" password to scripts/syr_sozdor.json and run the script again.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Week dates
-- ---------------------------------------------------------------------------
create or replace function fill_week_dates() returns trigger
language plpgsql as $$
declare
  prev_start date;
begin
  if new.start_date is null then
    select w.start_date into prev_start from weeks w where w.week_number = new.week_number - 1;
    if prev_start is not null then
      new.start_date := prev_start + 7;
    end if;
  end if;
  if new.start_date is not null and new.end_date is null then
    new.end_date := new.start_date + 6;
  end if;
  return new;
end;
$$;

drop trigger if exists fill_week_dates on weeks;
create trigger fill_week_dates before insert on weeks
  for each row execute function fill_week_dates();

-- Admin: "week first_week started on this Thursday" → dates for every week
-- from first_week on (later weeks follow seven days apart).
create or replace function set_week_dates(first_week int, first_start date) returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not is_admin() then
    raise exception 'Only the admin can set week dates.' using errcode = '42501';
  end if;
  if extract(isodow from first_start) <> 4 then
    raise exception 'A jamaat week starts on a Thursday (% is not one).', first_start using errcode = '22023';
  end if;
  update weeks w
     set start_date = first_start + (w.week_number - first_week) * 7,
         end_date   = first_start + (w.week_number - first_week) * 7 + 6
   where w.week_number >= first_week;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function set_week_dates(int, date) from public, anon;
grant execute on function set_week_dates(int, date) to authenticated;


-- ---------------------------------------------------------------------------
-- 2. Тазалык: which weeks count, the checklist, the scores
-- ---------------------------------------------------------------------------
alter table weeks add column if not exists tazalyk boolean not null default false;

alter table season_settings add column if not exists tazalyk_items jsonb not null
  default '["Ашкана", "Ажаткана жана ванна", "Бөлмөлөр", "Коридор жана кире бериш", "Жалпы тартип"]'::jsonb;

create or replace function is_inspector() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'inspector', false);
$$;

create table if not exists house_tazalyk (
  house_id uuid not null references houses(id) on delete restrict,
  week_number int not null references weeks(week_number) on delete restrict,
  scores jsonb not null default '{}'::jsonb,
  note text,
  saved_by_role text,
  updated_at timestamptz not null default now(),
  primary key (house_id, week_number)
);

create index if not exists idx_house_tazalyk_week on house_tazalyk (week_number);

-- Every rating is a whole number 0–5; the lock and "who saved" are kept here,
-- in the database, so they hold even if someone bypassed the website.
create or replace function check_house_tazalyk() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text;
  v jsonb;
begin
  if jsonb_typeof(new.scores) <> 'object' then
    raise exception 'Тазалык: scores must be an object' using errcode = '22023';
  end if;
  for k, v in select * from jsonb_each(new.scores) loop
    if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not in (0, 1, 2, 3, 4, 5) then
      raise exception 'Тазалык: «%» must be a whole number from 0 to 5', k using errcode = '22023';
    end if;
  end loop;

  if not is_admin() and exists (select 1 from weeks w where w.week_number = new.week_number and w.locked) then
    raise exception '%-апта кулпуланган — өзгөртүү үчүн админге кайрылыңыз.', new.week_number using errcode = 'P0001';
  end if;

  new.saved_by_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'database');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists check_house_tazalyk on house_tazalyk;
create trigger check_house_tazalyk before insert or update on house_tazalyk
  for each row execute function check_house_tazalyk();

-- Change history (same table as the weekly results).
create or replace function log_tazalyk_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'UPDATE' and old.scores is not distinct from new.scores and old.note is not distinct from new.note then
      return null;
    end if;
    insert into audit_log (table_name, house_id, member_id, week_number, action, actor_id, actor_role, actor_house_id, old_data, new_data)
    values (
      'house_tazalyk',
      coalesce(new.house_id, old.house_id), null, coalesce(new.week_number, old.week_number), tg_op,
      auth.uid(), coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'database'), current_house_id(),
      case when tg_op <> 'INSERT' then jsonb_build_object('tazalyk', old.scores, 'note', old.note) end,
      case when tg_op <> 'DELETE' then jsonb_build_object('tazalyk', new.scores, 'note', new.note) end
    );
  exception when others then
    raise warning 'tdJamaat audit log skipped: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists log_tazalyk_change on house_tazalyk;
create trigger log_tazalyk_change after insert or update or delete on house_tazalyk
  for each row execute function log_tazalyk_change();

alter table house_tazalyk enable row level security;

drop policy if exists "read house_tazalyk" on house_tazalyk;
create policy "read house_tazalyk" on house_tazalyk for select
  using (can_view_results() or is_inspector());

drop policy if exists "rate house_tazalyk" on house_tazalyk;
create policy "rate house_tazalyk" on house_tazalyk for insert to authenticated
  with check (is_admin() or is_inspector() or house_id = current_house_id());

drop policy if exists "re-rate house_tazalyk" on house_tazalyk;
create policy "re-rate house_tazalyk" on house_tazalyk for update to authenticated
  using (is_admin() or is_inspector() or house_id = current_house_id())
  with check (is_admin() or is_inspector() or house_id = current_house_id());

drop policy if exists "admin delete house_tazalyk" on house_tazalyk;
create policy "admin delete house_tazalyk" on house_tazalyk for delete to authenticated
  using (is_admin());

revoke all on house_tazalyk from anon;
grant select, insert, update, delete on house_tazalyk to authenticated;

-- The inspector needs the checklist (season_settings) and the seasons (to
-- number the weeks the way the site does) too — still no results.
drop policy if exists "signed-in read season_settings" on season_settings;
create policy "signed-in read season_settings" on season_settings for select
  using (can_view_results() or is_inspector());

drop policy if exists "signed-in read seasons" on seasons;
create policy "signed-in read seasons" on seasons for select
  using (can_view_results() or is_inspector());


-- ---------------------------------------------------------------------------
-- Check (one result table). You should see: the two triggers, the four
-- house_tazalyk rules, the checklist, and every week with its dates.
-- ---------------------------------------------------------------------------
select * from (
  select 1 as sort, 'trigger' as item, tgname::text as detail, 'installed' as value
  from pg_trigger where tgname in ('fill_week_dates', 'check_house_tazalyk', 'log_tazalyk_change')
  union all
  select 2, 'rule', policyname::text, cmd::text from pg_policies where tablename = 'house_tazalyk'
  union all
  select 3, 'checklist', tazalyk_items::text, '' from season_settings where id = 1
  union all
  select 4, 'week ' || week_number, coalesce(start_date::text, '—') || ' … ' || coalesce(end_date::text, '—'),
         case when tazalyk then 'Тазалык: on' else 'Тазалык: off' end
  from weeks
) checks
order by sort, detail;
