-- Пландар: memorization, Quran reading and books, planned and followed.
--
-- Builds on supabase/jattoo-2026-11.sql (run that first) and keeps every
-- record already written:
--   memorization_goals → plans, now in three tracks (hifz, reading, book),
--                        with a status (active, paused, done, dropped)
--   plan_events        → the history of each plan: extended, paused, done…
--   study_log          → reading progress (Quran pages, book pages)
--   memorization       → recitations; a member may now note "I memorized
--                        this" themselves, which stays unconfirmed until a
--                        captain or the admin listens.
-- Members write their own plans and progress; a captain those of their
-- house; the admin everyone's. Run once in the Supabase SQL editor. Safe to
-- run again.

-- ---------------------------------------------------------------- plans
alter table memorization_goals add column if not exists track text not null default 'hifz';
alter table memorization_goals add column if not exists status text not null default 'active';
alter table memorization_goals add column if not exists author text;
alter table memorization_goals add column if not exists page_from int;
alter table memorization_goals add column if not exists page_to int;
alter table memorization_goals add column if not exists change_note text;
alter table memorization_goals add column if not exists updated_at timestamptz not null default now();

alter table memorization_goals drop constraint if exists plan_track;
alter table memorization_goals add constraint plan_track check (track in ('hifz', 'reading', 'book'));
alter table memorization_goals drop constraint if exists plan_status;
alter table memorization_goals add constraint plan_status check (status in ('active', 'paused', 'done', 'dropped'));
alter table memorization_goals drop constraint if exists plan_pages;
alter table memorization_goals add constraint plan_pages check (
  (page_from is null and page_to is null) or (page_from between 1 and 604 and page_to between page_from and 604));
alter table memorization_goals drop constraint if exists plan_texts;
alter table memorization_goals add constraint plan_texts check (
  (author is null or length(author) <= 120) and (change_note is null or length(change_note) <= 300));

-- ---------------------------------------------------------------- history
create table if not exists plan_events (
  id bigserial primary key,
  goal_id bigint not null references memorization_goals(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  kind text not null check (kind in ('created', 'extended', 'paused', 'resumed', 'done', 'dropped', 'reopened', 'changed')),
  old_due date,
  new_due date,
  note text check (note is null or length(note) <= 300),
  by_role text,
  at timestamptz not null default now()
);
create index if not exists idx_plan_events_goal on plan_events (goal_id);

-- ---------------------------------------------------------------- reading
create table if not exists study_log (
  id bigserial primary key,
  goal_id bigint references memorization_goals(id) on delete set null,
  member_id uuid not null references members(id) on delete cascade,
  house_id uuid references houses(id) on delete set null,
  track text not null check (track in ('reading', 'book')),
  title text check (title is null or length(trim(title)) between 1 and 160),
  amount int not null check (amount between 1 and 2000),
  page_from int check (page_from >= 1),
  page_to int check (page_to >= 1),
  on_day date not null default current_date,
  note text check (note is null or length(note) <= 300),
  created_by_role text,
  created_at timestamptz not null default now()
);
create index if not exists idx_study_log_member on study_log (member_id, on_day);

-- ---------------------------------------------------------------- recitations
alter table memorization add column if not exists verified boolean not null default true;

-- Who is writing: 'admin', 'leader', 'inspector', or 'member' (a Google account).
create or replace function writer_role() returns text
language sql stable as $$
  select coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''), case when auth.uid() is null then 'database' else 'member' end);
$$;

-- Plans: the size of the target follows what is planned; the history writes itself.
create or replace function prepare_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.track = 'hifz' and new.category = 'quran' then
    new.target := new.ayah_to - new.ayah_from + 1;
  elsif new.track = 'reading' and new.page_from is not null then
    new.target := new.page_to - new.page_from + 1;
  end if;
  new.created_by_role := coalesce(new.created_by_role, writer_role());
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists prepare_memorization_goal on memorization_goals;
drop trigger if exists prepare_plan on memorization_goals;
create trigger prepare_plan before insert or update on memorization_goals
  for each row execute function prepare_plan();

