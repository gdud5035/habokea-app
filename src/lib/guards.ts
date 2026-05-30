import { redirect } from "next/navigation";
import { getCurrentProfile, getEffectivePermissions } from "@/lib/permissions";
import type { TabKey } from "@/lib/constants";

// Use at the top of a tab's page.tsx to enforce access server-side.
// Returns the current profile when allowed; redirects otherwise.
export async function requireTab(tab: TabKey) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const allowed = await getEffectivePermissions(profile.id);
  if (!allowed.has(tab)) redirect("/vehicles");
  return profile;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_admin) redirect("/vehicles");
  return profile;
}
