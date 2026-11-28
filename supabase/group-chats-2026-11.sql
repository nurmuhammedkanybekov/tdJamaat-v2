-- ============================================================================
-- tdJamaat — group chats with chosen people (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs jamaat-chat-2026-11.sql and
--   polls-dm-2026-11.sql (dm_people) first.
--
-- The admin and the captains can open a conversation for the people they
-- choose (anyone in the jamaat with an account: members tied to a person,
-- captains, CL, the admin). Only those people see it and write in it. Its
-- maker (or the admin) renames it, adds or removes people, or closes it.
-- Anyone in it can leave it. Messages, reactions, polls and editing work as
-- in every other jamaat chat.
-- ============================================================================

alter table chat_rooms add column if not exists created_by uuid;
alter table chat_rooms drop constraint if exists chat_rooms_audience_check;
alter table chat_rooms add constraint chat_rooms_audience_check check (audience in ('all', 'staff', 'custom'));

create table if not exists chat_room_members (
  room text not null references chat_rooms(id) on delete cascade,
  user_id uuid not null,
  added_at timestamptz not null default now(),
  primary key (room, user_id)
);
create index if not exists idx_chat_room_members_user on chat_room_members (user_id);

-- Who may read (and so write in) a conversation: now also a chosen group.
create or replace function can_read_room(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case c.audience
      when 'all'    then is_admin() or jwt_role() in ('leader', 'inspector') or member_house_id() is not null
      when 'staff'  then is_admin() or jwt_role() in ('leader', 'inspector')
      when 'custom' then c.created_by = auth.uid()
                      or exists (select 1 from chat_room_members m where m.room = c.id and m.user_id = auth.uid())
      else false
    end
    from chat_rooms c where c.id = r), false);
$$;

-- May this account make a group (the admin and the captains)?
create or replace function can_make_group() returns boolean
language sql stable as $$ select is_admin() or jwt_role() = 'leader'; $$;

-- A group's maker, or the admin.
create or replace function owns_group(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from chat_rooms c where c.id = r and c.audience = 'custom' and (c.created_by = auth.uid() or is_admin()));
$$;

-- Make a group: its name, a line about it, and its people (the maker is in it too).
create or replace function create_group(name text, about text, people uuid[]) returns text
language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  if not can_make_group() then raise exception 'only the admin and captains make groups'; end if;
  if length(btrim(coalesce(name, ''))) not between 1 and 60 then raise exception 'a name is 1 to 60 characters'; end if;
  insert into chat_rooms (name, about, audience, sort, created_by)
    values (btrim(name), nullif(btrim(coalesce(about, '')), ''), 'custom', 50, auth.uid())
    returning id into rid;
  insert into chat_room_members (room, user_id) values (rid, auth.uid()) on conflict do nothing;
  insert into chat_room_members (room, user_id)
    select rid, p.user_id from dm_people() p where p.user_id = any(people)
    on conflict do nothing;
  return rid;
end;
$$;

-- Set a group's people (its maker or the admin): exactly these, plus the maker.
create or replace function set_group_people(r text, people uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare maker uuid;
begin
  if not owns_group(r) then raise exception 'not your group'; end if;
  select created_by into maker from chat_rooms where id = r;
  delete from chat_room_members m where m.room = r and m.user_id <> maker and not (m.user_id = any(people));
  insert into chat_room_members (room, user_id)
    select r, p.user_id from dm_people() p where p.user_id = any(people)
    on conflict do nothing;
  if maker is not null then insert into chat_room_members (room, user_id) values (r, maker) on conflict do nothing; end if;
end;
$$;

-- Leave a group (one's own place in it).
create or replace function leave_group(r text) returns void
language sql security definer set search_path = public as $$
  delete from chat_room_members where room = r and user_id = auth.uid();
$$;

revoke all on function create_group(text, text, uuid[]) from public, anon;
revoke all on function set_group_people(text, uuid[]) from public, anon;
revoke all on function leave_group(text) from public, anon;
grant execute on function create_group(text, text, uuid[]) to authenticated;
grant execute on function set_group_people(text, uuid[]) to authenticated;
grant execute on function leave_group(text) to authenticated;

-- Rooms: the admin as before; a group's maker renames or closes their own group.
drop policy if exists "read chat_rooms" on chat_rooms;
create policy "read chat_rooms" on chat_rooms for select to authenticated using (is_admin() or can_read_room(id));
drop policy if exists "admin changes chat_rooms" on chat_rooms;
create policy "admin changes chat_rooms" on chat_rooms for update to authenticated
  using (is_admin() or (audience = 'custom' and created_by = auth.uid()))
  with check (is_admin() or (audience = 'custom' and created_by = auth.uid()));
drop policy if exists "admin removes chat_rooms" on chat_rooms;
create policy "admin removes chat_rooms" on chat_rooms for delete to authenticated
  using ((is_admin() and id not in ('all', 'staff')) or (audience = 'custom' and created_by = auth.uid()));

-- Who is in a group: seen by those in it.
alter table chat_room_members enable row level security;
drop policy if exists "read chat_room_members" on chat_room_members;
create policy "read chat_room_members" on chat_room_members for select to authenticated using (can_read_room(room));
revoke all on chat_room_members from anon;
grant select on chat_room_members to authenticated;

-- Check.
select policyname, cmd from pg_policies where tablename in ('chat_rooms', 'chat_room_members') order by tablename, policyname;
