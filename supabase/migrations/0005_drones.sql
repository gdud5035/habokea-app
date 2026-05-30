-- Drones tab: a simple registry of drones.
-- Only `name` is required; company (pluga) and signed_by are optional.
create table if not exists public.drones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  at_company text,
  signed_by text,
  created_at timestamptz not null default now()
);

alter table public.drones enable row level security;

-- Any authenticated user may read/write (operational data, same as vehicles).
drop policy if exists drones_all on public.drones;
create policy drones_all on public.drones for all to authenticated
  using (true) with check (true);

-- Base table privileges (RLS alone is not enough — roles need GRANTs).
grant select, insert, update, delete on public.drones to anon, authenticated;
grant all on public.drones to service_role;

-- Give the standard "משתמש" role access to the drones tab by default.
insert into public.role_tab_access (role_id, tab_key, can_access)
select r.id, 'drones', true
from public.roles r
where r.name = 'משתמש'
on conflict (role_id, tab_key) do nothing;
