-- ============================================================================
-- Protect the history
--
-- 1. Deleting a house, a person or a week used to delete every result that
--    belonged to it (ON DELETE CASCADE). The website never deletes them (it
--    marks a house closed / a person as left), but one wrong click in the
--    Supabase table editor would have erased seasons of history. Now the
--    database refuses such a delete while results exist.
-- 2. Entered numbers are checked by the database too, not only by the
--    website: every value must be a number from 0 to 10,000,000.
--
-- Deletes and changes no data. Safe to re-run.
-- ============================================================================

-- 1. No cascading deletes of history -----------------------------------------
alter table members drop constraint if exists members_house_id_fkey;
alter table members add constraint members_house_id_fkey
  foreign key (house_id) references houses(id) on delete restrict;

alter table weekly_metrics drop constraint if exists weekly_metrics_member_id_fkey;
alter table weekly_metrics add constraint weekly_metrics_member_id_fkey
  foreign key (member_id) references members(id) on delete restrict;

alter table weekly_metrics drop constraint if exists weekly_metrics_week_number_fkey;
alter table weekly_metrics add constraint weekly_metrics_week_number_fkey
  foreign key (week_number) references weeks(week_number) on delete restrict;

alter table house_activity drop constraint if exists house_activity_house_id_fkey;
alter table house_activity add constraint house_activity_house_id_fkey
  foreign key (house_id) references houses(id) on delete restrict;

alter table house_activity drop constraint if exists house_activity_week_number_fkey;
alter table house_activity add constraint house_activity_week_number_fkey
  foreign key (week_number) references weeks(week_number) on delete restrict;

-- 2. Entered values must be sane numbers --------------------------------------
-- true when every value of a flat {"key": number} object is 0 … 10,000,000
create or replace function metric_values_ok(v jsonb) returns boolean
language sql immutable as $$
  select v is null or jsonb_typeof(v) <> 'object' or not exists (
    select 1 from jsonb_each(v) e
    where jsonb_typeof(e.value) <> 'null'
      and (jsonb_typeof(e.value) <> 'number' or (e.value)::text::numeric < 0 or (e.value)::text::numeric > 10000000)
  );
$$;

-- the mini-card is {"key": {"actual": n, "target": n}}
create or replace function activity_values_ok(v jsonb) returns boolean
language sql immutable as $$
  select v is null or jsonb_typeof(v) <> 'object' or not exists (
    select 1 from jsonb_each(v) e
    where jsonb_typeof(e.value) = 'object' and not metric_values_ok(e.value)
  );
$$;

-- Checked on new and changed rows only (existing rows are left as they are).
create or replace function check_entered_values() returns trigger
language plpgsql as $$
begin
  if tg_table_name = 'weekly_metrics' then
    if not metric_values_ok(new.actual) or not metric_values_ok(new.target) then
      raise exception 'Сан туура эмес: ар бир маани 0дөн 10 000 000го чейинки сан болушу керек.';
    end if;
  elsif not activity_values_ok(new.activity) then
    raise exception 'Сан туура эмес: ар бир маани 0дөн 10 000 000го чейинки сан болушу керек.';
  end if;
  return new;
end;
$$;

drop trigger if exists check_entered_values on weekly_metrics;
create trigger check_entered_values before insert or update on weekly_metrics
  for each row execute function check_entered_values();
drop trigger if exists check_entered_values on house_activity;
create trigger check_entered_values before insert or update on house_activity
  for each row execute function check_entered_values();

-- Check: every row must say "ok".
select conrelid::regclass::text || ' → ' || confrelid::regclass::text as check,
       case when confdeltype = 'r' then 'ok' else 'STILL CASCADES' end as result
from pg_constraint
where contype = 'f' and conname in ('members_house_id_fkey', 'weekly_metrics_member_id_fkey', 'weekly_metrics_week_number_fkey', 'house_activity_house_id_fkey', 'house_activity_week_number_fkey')
union all
select 'values are checked', case when count(*) = 2 then 'ok' else 'MISSING' end
from pg_trigger where tgname = 'check_entered_values' and not tgisinternal;
