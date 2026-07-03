-- Optional default value for a "צלם" column. When set, the add-item form
-- pre-fills this column with the value; null means the field starts empty.
alter table public.tzalam_columns
  add column if not exists default_value text;