create or replace function log_plan_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if tg_op = 'INSERT' then
    insert into plan_events (goal_id, member_id, kind, new_due, note, by_role)
    values (new.id, new.member_id, 'created', new.due_date, new.change_note, writer_role());
    return new;
  end if;
  if new.status is distinct from old.status then
    k := case new.status
      when 'paused' then 'paused'
      when 'done' then 'done'
      when 'dropped' then 'dropped'
      else case old.status when 'paused' then 'resumed' else 'reopened' end
    end;
  elsif new.due_date is distinct from old.due_date then
    k := 'extended';
  elsif new.target is distinct from old.target or new.title is distinct from old.title then
    k := 'changed';
  end if;
  if k is not null then
    insert into plan_events (goal_id, member_id, kind, old_due, new_due, note, by_role)
    values (new.id, new.member_id, k, old.due_date, new.due_date, new.change_note, writer_role());
  end if;
  return new;
end;
$$;
drop trigger if exists log_plan_event on memorization_goals;
create trigger log_plan_event after insert or update on memorization_goals
  for each row execute function log_plan_event();

-- Recitations: a member's own note is unconfirmed; staff writing it confirms it.
create or replace function prepare_recitation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.house_id is null or tg_op = 'INSERT' then
    select m.house_id into new.house_id from members m where m.id = new.member_id;
  end if;
  if new.category = 'quran' then
    new.amount := new.ayah_to - new.ayah_from + 1;
  end if;
  if tg_op = 'INSERT' then
    new.created_by_role := writer_role();
    new.verified := new.created_by_role in ('admin', 'leader');
  elsif writer_role() not in ('admin', 'leader') then
    new.verified := old.verified;   -- only staff confirm
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_memorization on memorization;
create trigger prepare_memorization before insert or update on memorization
  for each row execute function prepare_recitation();

create or replace function prepare_study_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select m.house_id into new.house_id from members m where m.id = new.member_id;
  if new.page_from is not null and new.page_to is not null then
    new.amount := greatest(1, new.page_to - new.page_from + 1);
  end if;
  new.created_by_role := writer_role();
  return new;
end;
$$;
drop trigger if exists prepare_study_log on study_log;
create trigger prepare_study_log before insert or update on study_log
  for each row execute function prepare_study_log();

-- ---------------------------------------------------------------- access
alter table plan_events enable row level security;
alter table study_log enable row level security;

-- Members: their own plans and recitations.
drop policy if exists "member writes own plans" on memorization_goals;
create policy "member writes own plans" on memorization_goals for all to authenticated
  using (member_id = current_member_id()) with check (member_id = current_member_id());
drop policy if exists "member notes own recitation" on memorization;
create policy "member notes own recitation" on memorization for insert to authenticated
  with check (member_id = current_member_id());
drop policy if exists "member takes back own note" on memorization;
create policy "member takes back own note" on memorization for delete to authenticated
  using (member_id = current_member_id() and not verified);

-- History: read like the plans; written only by the trigger.
drop policy if exists "read plan_events" on plan_events;
create policy "read plan_events" on plan_events for select to authenticated
  using (can_view_results() or member_id = current_member_id());

-- Reading log.
drop policy if exists "read study_log" on study_log;
create policy "read study_log" on study_log for select to authenticated
  using (can_view_results() or member_id = current_member_id());
drop policy if exists "write study_log" on study_log;
create policy "write study_log" on study_log for all to authenticated
  using (is_admin() or is_my_member(member_id) or member_id = current_member_id())
  with check (is_admin() or is_my_member(member_id) or member_id = current_member_id());

revoke all on plan_events, study_log from anon;
grant select on plan_events to authenticated;
grant select, insert, update, delete on study_log to authenticated;
grant usage, select on sequence study_log_id_seq to authenticated;

-- Check.
select tablename, policyname, cmd from pg_policies
where tablename in ('memorization', 'memorization_goals', 'plan_events', 'study_log')
order by tablename, policyname;
