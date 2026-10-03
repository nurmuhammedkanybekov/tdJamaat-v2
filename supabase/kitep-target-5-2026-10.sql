-- ============================================================================
-- tdJamaat — КИТЕП (house book reading) minimum: 7 → 5 for the whole season.
--
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run
--
-- Safe to run more than once. What it does:
--   1. Season default for КИТЕП becomes 5, so every new week (and every house
--      that hasn't submitted yet) starts from 5.
--   2. Every already-saved week where КИТЕП's target is still 7 is set to 5.
--      Weeks 1–2 were already fixed by hand and are left as they are. Any
--      other custom value (not 7) is left untouched.
-- The keep_targets trigger carries the previous week's target forward, so
-- after this the 5 carries on automatically.
-- ============================================================================

update season_settings
set activity_targets = activity_targets || '{"КИТЕП": 5}'::jsonb,
    updated_at = now()
where id = 1;

update house_activity
set activity = jsonb_set(activity, '{КИТЕП,target}', '5'::jsonb),
    updated_at = now()
where activity ? 'КИТЕП'
  and (activity -> 'КИТЕП' ->> 'target')::numeric = 7;

-- Check: the season default and every saved week's КИТЕП target.
select 'season default' as item, activity_targets ->> 'КИТЕП' as kitep_target
from season_settings where id = 1
union all
select h.name || ' — week ' || ha.week_number, ha.activity -> 'КИТЕП' ->> 'target'
from house_activity ha join houses h on h.id = ha.house_id
order by 1;
