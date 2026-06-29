-- שבצק חמל: per-day free-text rows ("הערות" / "התקפי").
create table if not exists public.hamal_day_text (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null,
  kind text not null, -- 'note' | 'attack'
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (shift_date, kind)
);

create index if not exists hamal_day_text_date_idx
  on public.hamal_day_text (shift_date);

alter table public.hamal_day_text enable row level security;

drop policy if exists hamal_day_text_all on public.hamal_day_text;
create policy hamal_day_text_all on public.hamal_day_text for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.hamal_day_text to anon, authenticated;
grant all on public.hamal_day_text to service_role;
