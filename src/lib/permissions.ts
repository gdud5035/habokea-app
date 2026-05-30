import { createClient } from "@/lib/supabase/server";
import {
  ALWAYS_ALLOWED_TABS,
  TAB_KEYS,
  type TabKey,
} from "@/lib/constants";

export type ProfileWithRole = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role_id: string | null;
  must_change_password: boolean;
  role_name: string | null;
  is_admin: boolean;
};

async function roleName(roleId: string | null): Promise<string | null> {
  if (!roleId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("roles")
    .select("name")
    .eq("id", roleId)
    .maybeSingle();
  return (data as { name: string } | null)?.name ?? null;
}

// Resolve the effective set of tabs a user may access:
// role defaults (role_tab_access) merged with per-user overrides (user_tab_overrides).
export async function getEffectivePermissions(
  userId: string,
): Promise<Set<TabKey>> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", userId)
    .maybeSingle();

  const roleId = (profile as { role_id: string | null } | null)?.role_id ?? null;
  const allowed = new Set<TabKey>(ALWAYS_ALLOWED_TABS);

  // Admins get everything.
  if ((await roleName(roleId)) === "admin") {
    return new Set<TabKey>(TAB_KEYS);
  }

  if (roleId) {
    const { data: roleAccess } = await supabase
      .from("role_tab_access")
      .select("tab_key, can_access")
      .eq("role_id", roleId);
    (roleAccess as { tab_key: string; can_access: boolean }[] | null)?.forEach(
      (r) => {
        if (r.can_access) allowed.add(r.tab_key as TabKey);
        else allowed.delete(r.tab_key as TabKey);
      },
    );
  }

  const { data: overrides } = await supabase
    .from("user_tab_overrides")
    .select("tab_key, can_access")
    .eq("user_id", userId);
  (overrides as { tab_key: string; can_access: boolean | null }[] | null)?.forEach(
    (o) => {
      if (o.can_access === null) return;
      if (o.can_access) allowed.add(o.tab_key as TabKey);
      else allowed.delete(o.tab_key as TabKey);
    },
  );

  // Profile is never removable.
  ALWAYS_ALLOWED_TABS.forEach((t) => allowed.add(t));
  return allowed;
}

// Current user's profile (with role name + is_admin convenience flag).
export async function getCurrentProfile(): Promise<ProfileWithRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role_id, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  const row = data as {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    role_id: string | null;
    must_change_password: boolean;
  } | null;

  if (!row) {
    return {
      id: user.id,
      full_name: null,
      email: user.email ?? null,
      phone: null,
      role_id: null,
      must_change_password: false,
      role_name: null,
      is_admin: false,
    };
  }

  const name = await roleName(row.role_id);
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role_id: row.role_id,
    must_change_password: row.must_change_password,
    role_name: name,
    is_admin: name === "admin",
  };
}
