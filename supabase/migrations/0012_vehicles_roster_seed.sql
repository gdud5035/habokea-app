-- Migrate vehicle roster from 'פיזור נהגים - לי ויהלי' CSV.
-- Adds new model/usage reference entries, then inserts the vehicles.

-- New vehicle models not already in the reference list (idempotent append).
update public.data_helpers
set items = items || '[{"value":"mazda-2","translation_he":"מאזדה 2"},{"value":"suzuki-swift","translation_he":"סוזוקי סוויפט"},{"value":"ford","translation_he":"פורד"},{"value":"dmax","translation_he":"דימקס"},{"value":"hyundai-i10","translation_he":"יונדאי i10"}]'::jsonb
where name = 'vehicle_models' and not (items @> '[{"value":"mazda-2"}]'::jsonb) and not (items @> '[{"value":"suzuki-swift"}]'::jsonb) and not (items @> '[{"value":"ford"}]'::jsonb) and not (items @> '[{"value":"dmax"}]'::jsonb) and not (items @> '[{"value":"hyundai-i10"}]'::jsonb);

-- New vehicle usages not already in the reference list (idempotent append).
update public.data_helpers
set items = items || '[{"value":"magad","translation_he":"מג\"ד"}]'::jsonb
where name = 'vehicle_usages' and not (items @> '[{"value":"magad"}]'::jsonb);

-- Vehicles.
insert into public.vehicles
  (vehicle_number, status, model, at_company, usage, km, next_treatment, notes)
values
  ('617-580', 'active', 'david', 'Palsam', 'hapak-magad', 49175, '50,000', 'שיוך: יהודה'),
  ('219-191', 'active', 'tigris', 'Palsam', 'taagad', null, '600 שע"מ', 'שיוך: יהודה | שעות מנוע: 576'),
  ('561-341', 'active', 'light-ambulance', 'Palsam', 'taagad', 44224, '64,000', 'שיוך: יהודה'),
  ('706-934', 'active', 'katakal', 'Palsam', 'tene', 17833, '22,000', 'שיוך: יהודה'),
  ('600-574', 'active', 'inter', 'Palsam', 'logistica', 268663, '268,000', 'אצל 5035 - לבדוק של מי היא'),
  ('849-50-302', 'active', 'mazda-2', 'Palsam', 'magad', 125753, '135000', null),
  ('172-40-403', 'active', 'kia-picanto', 'Palsam', 'kesher', 87036, '90000', null),
  ('659-49-103', 'active', 'suzuki-swift', 'Palsam', 'mapam', 70067, '75000', 'להשלים ק"מ'),
  ('517-57-003', 'active', 'ford', 'Palsam', 'logistica', null, '140000', null),
  ('899-465', 'active', 'dmax', 'Palsam', 'rechev', 10690, '120000', null),
  ('617-070', 'active', 'david', 'A', 'hapak', 255634, null, 'אין מראה על דלת מפקד'),
  ('281-955', 'active', 'triton', 'A', 'sioor', 117778, '120,000', null),
  ('274-035', 'active', 'savana', 'A', 'konenoot', 234107, '235,000', null),
  ('707-598', 'active', 'hammer', 'A', 'fillbox', null, '65,000', 'עם התקן מאג | פירוט: סיור'),
  ('649-05-003', 'active', 'kia-picanto', 'A', 'mempay', 52269, '60000', null),
  ('517-51-903', 'disabled', 'ford', 'A', 'rasap', null, null, null),
  ('617-044', 'active', 'david', 'B', 'hapak', 151131, '155,000', 'פירוט: טויוטה'),
  ('281-813', 'active', 'triton', 'B', 'sioor', 212313, '220,000', 'להשלים מטף מהלוגיסטיקה'),
  ('219-215', 'active', 'tigris', 'B', 'hetz-darooch', null, '1500 שע"מ', 'שעות מנוע: 1313'),
  ('700-937', 'active', 'hammer', 'B', 'fillbox', 15114, '18,000', 'פירוט: סיור'),
  ('64914203', 'active', 'kia-picanto', 'B', 'mempay', 41832, null, null),
  ('899-475', 'active', 'dmax', 'B', 'rasap', 108774, null, null),
  ('617-326', 'active', 'david', 'C', 'hapak', 46628, '50,000', null),
  ('617-038', 'active', 'david', 'C', 'sioor', 255500, null, 'פירוט: סיור'),
  ('219-043', 'active', 'tigris', 'C', 'konenoot', null, '5,250', 'שעות מנוע: 5,125'),
  ('706-385', 'active', 'hammer', 'C', 'fillbox', 2618, '7,000', 'פירוט: מנהלה'),
  ('895-95-602', 'active', 'hyundai-i10', 'C', 'mempay', 101519, null, null),
  ('368-34-503', 'active', 'dmax', 'C', 'rasap', null, null, 'לבדוק ק"מ'),
  ('617-050', 'disabled', 'david', 'Mesayat', 'hapak', 125453, '130,000', null),
  ('281-944', 'active', 'triton', 'Mesayat', 'sioor', 196860, '200,000', null),
  ('275-166', 'active', 'savana', 'Mesayat', 'konenoot', 107236, '116,000', null),
  ('173-98-004', 'active', 'kia-picanto', 'Mesayat', 'mempay', 40123, null, null),
  ('33408604', 'active', 'hilux', 'Mesayat', 'rasap', 28270, null, null),
  ('701-105', 'disabled', 'hammer', 'Mesayat', null, null, null, 'חימוש חטיבה | פירוט: סיור, ללא מאג')
on conflict (vehicle_number) do nothing;
