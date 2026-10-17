-- ============================================================================
-- tdJamaat — excused weeks (Oct 2026).
--
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run
--
-- Safe to run more than once. Nothing changes for anyone until a leader or
-- the admin marks someone as excused. What it adds:
--
--   EXCUSED WEEK (weekly_metrics.excused). A house leader (or the admin) can
--   mark a person as excused for a week: sick, travelling, away from the
--   country. That week the person is left out of the house average and the
--   weekly ranking, and the week neither breaks nor extends their streaks.
--   Their row stays saved; un-marking brings everything back.
--
--   Same rules as every other field: a leader can only do it for their own
--   house (row-level security), a locked week can't be changed by leaders,
--   and the change appears in the change history.
--
-- The website keeps working before this file is run: it simply hides the
-- "excused" switch and never sends the new field.
-- ============================================================================

alter table weekly_metrics add column if not exists excused boolean not null default false;

-- Change history: also record the excused flag (same function as
-- history-and-locks-2026-10.sql, plus `excused`). Logging still can never
-- block a save.
create or replace function log_weekly_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec_house uuid;
  rec_member uuid;
  rec_week int;
  old_payload jsonb;
  new_payload jsonb;
begin
  begin
    if tg_table_name = 'weekly_metrics' then
      rec_member := coalesce(new.member_id, old.member_id);
      rec_week := coalesce(new.week_number, old.week_number);
      select m.house_id into rec_house from members m where m.id = rec_member;
      if tg_op <> 'INSERT' then old_payload := jsonb_build_object('actual', old.actual, 'target', old.target, 'excused', coalesce(to_jsonb(old) -> 'excused', 'false'::jsonb)); end if;
      if tg_op <> 'DELETE' then new_payload := jsonb_build_object('actual', new.actual, 'target', new.target, 'excused', coalesce(to_jsonb(new) -> 'excused', 'false'::jsonb)); end if;
    else
      rec_house := coalesce(new.house_id, old.house_id);
      rec_week := coalesce(new.week_number, old.week_number);
      if tg_op <> 'INSERT' then old_payload := jsonb_build_object('activity', old.activity); end if;
      if tg_op <> 'DELETE' then new_payload := jsonb_build_object('activity', new.activity); end if;
    end if;

    -- A re-save with identical values isn't a change worth recording.
    if tg_op = 'UPDATE' and old_payload is not distinct from new_payload then
      return null;
    end if;

    insert into audit_log (table_name, house_id, member_id, week_number, action, actor_id, actor_role, actor_house_id, old_data, new_data)
    values (
      tg_table_name, rec_house, rec_member, rec_week, tg_op,
      auth.uid(),
      coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'database'),
      current_house_id(),
      old_payload, new_payload
    );
  exception when others then
    raise warning 'tdJamaat audit log skipped: %', sqlerrm;
  end;
  return null;
end;
$$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Check (one result table): the column exists, and how many rows are
-- excused (0 right after running this).
-- ---------------------------------------------------------------------------
select 'column' as item, column_name::text as value
from information_schema.columns
where table_name = 'weekly_metrics' and column_name = 'excused'
union all
select 'excused_rows', count(*)::text from weekly_metrics where excused;
