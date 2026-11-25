-- ============================================================================
-- tdJamaat — the admin may write in every house's conversation (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs house-chat-2026-11.sql (run it first).
--
-- Before: the admin could read every house's conversation, but could write
-- (and say "Аамин") only as a person of that same house. Now the admin writes
-- in any house under their own person (Нур), and the message is marked
-- "админ". Members and captains are not affected: they still write only as
-- themselves, only in their own house.
-- ============================================================================

create or replace function can_speak_as(m uuid, h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members x where x.id = m and (x.house_id = h or is_admin()))
     and (   (m = current_member_id() and h = member_house_id())
          or (h = current_house_id())
          or is_admin());
$$;

notify pgrst, 'reload schema';

select 'can_speak_as updated' as done;
