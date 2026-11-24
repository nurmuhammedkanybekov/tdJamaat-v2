-- ============================================================================
-- tdJamaat — members sign in with Google (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs the earlier files (SETUP.md), including
--   tazalyk-2026-11.sql. Google itself is switched on in the dashboard
--   (SETUP.md → "Members: Google sign-in").
--
-- How it works:
--
--   1. A captain (or the admin) writes a member's Gmail address on the site
--      (menu → Мүчөлөрдүн кирүүсү). That is the whole invitation.
--   2. The member opens the site, taps "Google менен кирүү", and the site
--      calls link_member_account(): if the Google address matches, the
--      account is tied to that member. Anyone else who signs in with Google
--      is tied to nothing and sees nothing.
--   3. A member sees their own house only: its people, its weekly results
--      (the site shows them their own numbers and the house's total), its
--      Тазалык and Жаттоо. Never another house, never the change history.
--   4. The app's counts (salawat, zikr, tasbihat read, Quran pages) are saved
--      per day in member_practice, so the captain can take a week's numbers
--      with one tap in the entry form instead of asking for them.
--
-- Captains, the inspector and the admin are not affected: their accounts and
-- rules stay exactly as they are (they are told apart by app_metadata.role,
-- which a member's account never has).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Which Google address belongs to which member
-- ---------------------------------------------------------------------------
create table if not exists member_accounts (
  member_id uuid primary key references members(id) on delete cascade,
  email text not null unique check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_id uuid unique references auth.users(id) on delete set null,
  linked_at timestamptz,
  created_by_role text,
  created_at timestamptz not null default now()
);

-- A new or changed address unties the old Google account; the role of whoever
-- wrote it is kept.
create or replace function prepare_member_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email := lower(btrim(new.email));
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    new.user_id := null;
    new.linked_at := null;
  end if;
  if tg_op = 'INSERT' then
    new.user_id := null;
    new.linked_at := null;
  end if;
  new.created_by_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'database');
  return new;
end;
$$;

drop trigger if exists prepare_member_account on member_accounts;
create trigger prepare_member_account before insert or update of email, member_id on member_accounts
  for each row execute function prepare_member_account();


-- ---------------------------------------------------------------------------
-- 2. Who the signed-in member is
-- ---------------------------------------------------------------------------
-- Only an account without a role can be a member (a captain's or the admin's
-- account is never treated as one).
create or replace function current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select a.member_id from member_accounts a
  where a.user_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = '';
$$;

create or replace function member_house_id() returns uuid
language sql stable security definer set search_path = public as $$
  select m.house_id from members m where m.id = current_member_id();
$$;

-- A captain may manage the people who are in their house now (also defined
-- in jattoo-2026-11.sql; the same function).
create or replace function is_my_member(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members x where x.id = m and x.house_id = current_house_id());
$$;

-- Called by the site right after a Google sign-in. Ties the account to the
-- member whose address it is (only a confirmed address counts) and says who
-- that is — or nothing.
create or replace function link_member_account() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  addr text;
  confirmed boolean;
  rec record;
begin
  if uid is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> '' then
    return null;
  end if;
  select lower(u.email), u.email_confirmed_at is not null into addr, confirmed from auth.users u where u.id = uid;
  if addr is null or not confirmed then
    return null;
  end if;
  update member_accounts a set user_id = uid, linked_at = coalesce(a.linked_at, now())
   where a.email = addr and (a.user_id is null or a.user_id = uid);
  select m.id, m.name, m.house_id, h.name as house_name into rec
    from member_accounts a join members m on m.id = a.member_id join houses h on h.id = m.house_id
   where a.user_id = uid;
  if not found then
    return null;
  end if;
  return jsonb_build_object('member_id', rec.id, 'name', rec.name, 'house_id', rec.house_id, 'house_name', rec.house_name);
end;
$$;

revoke all on function link_member_account() from public, anon;
grant execute on function link_member_account() to authenticated;


-- ---------------------------------------------------------------------------
-- 3. What the app counted, per member and day
-- ---------------------------------------------------------------------------
create table if not exists member_practice (
  member_id uuid not null references members(id) on delete cascade,
  day date not null,
  salawat int not null default 0 check (salawat between 0 and 1000000),
  zikr int not null default 0 check (zikr between 0 and 1000000),
  tasbihat int not null default 0 check (tasbihat between 0 and 5),
  pages int not null default 0 check (pages between 0 and 604),
  updated_at timestamptz not null default now(),
  primary key (member_id, day)
);

create index if not exists idx_member_practice_day on member_practice (day);

create or replace function touch_member_practice() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_member_practice on member_practice;
create trigger touch_member_practice before insert or update on member_practice
  for each row execute function touch_member_practice();


-- ---------------------------------------------------------------------------
-- 4. Rules
-- ---------------------------------------------------------------------------
alter table member_accounts enable row level security;
alter table member_practice enable row level security;

-- Addresses: the admin, the person's captain, and the member themself.
drop policy if exists "read member_accounts" on member_accounts;
create policy "read member_accounts" on member_accounts for select to authenticated
  using (is_admin() or is_my_member(member_id) or user_id = auth.uid());
drop policy if exists "write member_accounts" on member_accounts;
create policy "write member_accounts" on member_accounts for all to authenticated
  using (is_admin() or is_my_member(member_id))
  with check (is_admin() or is_my_member(member_id));

-- Daily counts: the member writes their own; their captain and the admin read.
drop policy if exists "read member_practice" on member_practice;
create policy "read member_practice" on member_practice for select to authenticated
  using (is_admin() or is_my_member(member_id) or member_id = current_member_id());
drop policy if exists "member writes member_practice" on member_practice;
create policy "member writes member_practice" on member_practice for insert to authenticated
  with check (member_id = current_member_id());
drop policy if exists "member updates member_practice" on member_practice;
create policy "member updates member_practice" on member_practice for update to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());
drop policy if exists "admin deletes member_practice" on member_practice;
create policy "admin deletes member_practice" on member_practice for delete to authenticated
  using (is_admin());

revoke all on member_accounts, member_practice from anon;
grant select, insert, update, delete on member_accounts, member_practice to authenticated;

-- A member reads their own house — added next to the existing rules (which
-- stay as they are for captains and the admin).
drop policy if exists "member reads own house members" on members;
create policy "member reads own house members" on members for select to authenticated
  using (house_id = member_house_id());

drop policy if exists "member reads own house weekly_metrics" on weekly_metrics;
create policy "member reads own house weekly_metrics" on weekly_metrics for select to authenticated
  using (house_id = member_house_id() or member_id = current_member_id());

drop policy if exists "member reads own house_activity" on house_activity;
create policy "member reads own house_activity" on house_activity for select to authenticated
  using (house_id = member_house_id());

drop policy if exists "member reads own house_tazalyk" on house_tazalyk;
create policy "member reads own house_tazalyk" on house_tazalyk for select to authenticated
  using (house_id = member_house_id());

drop policy if exists "member reads season_settings" on season_settings;
create policy "member reads season_settings" on season_settings for select to authenticated
  using (current_member_id() is not null);

drop policy if exists "member reads seasons" on seasons;
create policy "member reads seasons" on seasons for select to authenticated
  using (current_member_id() is not null);

-- Жаттоо, if it has been set up (jattoo-2026-11.sql): the own house only.
do $$
begin
  if to_regclass('public.memorization') is not null then
    execute 'drop policy if exists "member reads own memorization" on memorization';
    execute 'create policy "member reads own memorization" on memorization for select to authenticated using (house_id = member_house_id())';
    execute 'drop policy if exists "member reads own memorization_goals" on memorization_goals';
    execute 'create policy "member reads own memorization_goals" on memorization_goals for select to authenticated using (member_id = current_member_id())';
  end if;
end $$;

notify pgrst, 'reload schema';

-- Check: the new tables and rules.
select tablename, policyname, cmd from pg_policies
where policyname like 'member%' or tablename in ('member_accounts', 'member_practice')
order by tablename, policyname;
