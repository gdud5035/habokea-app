-- "צלם" feature: per-company equipment ("אמצעים") control table + daily presence check.
-- Config tables (groups / equipment types / columns / user-company access) are
-- admin-managed. Operational tables (items / daily marks / daily locks) follow the
-- existing convention: any authenticated user may read/write; per-company scoping and
-- day-locking are enforced in the app layer (RLS here is the security backstop).

-- ---------- tzalam_groups (equipment groups, e.g. "נפיצים") ----------
create table if not exists public.tzalam_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tzalam_groups enable row level security;

drop policy if exists tzalam_groups_read on public.tzalam_groups;
create policy tzalam_groups_read on public.tzalam_groups for select to authenticated
  using (true);
drop policy if exists tzalam_groups_admin on public.tzalam_groups;
create policy tzalam_groups_admin on public.tzalam_groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.tzalam_groups to anon, authenticated;
grant all on public.tzalam_groups to service_role;

-- ---------- tzalam_equipment_types (configurable equipment kinds) ----------
create table if not exists public.tzalam_equipment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id uuid references public.tzalam_groups(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tzalam_equipment_types enable row level security;

drop policy if exists tzalam_types_read on public.tzalam_equipment_types;
create policy tzalam_types_read on public.tzalam_equipment_types for select to authenticated
  using (true);
drop policy if exists tzalam_types_admin on public.tzalam_equipment_types;
create policy tzalam_types_admin on public.tzalam_equipment_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.tzalam_equipment_types to anon, authenticated;
grant all on public.tzalam_equipment_types to service_role;

-- Seed the initial equipment types (only when the table is empty).
insert into public.tzalam_equipment_types (name, position)
select name, (ord - 1)
from (values
  ($$M4 לוחם$$, 1),
  ($$M16 קצר$$, 2),
  ($$אמרל שח"מ$$, 3),
  ($$M4 קלע$$, 4),
  ($$אקילה$$, 5),
  ($$מאג 7.62$$, 6),
  ($$מטולון$$, 7),
  ($$אמרל שפנפן חד עיני$$, 8),
  ($$אווטה 2$$, 9),
  ($$אמרל עידו$$, 10),
  ($$מקלע נגב$$, 11),
  ($$משקפי vr גוגלס 3$$, 12),
  ($$שלט הפעלה אווטה 2$$, 13),
  ($$רחפן MAVIC 3 T$$, 14),
  ($$אמרל מיקרון$$, 15),
  ($$אקילה X6 לרובץ$$, 16),
  ($$רוב''ץ$$, 17),
  ($$שלט MAVIC 3 T$$, 18),
  ($$מתקן הטלה רימון רסס רחפן evomax$$, 19),
  ($$לאו$$, 20),
  ($$מאג$$, 21),
  ($$נפיץ$$, 22),
  ($$צלפים$$, 23),
  ($$רסס$$, 24),
  ($$הלם$$, 25),
  ($$רימון עשן אפור$$, 26),
  ($$שלישיות גומי$$, 27),
  ($$תחמיש$$, 28),
  ($$מטול תאורה$$, 29),
  ($$מטול גז 40$$, 30),
  ($$מדוכה$$, 31)
) as v(name, ord)
where not exists (select 1 from public.tzalam_equipment_types);

-- ---------- tzalam_columns (configurable item columns) ----------
create table if not exists public.tzalam_columns (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  field_type text not null default 'text' check (field_type in ('text', 'number')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tzalam_columns enable row level security;

drop policy if exists tzalam_columns_read on public.tzalam_columns;
create policy tzalam_columns_read on public.tzalam_columns for select to authenticated
  using (true);
drop policy if exists tzalam_columns_admin on public.tzalam_columns;
create policy tzalam_columns_admin on public.tzalam_columns for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.tzalam_columns to anon, authenticated;
grant all on public.tzalam_columns to service_role;

-- Seed the initial built-in columns (only when the table is empty).
insert into public.tzalam_columns (label, field_type, position)
select label, field_type, position
from (values
  ($$חייל חתום$$, 'text', 0),
  ($$צ' / מספר סידורי$$, 'text', 1),
  ($$כמות בפלוגה$$, 'number', 2),
  ($$הערות$$, 'text', 3)
) as v(label, field_type, position)
where not exists (select 1 from public.tzalam_columns);

-- ---------- tzalam_items (the equipment rows) ----------
create table if not exists public.tzalam_items (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  equipment_type_id uuid references public.tzalam_equipment_types(id) on delete set null,
  attributes jsonb not null default '{}'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tzalam_items_company_idx on public.tzalam_items (company);

-- Reuse the shared touch_updated_at() trigger function (defined in 0011).
drop trigger if exists tzalam_items_touch_updated_at on public.tzalam_items;
create trigger tzalam_items_touch_updated_at
  before insert or update on public.tzalam_items
  for each row execute function public.touch_updated_at();

alter table public.tzalam_items enable row level security;

drop policy if exists tzalam_items_all on public.tzalam_items;
create policy tzalam_items_all on public.tzalam_items for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.tzalam_items to anon, authenticated;
grant all on public.tzalam_items to service_role;

-- ---------- tzalam_daily_marks (per-day presence check) ----------
create table if not exists public.tzalam_daily_marks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.tzalam_items(id) on delete cascade,
  mark_date date not null,
  present boolean not null default false,
  marked_by uuid references public.profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  unique (item_id, mark_date)
);

create index if not exists tzalam_daily_marks_date_idx on public.tzalam_daily_marks (mark_date);

alter table public.tzalam_daily_marks enable row level security;

drop policy if exists tzalam_daily_marks_all on public.tzalam_daily_marks;
create policy tzalam_daily_marks_all on public.tzalam_daily_marks for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.tzalam_daily_marks to anon, authenticated;
grant all on public.tzalam_daily_marks to service_role;

-- ---------- tzalam_daily_locks (a company's daily report is "סיימתי") ----------
create table if not exists public.tzalam_daily_locks (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  lock_date date not null,
  locked_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz not null default now(),
  unique (company, lock_date)
);

create index if not exists tzalam_daily_locks_date_idx on public.tzalam_daily_locks (lock_date);

alter table public.tzalam_daily_locks enable row level security;

drop policy if exists tzalam_daily_locks_all on public.tzalam_daily_locks;
create policy tzalam_daily_locks_all on public.tzalam_daily_locks for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.tzalam_daily_locks to anon, authenticated;
grant all on public.tzalam_daily_locks to service_role;

-- ---------- tzalam_user_companies (per-user company view/edit access) ----------
create table if not exists public.tzalam_user_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company text not null,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, company)
);

alter table public.tzalam_user_companies enable row level security;

-- Read own rows + admin reads all; only admin writes.
drop policy if exists tzalam_uc_read on public.tzalam_user_companies;
create policy tzalam_uc_read on public.tzalam_user_companies for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists tzalam_uc_admin on public.tzalam_user_companies;
create policy tzalam_uc_admin on public.tzalam_user_companies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.tzalam_user_companies to anon, authenticated;
grant all on public.tzalam_user_companies to service_role;
