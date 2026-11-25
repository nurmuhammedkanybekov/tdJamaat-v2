-- ============================================================================
-- tdJamaat — the house's own conversation, and "Мен" for captains and the
-- admin (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs members-2026-11.sql (run it first).
--
-- 1. HOUSE CHAT. Every house has one conversation. Who reads it: the people
--    of the house who signed in with Google, the house's captain, and the
--    admin. Nobody else — not another house, not a visitor. Anyone who can
--    read it may write in it, always under their own name, and may answer a
--    message with "Аамин". A message can be removed by its author, by the
--    house's captain and by the admin. Messages arrive at once (Supabase
--    Realtime, which keeps to these same rules).
--
-- 2. "МЕН". A captain or the admin is also a person of a house. On the site
--    they say once which person they are; then they write in the chat under
--    that name, and their app counts reach the captain's form like a
--    member's. A captain can only be a person of their own house.
-- ============================================================================

-- Can the signed-in account read this house's conversation?
create or replace function can_read_house(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or h = current_house_id() or h = member_house_id();
$$;

-- May the signed-in account speak as this person, in this house?
create or replace function can_speak_as(m uuid, h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members x where x.id = m and x.house_id = h)
     and (   (m = current_member_id() and h = member_house_id())
          or (h = current_house_id())
          or is_admin());
$$;

create table if not exists house_messages (
  id bigserial primary key,
  house_id uuid not null references houses(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  author_role text,
  created_at timestamptz not null default now()
);
create index if not exists idx_house_messages_house on house_messages (house_id, created_at desc);

create table if not exists house_message_amins (
  message_id bigint not null references house_messages(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, member_id)
);

-- The time and "who wrote it" come from the database, not from the phone.
create or replace function prepare_house_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  new.body := btrim(new.body);
  new.author_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member');
  return new;
end;
$$;

drop trigger if exists prepare_house_message on house_messages;
create trigger prepare_house_message before insert on house_messages
  for each row execute function prepare_house_message();

alter table house_messages enable row level security;
alter table house_message_amins enable row level security;

drop policy if exists "read house_messages" on house_messages;
create policy "read house_messages" on house_messages for select to authenticated
  using (can_read_house(house_id));
drop policy if exists "write house_messages" on house_messages;
create policy "write house_messages" on house_messages for insert to authenticated
  with check (can_speak_as(member_id, house_id));
drop policy if exists "remove house_messages" on house_messages;
create policy "remove house_messages" on house_messages for delete to authenticated
  using (is_admin() or house_id = current_house_id() or (member_id = current_member_id() and house_id = member_house_id()));

drop policy if exists "read house_message_amins" on house_message_amins;
create policy "read house_message_amins" on house_message_amins for select to authenticated
  using (exists (select 1 from house_messages m where m.id = message_id and can_read_house(m.house_id)));
drop policy if exists "say amin" on house_message_amins;
create policy "say amin" on house_message_amins for insert to authenticated
  with check (exists (select 1 from house_messages m where m.id = message_id and can_speak_as(member_id, m.house_id)));
drop policy if exists "take back amin" on house_message_amins;
create policy "take back amin" on house_message_amins for delete to authenticated
  using (exists (select 1 from house_messages m where m.id = message_id and can_speak_as(member_id, m.house_id)));

revoke all on house_messages, house_message_amins from anon;
grant select, insert, delete on house_messages, house_message_amins to authenticated;
grant usage, select on sequence house_messages_id_seq to authenticated;

-- Messages arrive at once: add the tables to Supabase Realtime.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'house_messages') then
      execute 'alter publication supabase_realtime add table house_messages';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'house_message_amins') then
      execute 'alter publication supabase_realtime add table house_message_amins';
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. "Мен": a captain or the admin sends their own app counts too.
-- ---------------------------------------------------------------------------
drop policy if exists "staff writes own member_practice" on member_practice;
create policy "staff writes own member_practice" on member_practice for insert to authenticated
  with check (is_admin() or is_my_member(member_id));
drop policy if exists "staff updates own member_practice" on member_practice;
create policy "staff updates own member_practice" on member_practice for update to authenticated
  using (is_admin() or is_my_member(member_id))
  with check (is_admin() or is_my_member(member_id));

notify pgrst, 'reload schema';

-- Check: the new rules, and whether Realtime carries the conversation.
select tablename, policyname, cmd from pg_policies
where tablename in ('house_messages', 'house_message_amins') or policyname like 'staff % member_practice'
union all
select 'realtime', tablename, 'on' from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('house_messages', 'house_message_amins')
order by 1, 2;
