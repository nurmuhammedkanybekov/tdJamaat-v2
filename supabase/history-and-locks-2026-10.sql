-- ============================================================================
-- tdJamaat — change history + week locking (Oct 2026).
--
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run
--
-- Safe to run more than once. Nothing changes for leaders until the admin
-- actually locks a week. What it adds:
--
--   1. CHANGE HISTORY (audit_log). Every save into weekly_metrics or
--      house_activity is recorded: who (admin / which house), when, which
--      week, and the values before and after.
--        - the admin sees every house's history;
--        - a house leader sees only their own house's history;
--        - nobody can edit or delete history from the website.
--      The logging can NEVER block a save: if writing the log fails for any
--      reason, the save still goes through (a warning is logged instead).
--
--   2. WEEK LOCKING (weeks.locked). The admin can lock a finished week from
--      the admin panel. A locked week can't be changed by house leaders —
--      the database refuses it with a clear message. The admin can still
--      edit it, and can unlock it at any time. Every week starts unlocked.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Change history
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id bigserial primary key,
  table_name text not null,
  house_id uuid,
  member_id uuid,
  week_number int,
  action text not null,
  actor_id uuid,
  actor_role text,
  actor_house_id uuid,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists idx_audit_log_changed on audit_log (changed_at desc);
create index if not exists idx_audit_log_house on audit_log (house_id, changed_at desc);

alter table audit_log enable row level security;

drop policy if exists "read own audit_log" on audit_log;
create policy "read own audit_log" on audit_log
  for select to authenticated
  using (is_admin() or house_id = current_house_id());

-- No insert/update/delete policies: rows are written only by the trigger
-- below (security definer), never directly from the website.
revoke all on audit_log from anon;
grant select on audit_log to authenticated;


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
      if tg_op <> 'INSERT' then old_payload := jsonb_build_object('actual', old.actual, 'target', old.target); end if;
      if tg_op <> 'DELETE' then new_payload := jsonb_build_object('actual', new.actual, 'target', new.target); end if;
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

drop trigger if exists log_weekly_metrics_change on weekly_metrics;
create trigger log_weekly_metrics_change
  after insert or update or delete on weekly_metrics
  for each row execute function log_weekly_change();

drop trigger if exists log_house_activity_change on house_activity;
create trigger log_house_activity_change
  after insert or update or delete on house_activity
  for each row execute function log_weekly_change();


-- ---------------------------------------------------------------------------
-- 2. Week locking
-- ---------------------------------------------------------------------------
alter table weeks add column if not exists locked boolean not null default false;

-- Leaders only (a JWT carrying house_id). The admin and the SQL editor pass.
create or replace function block_locked_week() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wk int;
begin
  if current_house_id() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  wk := case when tg_op = 'DELETE' then old.week_number else new.week_number end;
  if exists (select 1 from weeks w where w.week_number = wk and w.locked) then
    raise exception '%-апта кулпуланган — өзгөртүү үчүн админге кайрылыңыз.', wk
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists block_locked_week_metrics on weekly_metrics;
create trigger block_locked_week_metrics
  before insert or update or delete on weekly_metrics
  for each row execute function block_locked_week();

drop trigger if exists block_locked_week_activity on house_activity;
create trigger block_locked_week_activity
  before insert or update or delete on house_activity
  for each row execute function block_locked_week();

-- Make the new column visible to the website right away.
notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- Check (one result table). You should see 4 triggers, the audit_log table,
-- and every week with locked = false.
-- ---------------------------------------------------------------------------
select * from (
  select 1 as sort, 'trigger' as item, tgname::text as detail, 'installed' as value
  from pg_trigger
  where tgname in ('log_weekly_metrics_change', 'log_house_activity_change', 'block_locked_week_metrics', 'block_locked_week_activity')
  union all
  select 2, 'table', 'audit_log', count(*)::text || ' rows' from audit_log
  union all
  select 3, 'week', week_number::text, case when locked then 'locked' else 'open' end from weeks
) checks
order by sort, detail;
