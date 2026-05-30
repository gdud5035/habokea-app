-- Habokea (גדוד הבוקע 5035) — initial schema.
-- Apply via Supabase SQL editor or `supabase db push` with the service role.

create extension if not exists "pgcrypto";

-- ---------- roles ----------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text unique,
  role_id uuid references public.roles(id) on delete set null,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists profiles_phone_idx on public.profiles(phone);
create index if not exists profiles_role_idx on public.profiles(role_id);

-- ---------- per-role tab access ----------
create table if not exists public.role_tab_access (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  tab_key text not null,
  can_access boolean not null default false,
  unique (role_id, tab_key)
);

-- ---------- per-user overrides ----------
create table if not exists public.user_tab_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tab_key text not null,
  can_access boolean, -- null = no override
  unique (user_id, tab_key)
);

-- ---------- data_helpers (dropdown reference data) ----------
create table if not exists public.data_helpers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  items jsonb not null default '[]'::jsonb
);

-- ---------- vehicles ----------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_number text not null unique,
  status text not null default 'active',
  model text not null default '',
  at_company text not null default 'A',
  source text,
  km integer,
  next_treatment text,
  next_treatment_date date,
  treatments_log jsonb not null default '[]'::jsonb,
  usage text,
  back_from_garage date,
  notes text,
  license_expiration date,
  orea_last_fill date,
  treatment_freq integer,
  problem_desc text,
  no_orea boolean default false,
  km_last_update_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-stamp km_last_update_at when km changes (matches original backend logic).
create or replace function public.touch_km_last_update()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and new.km is not null)
     or (tg_op = 'UPDATE' and new.km is distinct from old.km) then
    new.km_last_update_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_km_touch on public.vehicles;
create trigger vehicles_km_touch
  before insert or update on public.vehicles
  for each row execute function public.touch_km_last_update();

-- ---------- drive_cards ----------
create table if not exists public.drive_cards (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null,
  driver_id uuid references public.profiles(id) on delete set null,
  start_km integer not null default 0,
  end_km integer not null default 0,
  from_location text not null default '',
  to_location text not null default '',
  purpose text not null default '',
  approved_by text not null default '',
  dispatcher_approval text,
  signature text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists drive_cards_vehicle_idx on public.drive_cards(vehicle_id);

-- ---------- push_subscriptions ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_sub_user_idx on public.push_subscriptions(user_id);

-- ---------- auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
