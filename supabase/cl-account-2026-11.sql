-- ============================================================================
-- tdJamaat — the CL login (the Тазалык inspector), Nov 2026.
--
-- First create the account itself (no password ever goes into this file):
--   Supabase → Authentication → Users → Add user → Create new user
--     Email:     inspector@tdjamaat.internal
--     Password:  the CL password
--     [x] Auto Confirm User
--
-- Then: Supabase → SQL Editor → New query → paste this whole file → Run.
-- It gives that account the CL role ('inspector'): Тазалык for every house,
-- Жамааттын сөзү and Капитандар — and no results. Safe to run more than once.
-- CL signs in on the site: Кирүү → "CL" → the password.
-- ============================================================================

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "inspector"}'::jsonb
where email = 'inspector@tdjamaat.internal';

-- Check: one row, role inspector. No row means the account was not created yet.
select email, raw_app_meta_data ->> 'role' as role, email_confirmed_at is not null as confirmed
from auth.users where email = 'inspector@tdjamaat.internal';
