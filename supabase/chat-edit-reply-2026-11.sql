-- ============================================================================
-- tdJamaat — editing one's own chat messages, and replying to one (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs house-chat, admin-chat, jamaat-chat
--   and polls-dm (the private messages) first.
--
-- Whoever wrote a message can change its text for 48 hours: in the house
-- chat, the jamaat's chats and private messages. The message is marked
-- "өзгөртүлгөн" (edited) with the time. Nothing else of it changes: not who
-- wrote it, not when, not its reactions. A poll's question is not edited
-- (people have already answered it). The admin, who can delete any message,
-- edits only their own.
--
-- A reply: a message may name the message it answers (reply_to). It is shown
-- quoted above the answer; nothing else about either message changes.
-- ============================================================================

alter table house_messages  add column if not exists edited_at timestamptz;
alter table jamaat_messages add column if not exists edited_at timestamptz;
alter table direct_messages add column if not exists edited_at timestamptz;
alter table house_messages  add column if not exists reply_to bigint;
alter table jamaat_messages add column if not exists reply_to bigint;
alter table direct_messages add column if not exists reply_to bigint;

-- kind: 'house' | 'room' | 'dm'. Returns the time of the edit.
create or replace function edit_message(kind text, m bigint, body text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  clean text := btrim(coalesce(body, ''));
  role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member');
  n int := 0;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if length(clean) < 1 or length(clean) > 2000 then raise exception 'a message is 1 to 2000 characters'; end if;

  if kind = 'house' then
    update house_messages x set body = clean, edited_at = now()
     where x.id = m and x.created_at > now() - interval '48 hours'
       and (   (x.author_role = 'admin'  and x.member_id is null and is_admin())
            or (x.author_role = 'leader' and role = 'leader' and x.house_id = current_house_id())
            or (x.author_role = 'member' and role = 'member' and x.member_id = current_member_id() and x.house_id = member_house_id()));
    get diagnostics n = row_count;
  elsif kind = 'room' then
    update jamaat_messages x set body = clean, edited_at = now()
     where x.id = m and x.user_id = auth.uid() and x.poll is null and x.created_at > now() - interval '48 hours';
    get diagnostics n = row_count;
  elsif kind = 'dm' then
    update direct_messages x set body = clean, edited_at = now()
     where x.id = m and x.sender = auth.uid() and x.created_at > now() - interval '48 hours';
    get diagnostics n = row_count;
  end if;

  if n = 0 then raise exception 'this message cannot be edited'; end if;
  return now();
end;
$$;
revoke all on function edit_message(text, bigint, text) from public, anon;
grant execute on function edit_message(text, bigint, text) to authenticated;

-- Check.
select table_name, column_name from information_schema.columns
 where column_name in ('edited_at', 'reply_to') and table_name in ('house_messages', 'jamaat_messages', 'direct_messages');
