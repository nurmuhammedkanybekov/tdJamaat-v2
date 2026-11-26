-- ============================================================================
-- tdJamaat — the admin is the admin, in every house's conversation (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs house-chat-2026-11.sql (run it first).
--
-- Before: the admin could read every house's conversation but wrote only as
-- a person of that house. Now the admin's account is nobody's person: it
-- writes in any house as "Админ" (the message has no member, and is marked
-- admin by the database, whatever the phone sends). The admin can no longer
-- write as one of the members. Members and captains are not affected: they
-- still write only as themselves, only in their own house.
-- ============================================================================

-- An admin message belongs to no member.
alter table house_messages alter column member_id drop not null;

-- A person may speak as themselves (member) or as a person of their own
-- house (captain). The admin speaks only as the admin (below).
create or replace function can_speak_as(m uuid, h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members x where x.id = m and x.house_id = h)
     and (   (m = current_member_id() and h = member_house_id())
          or (h = current_house_id()));
$$;

-- The time, the role and "who wrote it" come from the database: a message
-- from the admin's account is always the admin's, with no member on it.
create or replace function prepare_house_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  new.body := btrim(new.body);
  new.author_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member');
  if new.author_role = 'admin' then new.member_id := null; end if;
  return new;
end;
$$;

drop policy if exists "write house_messages" on house_messages;
create policy "write house_messages" on house_messages for insert to authenticated
  with check (
    (member_id is null and is_admin())
    or (member_id is not null and can_speak_as(member_id, house_id))
  );

notify pgrst, 'reload schema';

select 'admin writes as Админ' as done;
