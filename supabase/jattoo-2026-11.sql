-- ============================================================================
-- tdJamaat — Жаттоо (memorization) (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs the earlier files (SETUP.md).
--   The website copes without it (no Жаттоо anywhere).
--
-- What each person has learned by heart, written down by their captain after
-- hearing it recited: Quran (surah + ayahs), hadith, duas, zikr / adhkar, the
-- 99 Names, or something else — plus optional goals with a deadline. It gives
-- no points; the website shows it on profiles, house and community pages, and
-- gives badges.
--
--   memorization       one row per thing recited (who, what, how much, when)
--   memorization_goals what a person is working towards, and by when
--
-- Captains write for the people of their own house; the admin for anyone.
-- Reading: the same people who can see results (captains and the admin).
-- ============================================================================

create table if not exists memorization (
  id bigserial primary key,
  member_id uuid not null references members(id) on delete restrict,
  house_id uuid references houses(id) on delete restrict,
  category text not null check (category in ('quran', 'hadith', 'dua', 'zikr', 'names', 'other')),
  title text not null check (length(trim(title)) between 1 and 160),
  surah int check (surah between 1 and 114),
  ayah_from int check (ayah_from >= 1),
  ayah_to int check (ayah_to >= 1),
  amount int not null default 1 check (amount between 1 and 10000),
  recited_on date not null default current_date,
  note text check (note is null or length(note) <= 300),
  created_by_role text,
  created_at timestamptz not null default now(),
  constraint memorization_quran_range check (
    category <> 'quran' or (surah is not null and ayah_from is not null and ayah_to is not null and ayah_to >= ayah_from)
  )
);

create index if not exists idx_memorization_member on memorization (member_id, recited_on);

create table if not exists memorization_goals (
  id bigserial primary key,
  member_id uuid not null references members(id) on delete restrict,
  category text not null check (category in ('quran', 'hadith', 'dua', 'zikr', 'names', 'other')),
  title text not null check (length(trim(title)) between 1 and 160),
  surah int check (surah between 1 and 114),
  ayah_from int check (ayah_from >= 1),
  ayah_to int check (ayah_to >= 1),
  target int not null check (target between 1 and 10000),
  due_date date,
  start_date date not null default current_date,
  created_by_role text,
  created_at timestamptz not null default now(),
  constraint memorization_goal_quran_range check (
    category <> 'quran' or (surah is not null and ayah_from is not null and ayah_to is not null and ayah_to >= ayah_from)
  )
);

create index if not exists idx_memorization_goals_member on memorization_goals (member_id);

-- The house a row belongs to is the person's house when it is written; the
-- Quran amount is always the size of the ayah range; "who wrote it" is kept.
create or replace function prepare_memorization() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'memorization' then
    if new.house_id is null or tg_op = 'INSERT' then
      select m.house_id into new.house_id from members m where m.id = new.member_id;
    end if;
    if new.category = 'quran' then
      new.amount := new.ayah_to - new.ayah_from + 1;
    end if;
  else
    if new.category = 'quran' then
      new.target := new.ayah_to - new.ayah_from + 1;
    end if;
  end if;
  new.created_by_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'database');
  return new;
end;
$$;

drop trigger if exists prepare_memorization on memorization;
create trigger prepare_memorization before insert or update on memorization
  for each row execute function prepare_memorization();
drop trigger if exists prepare_memorization_goal on memorization_goals;
create trigger prepare_memorization_goal before insert or update on memorization_goals
  for each row execute function prepare_memorization();

-- A captain may write for the people who are in their house now.
create or replace function is_my_member(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members x where x.id = m and x.house_id = current_house_id());
$$;

alter table memorization enable row level security;
alter table memorization_goals enable row level security;

drop policy if exists "read memorization" on memorization;
create policy "read memorization" on memorization for select using (can_view_results());
drop policy if exists "write memorization" on memorization;
create policy "write memorization" on memorization for all to authenticated
  using (is_admin() or is_my_member(member_id))
  with check (is_admin() or is_my_member(member_id));

drop policy if exists "read memorization_goals" on memorization_goals;
create policy "read memorization_goals" on memorization_goals for select using (can_view_results());
drop policy if exists "write memorization_goals" on memorization_goals;
create policy "write memorization_goals" on memorization_goals for all to authenticated
  using (is_admin() or is_my_member(member_id))
  with check (is_admin() or is_my_member(member_id));

revoke all on memorization, memorization_goals from anon;
grant select, insert, update, delete on memorization, memorization_goals to authenticated;
grant usage, select on sequence memorization_id_seq, memorization_goals_id_seq to authenticated;

-- Check: the two tables and their rules.
select tablename, policyname, cmd from pg_policies
where tablename in ('memorization', 'memorization_goals')
order by tablename, policyname;
