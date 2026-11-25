-- ============================================================================
-- tdJamaat — announcements to the whole jamaat, and each house's goal for the
-- week (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs house-chat-2026-11.sql (run it first).
--
-- 1. ANNOUNCEMENTS (Жамааттан кабар). Only the admin writes them; everyone
--    who is signed in reads them — members, captains, the inspector. They
--    show on "Менин күнүм" and arrive at once (Realtime).
-- 2. THE WEEK'S GOAL (Аптанын максаты). The house's captain (or the admin)
--    writes one line for the house for the week; it is pinned above the
--    house's conversation and on Үйүм. Read by whoever reads the house.
-- ============================================================================

create table if not exists announcements (
  id bigserial primary key,
  title text check (title is null or length(btrim(title)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 3000),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_announcements_created on announcements (created_at desc);

create or replace function is_signed_in_person() returns boolean
language sql stable security definer set search_path = public as $$
  select can_view_results() or is_inspector() or current_member_id() is not null;
$$;

alter table announcements enable row level security;
drop policy if exists "read announcements" on announcements;
create policy "read announcements" on announcements for select to authenticated using (is_signed_in_person());
drop policy if exists "admin writes announcements" on announcements;
create policy "admin writes announcements" on announcements for all to authenticated using (is_admin()) with check (is_admin());
revoke all on announcements from anon;
grant select, insert, update, delete on announcements to authenticated;
grant usage, select on sequence announcements_id_seq to authenticated;

create table if not exists house_goals (
  house_id uuid not null references houses(id) on delete cascade,
  week_number int not null references weeks(week_number) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 280),
  set_by_role text,
  updated_at timestamptz not null default now(),
  primary key (house_id, week_number)
);

create or replace function prepare_house_goal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.body := btrim(new.body);
  new.updated_at := now();
  new.set_by_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'database');
  return new;
end;
$$;
drop trigger if exists prepare_house_goal on house_goals;
create trigger prepare_house_goal before insert or update on house_goals
  for each row execute function prepare_house_goal();

alter table house_goals enable row level security;
drop policy if exists "read house_goals" on house_goals;
create policy "read house_goals" on house_goals for select to authenticated using (can_read_house(house_id));
drop policy if exists "captain sets house_goals" on house_goals;
create policy "captain sets house_goals" on house_goals for all to authenticated
  using (is_admin() or house_id = current_house_id())
  with check (is_admin() or house_id = current_house_id());
revoke all on house_goals from anon;
grant select, insert, update, delete on house_goals to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'announcements') then
      execute 'alter publication supabase_realtime add table announcements';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'house_goals') then
      execute 'alter publication supabase_realtime add table house_goals';
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';

select tablename, policyname, cmd from pg_policies
where tablename in ('announcements', 'house_goals')
order by tablename, policyname;
