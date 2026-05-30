-- Base table privileges for the API roles. RLS controls row visibility, but the
-- roles still need table-level GRANTs or every query returns 401/permission denied.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- service_role bypasses RLS but STILL needs table grants. Admin screens use it
-- via createAdminClient(); without this, admin queries return 403 and the user
-- list renders empty.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
