-- שבצק חמל: start the displayed day at the morning shift (08:00) by default,
-- so the first row is 08:00–16:00 rather than the midnight shift.
-- Only updates installs still on the original midnight default; admins who
-- chose another start hour are left untouched. Stays configurable in settings.
update public.app_settings
  set value = '8', updated_at = now()
  where key = 'hamal_day_start_hour' and value = '0';

-- Fresh installs: seed the morning default.
insert into public.app_settings (key, value) values ('hamal_day_start_hour', '8')
on conflict (key) do nothing;
