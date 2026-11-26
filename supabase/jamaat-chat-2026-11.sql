-- ============================================================================
-- tdJamaat — two more conversations (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs members-2026-11.sql and
--   tazalyk-2026-11.sql (run them first).
--
-- 1. ЖАМААТТЫН СӨЗҮ ('all'): one conversation for the whole jamaat. Every
--    member who signed in with Google (and is linked to a person), every
--    captain, CL (the Тазалык inspector) and the admin read and write in it.
-- 2. КАПИТАНДАР ('staff'): the captains, CL and the admin only. Members do
--    not see it.
--
-- Who wrote a message is set by the database, not by the phone: the role,
-- the person (a member: themselves; a captain: the person of their own house
-- they chose, or none), the house, and the names as they were then (a member
-- can read only their own house's people, so the names travel with the
-- message). A message can be removed by its author and by the admin.
-- "Аамин" belongs to an account, so the admin, captains and CL can say it too.
-- ============================================================================

create table if not exists jamaat_messages (
  id bigserial primary key,
  room text not null check (room in ('all', 'staff')),
  user_id uuid not null default auth.uid(),
  author_role text not null default 'member',
  member_id uuid references members(id) on delete set null,
  house_id uuid references houses(id) on delete set null,
  author_name text,
  house_name text,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_jamaat_messages_room on jamaat_messages (room, created_at desc);

create table if not exists jamaat_message_amins (
  message_id bigint not null references jamaat_messages(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- The signed-in account's role, from the protected place only.
create or replace function jwt_role() returns text
language sql stable as $$
  select coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''), 'member');
$$;

-- Who may read (and so write in) a conversation.
create or replace function can_read_room(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select case r
    when 'all'   then is_admin() or jwt_role() in ('leader', 'inspector') or member_house_id() is not null
    when 'staff' then is_admin() or jwt_role() in ('leader', 'inspector')
    else false
  end;
$$;

create or replace function prepare_jamaat_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  new.body := btrim(new.body);
  new.author_role := jwt_role();
  if new.author_role in ('admin', 'inspector') then
    new.member_id := null;
    new.house_id := null;
  elsif new.author_role = 'leader' then
    new.house_id := current_house_id();
    -- A captain may sign as a person of their own house, nobody else.
    if new.member_id is not null and not exists (select 1 from members x where x.id = new.member_id and x.house_id = new.house_id) then
      new.member_id := null;
    end if;
  else
    new.member_id := current_member_id();
    new.house_id := member_house_id();
  end if;
  new.author_name := (select x.name from members x where x.id = new.member_id);
  new.house_name := (select h.name from houses h where h.id = new.house_id);
  return new;
end;
$$;

drop trigger if exists prepare_jamaat_message on jamaat_messages;
create trigger prepare_jamaat_message before insert on jamaat_messages
  for each row execute function prepare_jamaat_message();

alter table jamaat_messages enable row level security;
alter table jamaat_message_amins enable row level security;

drop policy if exists "read jamaat_messages" on jamaat_messages;
create policy "read jamaat_messages" on jamaat_messages for select to authenticated
  using (can_read_room(room));
drop policy if exists "write jamaat_messages" on jamaat_messages;
create policy "write jamaat_messages" on jamaat_messages for insert to authenticated
  with check (can_read_room(room) and user_id = auth.uid());
drop policy if exists "remove jamaat_messages" on jamaat_messages;
create policy "remove jamaat_messages" on jamaat_messages for delete to authenticated
  using (user_id = auth.uid() or is_admin());

drop policy if exists "read jamaat_message_amins" on jamaat_message_amins;
create policy "read jamaat_message_amins" on jamaat_message_amins for select to authenticated
  using (exists (select 1 from jamaat_messages m where m.id = message_id and can_read_room(m.room)));
drop policy if exists "say amin jamaat" on jamaat_message_amins;
create policy "say amin jamaat" on jamaat_message_amins for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from jamaat_messages m where m.id = message_id and can_read_room(m.room)));
drop policy if exists "take back amin jamaat" on jamaat_message_amins;
create policy "take back amin jamaat" on jamaat_message_amins for delete to authenticated
  using (user_id = auth.uid());

revoke all on jamaat_messages, jamaat_message_amins from anon;
grant select, insert, delete on jamaat_messages, jamaat_message_amins to authenticated;
grant usage, select on sequence jamaat_messages_id_seq to authenticated;

-- Messages arrive at once (Supabase Realtime keeps to the same rules).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'jamaat_messages') then
      execute 'alter publication supabase_realtime add table jamaat_messages';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'jamaat_message_amins') then
      execute 'alter publication supabase_realtime add table jamaat_message_amins';
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';

-- Check: the rules, and whether Realtime carries the conversations.
select tablename, policyname, cmd from pg_policies
where tablename in ('jamaat_messages', 'jamaat_message_amins')
union all
select 'realtime', tablename, 'on' from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('jamaat_messages', 'jamaat_message_amins')
order by 1, 2;
