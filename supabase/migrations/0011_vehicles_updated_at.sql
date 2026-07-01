-- Track when each vehicle row was last modified.
alter table public.vehicles
  add column if not exists updated_at timestamptz not null default now();

-- Backfill existing rows so the column isn't uniformly "now" after deploy.
update public.vehicles
  set updated_at = coalesce(km_last_update_at, created_at)
  where updated_at is null or updated_at = created_at;

-- Auto-stamp updated_at on every insert/update.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vehicles_touch_updated_at on public.vehicles;
create trigger vehicles_touch_updated_at
  before insert or update on public.vehicles
  for each row execute function public.touch_updated_at();
