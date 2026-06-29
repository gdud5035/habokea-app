-- שבצק חמל feature: configurable shift length + סמבצים registry + weekly assignments.

-- ---------- app_settings (generic key/value config) ----------
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Anyone authenticated may read settings (the grid needs the shift length);
-- only admins may write.
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated
  using (true);

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Grants permit the operations; the RLS policies above restrict writes to admins.
grant select, insert, update on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;

insert into public.app_settings (key, value) values ('hamal_shift_length_hours', '8')
on conflict (key) do nothing;

-- ---------- hamal_sambatzim (the people) ----------
create table if not exists public.hamal_sambatzim (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table public.hamal_sambatzim enable row level security;

-- Operational data: any authenticated user with screen access may read/write.
drop policy if exists hamal_sambatzim_all on public.hamal_sambatzim;
create policy hamal_sambatzim_all on public.hamal_sambatzim for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.hamal_sambatzim to anon, authenticated;
grant all on public.hamal_sambatzim to service_role;

-- ---------- hamal_assignments (one row per assigned person in a slot) ----------
-- slot_start_hour is the slot's start hour (0-23); the grid tiles the day from
-- 00:00 by the configured shift length. Max 2 people per slot is enforced in app.
create table if not exists public.hamal_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null,
  slot_start_hour int not null,
  sambatz_id uuid not null references public.hamal_sambatzim(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (shift_date, slot_start_hour, sambatz_id)
);

create index if not exists hamal_assignments_date_idx
  on public.hamal_assignments (shift_date);

alter table public.hamal_assignments enable row level security;

drop policy if exists hamal_assignments_all on public.hamal_assignments;
create policy hamal_assignments_all on public.hamal_assignments for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.hamal_assignments to anon, authenticated;
grant all on public.hamal_assignments to service_role;
