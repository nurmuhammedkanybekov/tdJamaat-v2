-- ============================================================================
-- tdJamaat — polls in the chats, and private messages (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs jamaat-chat-2026-11.sql (and so
--   members, tazalyk, private-site) first.
--
-- 1. POLLS. A message in a jamaat chat (Жамааттын чаты, Капитандар, any the
--    admin opened) can be a poll: its text is the question, `poll` holds
--    2–8 options and whether more than one may be chosen. Whoever can read
--    the chat can vote; one vote per option per account, and in a
--    one-choice poll a new vote replaces the old one. The author or the
--    admin can close it.
-- 2. PRIVATE MESSAGES between two accounts, text only. Who may write to whom:
--      a member  → people of their own house, their captain, the admin;
--      a captain → their house's people, the other captains, CL, the admin;
--      CL        → the captains and the admin;
--      the admin → everyone.
--    Only the two people see a conversation (not the admin). A guest's
--    personal Google account has no private messages.
-- ============================================================================

-- ---------------------------------------------------------------- polls
alter table jamaat_messages add column if not exists poll jsonb;
alter table jamaat_messages drop constraint if exists jamaat_poll_shape;
alter table jamaat_messages add constraint jamaat_poll_shape check (
  poll is null or (
    jsonb_typeof(poll -> 'options') = 'array'
    and jsonb_array_length(poll -> 'options') between 2 and 8
    and pg_column_size(poll) <= 4000));

create table if not exists jamaat_poll_votes (
  message_id bigint not null references jamaat_messages(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  option int not null check (option between 0 and 7),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, option)
);

-- A vote: for an option the poll has, while it is open; in a one-choice
-- poll the earlier vote goes.
create or replace function prepare_poll_vote() returns trigger
language plpgsql security definer set search_path = public as $$
declare p jsonb;
begin
  new.user_id := auth.uid();
  select m.poll into p from jamaat_messages m where m.id = new.message_id;
  if p is null or coalesce((p ->> 'closed')::boolean, false) or new.option >= jsonb_array_length(p -> 'options') then
    raise exception 'this poll does not take this vote';
  end if;
  if not coalesce((p ->> 'multi')::boolean, false) then
    delete from jamaat_poll_votes v where v.message_id = new.message_id and v.user_id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_poll_vote on jamaat_poll_votes;
create trigger prepare_poll_vote before insert on jamaat_poll_votes
  for each row execute function prepare_poll_vote();

-- Closing a poll: its author or the admin (nothing else of a message changes).
create or replace function close_poll(m bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update jamaat_messages set poll = jsonb_set(poll, '{closed}', 'true'::jsonb)
   where id = m and poll is not null and (user_id = auth.uid() or is_admin());
end;
$$;
revoke all on function close_poll(bigint) from public, anon;
grant execute on function close_poll(bigint) to authenticated;

alter table jamaat_poll_votes enable row level security;
drop policy if exists "read poll votes" on jamaat_poll_votes;
create policy "read poll votes" on jamaat_poll_votes for select to authenticated
  using (exists (select 1 from jamaat_messages m where m.id = message_id and can_read_room(m.room)));
drop policy if exists "vote" on jamaat_poll_votes;
create policy "vote" on jamaat_poll_votes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from jamaat_messages m where m.id = message_id and can_read_room(m.room)));
drop policy if exists "take back vote" on jamaat_poll_votes;
create policy "take back vote" on jamaat_poll_votes for delete to authenticated
  using (user_id = auth.uid());
revoke all on jamaat_poll_votes from anon;
grant select, insert, delete on jamaat_poll_votes to authenticated;

-- ---------------------------------------------------------------- private messages
-- The people this account may write to, with how to name them.
create or replace function dm_people() returns table (user_id uuid, name text, house_name text, role text)
language sql stable security definer set search_path = public, auth as $$
  with me as (
    select auth.uid() as uid, jwt_role() as r, coalesce(current_house_id(), member_house_id()) as h
  ), people as (
    select a.user_id, m.name, hs.name as house_name, 'member'::text as role, m.house_id
      from member_accounts a join members m on m.id = a.member_id join houses hs on hs.id = m.house_id
     where a.user_id is not null and coalesce(m.active, true)
    union all
    select u.id,
           case u.raw_app_meta_data ->> 'role' when 'admin' then 'Админ' when 'inspector' then 'CL' else 'Капитан' end,
           hs.name, u.raw_app_meta_data ->> 'role', hs.id
      from auth.users u left join houses hs on hs.id = nullif(u.raw_app_meta_data ->> 'house_id', '')::uuid
     where u.raw_app_meta_data ->> 'role' in ('admin', 'leader', 'inspector')
  )
  select p.user_id, p.name, p.house_name, p.role
    from people p, me
   where me.uid is not null and p.user_id <> me.uid and (
         is_admin()
      or (me.r = 'leader' and (p.role in ('admin', 'leader', 'inspector') or p.house_id = me.h))
      or (me.r = 'inspector' and p.role in ('admin', 'leader'))
      or (me.r = 'member' and me.h is not null and (p.role = 'admin' or (p.role in ('leader', 'member') and p.house_id = me.h)))
   );
$$;
revoke all on function dm_people() from public, anon;
grant execute on function dm_people() to authenticated;

create or replace function can_dm(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dm_people() p where p.user_id = r);
$$;

create table if not exists direct_messages (
  id bigserial primary key,
  sender uuid not null default auth.uid(),
  recipient uuid not null,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists idx_dm_pair on direct_messages (least(sender, recipient), greatest(sender, recipient), created_at desc);
create index if not exists idx_dm_recipient on direct_messages (recipient, read_at);

create or replace function prepare_dm() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.sender := auth.uid();
  new.body := btrim(new.body);
  new.created_at := now();
  new.read_at := null;
  return new;
end;
$$;
drop trigger if exists prepare_dm on direct_messages;
create trigger prepare_dm before insert on direct_messages
  for each row execute function prepare_dm();

-- "Read": the recipient marks a conversation read (nothing else changes).
create or replace function mark_dm_read(peer uuid) returns void
language sql security definer set search_path = public as $$
  update direct_messages set read_at = now()
   where recipient = auth.uid() and sender = peer and read_at is null;
$$;
revoke all on function mark_dm_read(uuid) from public, anon;
grant execute on function mark_dm_read(uuid) to authenticated;

alter table direct_messages enable row level security;
drop policy if exists "read own dm" on direct_messages;
create policy "read own dm" on direct_messages for select to authenticated
  using (sender = auth.uid() or recipient = auth.uid());
drop policy if exists "write dm" on direct_messages;
create policy "write dm" on direct_messages for insert to authenticated
  with check (sender = auth.uid() and can_dm(recipient));
drop policy if exists "take back own dm" on direct_messages;
create policy "take back own dm" on direct_messages for delete to authenticated
  using (sender = auth.uid());
revoke all on direct_messages from anon;
grant select, insert, delete on direct_messages to authenticated;
grant usage, select on sequence direct_messages_id_seq to authenticated;

-- ---------------------------------------------------------------- live updates
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'direct_messages') then
      execute 'alter publication supabase_realtime add table direct_messages';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'jamaat_poll_votes') then
      execute 'alter publication supabase_realtime add table jamaat_poll_votes';
    end if;
  end if;
end $$;

-- Check.
select tablename, policyname, cmd from pg_policies
where tablename in ('jamaat_poll_votes', 'direct_messages') order by tablename, policyname;
