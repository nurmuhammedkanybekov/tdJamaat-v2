-- ============================================================================
-- tdJamaat v2 schema
--
-- Replaces the old single "records" table (one JSON blob per team per week)
-- with a normalized model: houses and members are persistent rows you manage
-- once, and each week just adds new metric rows against them. Roster changes
-- (new house, new member, someone moving house) are now a real edit instead
-- of something that only exists implicitly inside a week's JSON blob.
--
-- Run this whole file once in a fresh Supabase project's SQL Editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Houses (formerly "teams")
-- ---------------------------------------------------------------------------
create table houses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,           -- display name, e.g. "Danjanich"
  slug text not null unique,           -- stable identifier used for login, e.g. "damjanich"
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column houses.slug is
  'Used to build that house''s login email (<slug>@tdjamaat.internal). Change the display name freely; avoid changing the slug once an auth account exists for it.';

-- ---------------------------------------------------------------------------
-- Members (persistent roster — entered once, not re-typed every week)
-- ---------------------------------------------------------------------------
create table members (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  name text not null,
  role text not null check (role in ('imam', 'zam', 'member')),
  photo_url text,
  display_order int not null default 0,
  active boolean not null default true, -- soft-remove instead of deleting, keeps history intact
  created_at timestamptz not null default now()
);

create index idx_members_house on members(house_id);

-- ---------------------------------------------------------------------------
-- Weeks (period metadata — one row per reporting week)
-- ---------------------------------------------------------------------------
create table weeks (
  week_number int primary key,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Per-member weekly metric entries (the 8 individual metrics: К-К, СВТ, ...)
-- ---------------------------------------------------------------------------
create table weekly_metrics (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  week_number int not null references weeks(week_number) on delete cascade,
  actual jsonb not null default '{}'::jsonb,
  target jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (member_id, week_number)
);

create index idx_weekly_metrics_week on weekly_metrics(week_number);
create index idx_weekly_metrics_member on weekly_metrics(member_id);

-- ---------------------------------------------------------------------------
-- Per-house weekly "mini card" team activity (the team-level activities — 7 as of Sept 2026, incl. БАБХ)
-- ---------------------------------------------------------------------------
create table house_activity (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  week_number int not null references weeks(week_number) on delete cascade,
  activity jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (house_id, week_number)
);

create index idx_house_activity_week on house_activity(week_number);

-- ============================================================================
-- Row Level Security
--
-- Design: anyone (anon) can READ everything — the dashboard is meant to be
-- public within the community, no login needed to view it. WRITES require an
-- authenticated Supabase Auth session:
--   - a "leader" account (user_metadata: { role: 'leader', house_id: <uuid> })
--     can only write weekly_metrics/house_activity for THEIR OWN house_id.
--     They cannot touch houses/members/weeks structure at all.
--   - the "admin" account (user_metadata: { role: 'admin' }) can do anything,
--     including managing the house/member roster and week list.
-- This is enforced by Postgres itself, not just hidden in the UI — a leaked
-- leader password can only ever affect that one house's scores.
-- ============================================================================

alter table houses enable row level security;
alter table members enable row level security;
alter table weeks enable row level security;
alter table weekly_metrics enable row level security;
alter table house_activity enable row level security;

-- Public read access (dashboard is public)
create policy "public read houses" on houses for select using (true);
create policy "public read members" on members for select using (true);
create policy "public read weeks" on weeks for select using (true);
create policy "public read weekly_metrics" on weekly_metrics for select using (true);
create policy "public read house_activity" on house_activity for select using (true);

-- Helper functions read the role/house_id out of the signed-in user's JWT
create or replace function is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function current_house_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'house_id', '')::uuid;
$$;

-- Structural tables: admin only
create policy "admin manage houses" on houses
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "admin manage members" on members
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "admin manage weeks" on weeks
  for all to authenticated using (is_admin()) with check (is_admin());

-- Only the admin opens weeks; leaders fill in weeks that exist.
-- Season rules (admin-only targets, stored minimums) live in
-- supabase/season-2026-09.sql — run it after this file.

-- Weekly data tables: admin can touch anything, a leader only their own house
create policy "leader/admin write weekly_metrics" on weekly_metrics
  for all to authenticated
  using (is_admin() or member_id in (select id from members where house_id = current_house_id()))
  with check (is_admin() or member_id in (select id from members where house_id = current_house_id()));

create policy "leader/admin write house_activity" on house_activity
  for all to authenticated
  using (is_admin() or house_id = current_house_id())
  with check (is_admin() or house_id = current_house_id());
