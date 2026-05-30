-- Row Level Security for Habokea.
-- Model: any authenticated user can read/write the shared operational data
-- (vehicles, drive cards, data helpers). Profiles/roles/permissions are
-- admin-managed; users can read+update their own profile. Fine-grained tab
-- gating is enforced in the app layer (layout + server actions); RLS here is
-- the security backstop.

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid() and r.name = 'admin'
  );
$$;

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.role_tab_access enable row level security;
alter table public.user_tab_overrides enable row level security;
alter table public.data_helpers enable row level security;
alter table public.vehicles enable row level security;
alter table public.drive_cards enable row level security;
alter table public.push_subscriptions enable row level security;

-- roles: everyone authed can read; only admin writes.
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to authenticated using (true);
drop policy if exists roles_admin on public.roles;
create policy roles_admin on public.roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: read own + admin reads all; update own; admin all.
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- role_tab_access: read all authed; write admin.
drop policy if exists rta_read on public.role_tab_access;
create policy rta_read on public.role_tab_access for select to authenticated using (true);
drop policy if exists rta_admin on public.role_tab_access;
create policy rta_admin on public.role_tab_access for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- user_tab_overrides: read own + admin; write admin.
drop policy if exists uto_read on public.user_tab_overrides;
create policy uto_read on public.user_tab_overrides for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists uto_admin on public.user_tab_overrides;
create policy uto_admin on public.user_tab_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- data_helpers: read all authed; write admin.
drop policy if exists dh_read on public.data_helpers;
create policy dh_read on public.data_helpers for select to authenticated using (true);
drop policy if exists dh_admin on public.data_helpers;
create policy dh_admin on public.data_helpers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- vehicles: any authenticated user may read/write (operational data).
drop policy if exists vehicles_all on public.vehicles;
create policy vehicles_all on public.vehicles for all to authenticated
  using (true) with check (true);

-- drive_cards: any authenticated user may read/write.
drop policy if exists dc_all on public.drive_cards;
create policy dc_all on public.drive_cards for all to authenticated
  using (true) with check (true);

-- push_subscriptions: manage own; admin reads all (to send).
drop policy if exists ps_own on public.push_subscriptions;
create policy ps_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
