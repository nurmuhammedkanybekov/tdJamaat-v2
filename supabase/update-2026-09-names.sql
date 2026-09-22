-- ============================================================================
-- One-time fixup for the already-seeded database:
--   1. Corrects two house names/slugs (Danjanich -> Damjanich, Dobozy New -> Dobozy)
--   2. Transliterates the remaining Latin-script member names to Cyrillic
--
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Safe to run even if some of these have already been changed by hand —
-- each UPDATE only touches rows that still match the OLD value.
-- ============================================================================

begin;

-- --- Member names -----------------------------------------------------------
-- Matched by current house slug (still 'danjanich' / 'dobozy-new' at this
-- point in the script) + current name, so this only touches the exact rows
-- that still have the old spelling.

update members set name = 'Дөөлөт'    where name = 'Doolot'     and house_id = (select id from houses where slug = 'mester');
update members set name = 'Дауд'      where name = 'Daavud'     and house_id = (select id from houses where slug = 'mester');
update members set name = 'Азирет'    where name = 'Aziret'     and house_id = (select id from houses where slug = 'mester');
update members set name = 'Азат'      where name = 'Azat'       and house_id = (select id from houses where slug = 'mester');

update members set name = 'Абдулазим' where name = 'Abdulazim'  and house_id = (select id from houses where slug = 'danjanich');
update members set name = 'Адилет'    where name = 'Adilet'     and house_id = (select id from houses where slug = 'danjanich');
update members set name = 'Мухаммед'  where name = 'Muhammed'   and house_id = (select id from houses where slug = 'danjanich');
update members set name = 'Байэл'     where name = 'Bael'       and house_id = (select id from houses where slug = 'danjanich');
update members set name = 'Тилек'     where name = 'Tilek'      and house_id = (select id from houses where slug = 'danjanich');

update members set name = 'Бахтиер'   where name = 'Bakhtiar'   and house_id = (select id from houses where slug = 'pannonia');
update members set name = 'Мехмет'    where name = 'Mekhmet'    and house_id = (select id from houses where slug = 'pannonia');
update members set name = 'Данияр'    where name = 'Daniiar'    and house_id = (select id from houses where slug = 'pannonia');
update members set name = 'Нур'       where name = 'Nur'        and house_id = (select id from houses where slug = 'pannonia');
update members set name = 'Арафат'    where name = 'Arafat'     and house_id = (select id from houses where slug = 'pannonia');
update members set name = 'Эсен'      where name = 'Esen'       and house_id = (select id from houses where slug = 'pannonia');

update members set name = 'Азимбек'   where name = 'Azimbek'    and house_id = (select id from houses where slug = 'baksai');
update members set name = 'Нурманбет' where name = 'Nurmanbet'  and house_id = (select id from houses where slug = 'baksai');
update members set name = 'Улук'      where name = 'Uluk'       and house_id = (select id from houses where slug = 'baksai');
update members set name = 'Исабек'    where name = 'Isabek'     and house_id = (select id from houses where slug = 'baksai');
update members set name = 'Бобомурот' where name = 'Bobomurot'  and house_id = (select id from houses where slug = 'baksai');

update members set name = 'Айбек'     where name = 'Aibek'      and house_id = (select id from houses where slug = 'dobozy-new');
update members set name = 'Хамза'     where name = 'Hamza'      and house_id = (select id from houses where slug = 'dobozy-new');
update members set name = 'Алихан'    where name = 'Alikhan'    and house_id = (select id from houses where slug = 'dobozy-new');
update members set name = 'Алиер'     where name = 'Alier'      and house_id = (select id from houses where slug = 'dobozy-new');
update members set name = 'Алкелди'   where name = 'Alkeldi'    and house_id = (select id from houses where slug = 'dobozy-new');
update members set name = 'Абдурахмон' where name = 'Abdu'      and house_id = (select id from houses where slug = 'dobozy-new');
update members set name = 'Адилет'    where name = 'Adilet'     and house_id = (select id from houses where slug = 'dobozy-new');

-- --- House name/slug corrections --------------------------------------------
-- Do these LAST, since the member updates above still rely on the old slugs.

update houses set name = 'Damjanich', slug = 'damjanich' where slug = 'danjanich';
update houses set name = 'Dobozy',    slug = 'dobozy'    where slug = 'dobozy-new';

commit;

-- After running this: update scripts/auth-passwords.json on your Mac to use
-- the new keys "damjanich" and "dobozy" (see SETUP.md), then re-run
-- create-auth-users.js so the login accounts match the new house slugs.
