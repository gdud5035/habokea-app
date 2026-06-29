-- שבצק חמל round 2: per-סמבץ color + configurable day start hour.
-- ("בבית" reuses hamal_assignments with slot_start_hour = -1 — no schema change.)

alter table public.hamal_sambatzim add column if not exists color text;

insert into public.app_settings (key, value) values ('hamal_day_start_hour', '0')
on conflict (key) do nothing;
