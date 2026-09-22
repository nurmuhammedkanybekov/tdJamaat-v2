-- ============================================================================
-- tdJamaat v2 seed data — houses and members from the current roster
--
-- Run this AFTER schema.sql, once, in the same Supabase project.
-- Photos aren't set here (photo_url is left null) — see SETUP.md for how to
-- add them once you have the image files.
--
-- Names are in Kyrgyz/Russian Cyrillic per the community's actual roster.
-- ============================================================================

insert into houses (name, slug, display_order) values
  ('Mester',      'mester',      1),
  ('Damjanich',   'damjanich',   2),
  ('Pannonia',    'pannonia',    3),
  ('Baksai',      'baksai',      4),
  ('Dobozy',      'dobozy',      5);

-- Mester
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Дөөлөт',     'imam',   1),
  ('Дауд',       'zam',    2),
  ('Азирет',     'member', 3),
  ('Эрбол',      'member', 4),
  ('Азат',       'member', 5),
  ('Майрамбек',  'member', 6)
) as m(name, role, ord)
where houses.slug = 'mester';

-- Damjanich
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Абдулазим', 'imam',   1),
  ('Адилет',    'zam',    2),
  ('Мухаммед',  'member', 3),
  ('Байэл',     'member', 4),
  ('Тилек',     'member', 5),
  ('Шахрук',    'member', 6)
) as m(name, role, ord)
where houses.slug = 'damjanich';

-- Pannonia
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Бахтиер', 'imam',   1),
  ('Мехмет',  'zam',    2),
  ('Данияр',  'member', 3),
  ('Нур',     'member', 4),
  ('Арафат',  'member', 5),
  ('Эсен',    'member', 6)
) as m(name, role, ord)
where houses.slug = 'pannonia';

-- Baksai
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Азимбек',   'imam',   1),
  ('Нурманбет', 'zam',    2),
  ('Улук',      'member', 3),
  ('Исабек',    'member', 4),
  ('Бобомурот', 'member', 5)
) as m(name, role, ord)
where houses.slug = 'baksai';

-- Dobozy
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Айбек',   'imam',   1),
  ('Хамза',   'zam',    2),
  ('Алихан',  'member', 3),
  ('Алиер',   'member', 4),
  ('Алкелди', 'member', 5),
  ('Абдурахмон', 'member', 6),
  ('Адилет',  'member', 7)
) as m(name, role, ord)
where houses.slug = 'dobozy';

-- First reporting week — adjust the date range to whatever week 1 actually is
insert into weeks (week_number, start_date, end_date) values
  (1, null, null);
