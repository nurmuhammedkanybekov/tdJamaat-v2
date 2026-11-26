-- ============================================================================
-- tdJamaat — demo data for a fresh project.
--
-- Five houses and six invented people in each, so a new setup has something
-- to look at. The names are made up; the real roster is entered on the site
-- (Админ панели → Курам). Run after schema.sql, once.
-- ============================================================================

insert into houses (name, slug, display_order) values
  ('Mester', 'mester', 1),
  ('Damjanich', 'damjanich', 2),
  ('Pannonia', 'pannonia', 3),
  ('Baksai', 'baksai', 4),
  ('Dobozy', 'dobozy', 5);

-- Mester
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Айбек', 'imam', 1),
  ('Бектур', 'zam', 2),
  ('Нурсултан', 'member', 3),
  ('Эмир', 'member', 4),
  ('Самат', 'member', 5),
  ('Улан', 'member', 6)
) as m(name, role, ord)
where houses.slug = 'mester';

-- Damjanich
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Жоомарт', 'imam', 1),
  ('Темирлан', 'zam', 2),
  ('Курманбек', 'member', 3),
  ('Алмаз', 'member', 4),
  ('Кутман', 'member', 5),
  ('Бакай', 'member', 6)
) as m(name, role, ord)
where houses.slug = 'damjanich';

-- Pannonia
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Нурлан', 'imam', 1),
  ('Марат', 'zam', 2),
  ('Азамат', 'member', 3),
  ('Талант', 'member', 4),
  ('Эрлан', 'member', 5),
  ('Бекжан', 'member', 6)
) as m(name, role, ord)
where houses.slug = 'pannonia';

-- Baksai
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Мирлан', 'imam', 1),
  ('Чубак', 'zam', 2),
  ('Айдар', 'member', 3),
  ('Эрмек', 'member', 4),
  ('Санжар', 'member', 5),
  ('Дастан', 'member', 6)
) as m(name, role, ord)
where houses.slug = 'baksai';

-- Dobozy
insert into members (house_id, name, role, display_order)
select id, m.name, m.role, m.ord
from houses, (values
  ('Руслан', 'imam', 1),
  ('Бектемир', 'zam', 2),
  ('Нурбек', 'member', 3),
  ('Медер', 'member', 4),
  ('Жыргал', 'member', 5),
  ('Атай', 'member', 6)
) as m(name, role, ord)
where houses.slug = 'dobozy';

-- The first week; its dates are set on the site (Админ панели → Апталар).
insert into weeks (week_number, start_date, end_date) values (1, null, null);
