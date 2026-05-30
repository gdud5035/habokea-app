import { requireAdmin } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminClient } from "./admin-client";
import type {
  DataHelperItem,
  DataHelperRow,
  ProfileRow,
  RoleRow,
  RoleTabAccessRow,
  UserTabOverrideRow,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const admin = createAdminClient();

  const [
    { data: rolesData },
    { data: usersData },
    { data: helpersData },
    { data: roleAccessData },
    { data: overridesData },
  ] = await Promise.all([
    admin.from("roles").select("*").order("name"),
    admin.from("profiles").select("*").order("full_name"),
    admin.from("data_helpers").select("*"),
    admin.from("role_tab_access").select("*"),
    admin.from("user_tab_overrides").select("*"),
  ]);

  const roles = (rolesData as RoleRow[] | null) ?? [];
  const users = (usersData as ProfileRow[] | null) ?? [];
  const helpers = (helpersData as DataHelperRow[] | null) ?? [];
  const roleAccess = (roleAccessData as RoleTabAccessRow[] | null) ?? [];
  const overrides = (overridesData as UserTabOverrideRow[] | null) ?? [];

  const helperItems = (name: string): DataHelperItem[] => {
    const row = helpers.find((h) => h.name === name);
    return (row?.items as DataHelperItem[] | undefined) ?? [];
  };

  return (
    <AdminClient
      vehicleModels={helperItems("vehicle_models")}
      vehicleUsages={helperItems("vehicle_usages")}
      roles={roles}
      users={users}
      roleAccess={roleAccess}
      overrides={overrides}
    />
  );
}
