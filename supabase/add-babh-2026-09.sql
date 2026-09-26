-- ============================================================================
-- Add БАБХ to the house mini-card (Sept 2026). Run ONCE on the live database:
--   Supabase → SQL Editor → New query → paste this whole file → Run
-- Safe to run more than once. (Already included in season-2026-09.sql for a
-- fresh setup — this file is only for a database that ran the older version.)
--
--   1. Adds БАБХ with a target of 7 to the season's mini-card targets.
--   2. Updates the rule that protects mini-card targets: an activity a house
--      has never saved before (like БАБХ) now takes its target from the
--      season settings too, so a leader can't set their own.
-- Past weeks are unchanged; in them БАБХ simply counts as not done (0 / 7).
-- ============================================================================

update season_settings
set activity_targets = activity_targets || '{"БАБХ": 7}'::jsonb,
    updated_at = now()
where id = 1 and not (activity_targets ? 'БАБХ');

create or replace function keep_targets_on_house_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  source jsonb;      -- this week's saved row (update) or the house's latest earlier week
  defaults jsonb;    -- season_settings.activity_targets
  k text;
  merged jsonb := '{}'::jsonb;
begin
  if current_house_id() is null then
    return new;
  end if;

  select s.activity_targets into defaults from season_settings s where s.id = 1;

  if tg_op = 'UPDATE' then
    source := old.activity;
  else
    select ha.activity into source
    from house_activity ha
    where ha.house_id = new.house_id and ha.week_number < new.week_number
    order by ha.week_number desc
    limit 1;
  end if;

  -- Target per activity: the admin-set/previous value if there is one, else
  -- the season default (covers an activity added mid-season, like БАБХ),
  -- and only if neither exists, what was sent.
  for k in select jsonb_object_keys(new.activity) loop
    merged := merged || jsonb_build_object(
      k,
      jsonb_build_object(
        'actual', coalesce(new.activity -> k -> 'actual', '0'::jsonb),
        'target', coalesce(source -> k -> 'target', defaults -> k, new.activity -> k -> 'target')
      )
    );
  end loop;

  new.activity := merged;
  return new;
end;
$$;

-- Check: should show БАБХ = 7 among the targets.
select jsonb_pretty(activity_targets) as mini_card_targets from season_settings where id = 1;
