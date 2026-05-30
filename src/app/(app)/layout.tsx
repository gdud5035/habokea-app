import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile, getEffectivePermissions } from "@/lib/permissions";
import type { TabKey } from "@/lib/constants";

// Authenticated route group. Resolves the user + permissions once for the whole
// section; the shell stays mounted across tab navigations.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // Force first-login password change.
  if (profile.must_change_password) redirect("/profile?changePassword=1");

  const allowed = await getEffectivePermissions(profile.id);
  const allowedTabs = Array.from(allowed) as TabKey[];
  const userName = profile.full_name || profile.email || "משתמש";

  return (
    <AppShell allowedTabs={allowedTabs} userName={userName}>
      {children}
    </AppShell>
  );
}
