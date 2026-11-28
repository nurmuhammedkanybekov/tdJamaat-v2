-- Personal accounts: anyone may sign in with Google and keep their own
-- zikr counts, tasbihat, Quran pages, bookmarks and city on every device.
--
-- A Google account that a captain has tied to a member (members-2026-11.sql)
-- is that member, as before. Any other Google account is a guest: it sees no
-- house, no person, no result and no chat (every one of those tables already
-- asks for a captain, the admin or a tied member). All it gets is the one
-- table below, holding its own rows only.
--
-- Not for e-mail accounts: a sign-up with an address and a password (which
-- the site never offers) gets nothing here either.
--
-- Run once in the Supabase SQL editor, after members-2026-11.sql. Safe to run
-- again. Needs "Allow new users to sign up" on (Authentication → Sign In /
-- Providers), as Google sign-in already does.

-- ---------------------------------------------------------------- the store
create table if not exists user_store (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null check (pg_column_size(value) <= 262144),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- What may be kept (one row each): the app's own stores.
alter table user_store drop constraint if exists user_store_key_check;
alter table user_store add constraint user_store_key_check
  check (key in ('zikr', 'practice', 'quran', 'tasbihat', 'city', 'calendar'));

create or replace function touch_user_store() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists touch_user_store on user_store;
create trigger touch_user_store before insert or update on user_store
  for each row execute function touch_user_store();

-- A personal Google account: no staff role, signed in through Google.
create or replace function is_personal_google() returns boolean
language sql stable as $$
  select auth.uid() is not null
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = ''
     and auth.jwt() -> 'app_metadata' ->> 'provider' = 'google';
$$;

alter table user_store enable row level security;
drop policy if exists "own store" on user_store;
create policy "own store" on user_store for all to authenticated
  using (user_id = auth.uid() and is_personal_google())
  with check (user_id = auth.uid() and is_personal_google());

revoke all on user_store from anon;
grant select, insert, update, delete on user_store to authenticated;

-- ---------------------------------------------------------------- leaving
-- A person may delete their own Google account and everything it saved.
-- Staff logins (captains, CL, the admin) cannot delete themselves this way.
-- A member's results stay with the house; only the login goes, and the
-- captain's address for them stays, so signing in again ties it back.
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_personal_google() then
    raise exception 'only a personal Google account can be deleted here';
  end if;
  -- A member's account (tied to a person of a house) is removed by the admin only.
  if current_member_id() is not null then
    raise exception 'a member''s account is removed by the admin';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;

-- Check.
select tablename, policyname, cmd from pg_policies where tablename = 'user_store';
