-- Seed reference data for Habokea.

-- Roles
insert into public.roles (name) values ('admin'), ('manager'), ('viewer')
on conflict (name) do nothing;

-- Default tab access for non-admin roles (admin is handled in code = all tabs).
-- manager: everything except admin tab.
insert into public.role_tab_access (role_id, tab_key, can_access)
select r.id, t.tab_key, t.can_access
from public.roles r
cross join (values
  ('vehicles', true),
  ('drive_card', true),
  ('whatsapp', true),
  ('admin', false),
  ('profile', true)
) as t(tab_key, can_access)
where r.name = 'manager'
on conflict (role_id, tab_key) do nothing;

-- viewer: vehicles + profile only.
insert into public.role_tab_access (role_id, tab_key, can_access)
select r.id, t.tab_key, t.can_access
from public.roles r
cross join (values
  ('vehicles', true),
  ('drive_card', false),
  ('whatsapp', false),
  ('admin', false),
  ('profile', true)
) as t(tab_key, can_access)
where r.name = 'viewer'
on conflict (role_id, tab_key) do nothing;

-- Data helpers: vehicle models & usages (value + Hebrew).
insert into public.data_helpers (name, items) values
  ('vehicle_models', '[
    {"value":"david","translation_he":"דוד"},
    {"value":"tigris","translation_he":"טיגריס"},
    {"value":"triton","translation_he":"טרייטון"},
    {"value":"hilux","translation_he":"היילקס"},
    {"value":"ambulance","translation_he":"אמבולנס"},
    {"value":"hammer","translation_he":"האמר"}
  ]'::jsonb),
  ('vehicle_usages', '[
    {"value":"hapak","translation_he":"חפ\"ק"},
    {"value":"sioor","translation_he":"סיור"},
    {"value":"kk","translation_he":"כ\"כ"},
    {"value":"minhala","translation_he":"מנהלה"}
  ]'::jsonb)
on conflict (name) do nothing;
