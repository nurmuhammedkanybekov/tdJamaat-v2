-- ============================================================================
-- tdJamaat — members see the jamaat's results (Nov 2026).
--
--   Supabase → SQL Editor → New query → paste this whole file → Run.
--   Safe to run more than once. Needs members-2026-11.sql.
--
-- A member who signed in with Google could read only their own house. Now
-- they also see the whole jamaat on #/jamaat: what everyone did together,
-- the race of the houses, each house's share. The numbers of other houses
-- come WITHOUT people's names or photos: a member of another house is only
-- "a member" with their numbers. The member's own house keeps its names.
-- Nothing else changes: the tables' rules stay as they are; this one
-- function hands out the anonymous copy, to signed-in members only.
-- ============================================================================

create or replace function jamaat_rows() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when current_member_id() is null then null else jsonb_build_object(
    'houses', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'name', h.name, 'display_order', h.display_order, 'active', h.active) order by h.display_order), '[]'::jsonb) from houses h),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'house_id', m.house_id, 'role', m.role, 'display_order', m.display_order, 'active', m.active, 'photo_url', null,
        'name', case when m.house_id = member_house_id() then m.name else null end) order by m.display_order), '[]'::jsonb) from members m),
    'weeks', (select coalesce(jsonb_agg(to_jsonb(w) order by w.week_number), '[]'::jsonb) from weeks w),
    'metrics', (select coalesce(jsonb_agg(to_jsonb(x) - 'updated_at' - 'updated_by' - 'created_at'), '[]'::jsonb) from weekly_metrics x),
    'activities', (select coalesce(jsonb_agg(jsonb_build_object('house_id', a.house_id, 'week_number', a.week_number, 'activity', a.activity)), '[]'::jsonb) from house_activity a),
    'tazalyk', (select coalesce(jsonb_agg(jsonb_build_object('house_id', z.house_id, 'week_number', z.week_number, 'scores', z.scores)), '[]'::jsonb) from house_tazalyk z)
  ) end;
$$;

revoke all on function jamaat_rows() from public, anon;
grant execute on function jamaat_rows() to authenticated;

notify pgrst, 'reload schema';

-- Check: one function, for signed-in accounts.
select proname, prosecdef as runs_as_owner from pg_proc where proname = 'jamaat_rows';
