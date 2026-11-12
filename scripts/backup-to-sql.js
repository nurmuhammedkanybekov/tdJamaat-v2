// Turns a backup file (Админ панели → Камдык көчүрмө) into SQL that rebuilds
// the data in an EMPTY tdJamaat database.
//
//   node scripts/backup-to-sql.js tdjamaat-backup.json > restore.sql
//
// Then, in a NEW Supabase project: run the SQL files from SETUP.md step 2
// EXCEPT seed.sql, and after them run restore.sql in the SQL Editor. It
// refuses to run if the database already has results, so it can never
// overwrite a live database. Login accounts are not part of a backup: create
// them again with scripts/create-auth-users.js (SETUP.md step 4).
import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/backup-to-sql.js <backup.json> > restore.sql'); process.exit(1); }
const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
if (backup.app !== 'tdJamaat' || !backup.tables) { console.error('This is not a tdJamaat backup file.'); process.exit(1); }
const tables = backup.tables;

const D = '$';
// A dollar-quote tag that cannot appear in the data.
const quote = json => {
    let tag = 'tdj';
    while (json.includes(D + tag + D)) tag += 'x';
    return D + tag + D + json + D + tag + D;
};
const insert = (table, rows) => (rows && rows.length
    ? `insert into ${table} select * from jsonb_populate_recordset(null::${table}, ${quote(JSON.stringify(rows))}::jsonb);`
    : `-- ${table}: no rows in the backup`);

const out = [];
out.push(`-- tdJamaat restore, generated from a backup exported at ${backup.exported_at}`);
out.push('-- Run in the SQL Editor of an EMPTY project (all SETUP.md SQL files except seed.sql first).');
out.push('begin;');
out.push([
    `do ${D}guard${D} begin`,
    '  if exists (select 1 from weekly_metrics) or exists (select 1 from members) then',
    `    raise exception 'This database already has data. A backup can only be restored into an empty one.';`,
    '  end if;',
    `end ${D}guard${D};`
].join('\n'));
// The triggers (week locks, target rules, change history) are for live use:
// a restore must put the rows back exactly as they were.
for (const t of ['weekly_metrics', 'house_activity', 'members']) out.push(`alter table ${t} disable trigger user;`);
// Settings and seasons come from the backup, not from the setup files' defaults.
if (tables.season_settings?.length) out.push('delete from season_settings;');
if (tables.seasons?.length) out.push('delete from seasons;');
out.push(insert('houses', tables.houses));
if (tables.seasons?.length) out.push(insert('seasons', tables.seasons));
out.push(insert('season_settings', tables.season_settings));
out.push(insert('members', tables.members));
out.push(insert('weeks', tables.weeks));
out.push(insert('weekly_metrics', tables.weekly_metrics));
out.push(insert('house_activity', tables.house_activity));
if (tables.audit_log?.length) out.push(insert('audit_log', tables.audit_log));
for (const t of ['weekly_metrics', 'house_activity', 'members']) out.push(`alter table ${t} enable trigger user;`);
// Serial counters continue after the restored rows.
out.push(`select setval(pg_get_serial_sequence('seasons', 'id'), greatest((select coalesce(max(id), 1) from seasons), 1));`);
out.push(`select setval(pg_get_serial_sequence('audit_log', 'id'), greatest((select coalesce(max(id), 1) from audit_log), 1));`);
out.push('commit;');
out.push([
    `select 'houses' as "table", count(*) from houses union all select 'members', count(*) from members`,
    `union all select 'weeks', count(*) from weeks union all select 'weekly_metrics', count(*) from weekly_metrics`,
    `union all select 'house_activity', count(*) from house_activity union all select 'seasons', count(*) from seasons`,
    `union all select 'audit_log', count(*) from audit_log;`
].join('\n'));
process.stdout.write(out.join('\n') + '\n');
