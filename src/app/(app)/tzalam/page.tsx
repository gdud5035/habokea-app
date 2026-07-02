import { requireTab } from "@/lib/guards";
import { getTzalamCompanyAccess } from "@/lib/permissions";
import { TzalamClient } from "./tzalam-client";

export const dynamic = "force-dynamic";

export default async function TzalamPage() {
  const profile = await requireTab("tzalam");
  const access = await getTzalamCompanyAccess(profile.id);
  return (
    <TzalamClient
      isAdmin={profile.is_admin}
      access={access}
      currentUserId={profile.id}
    />
  );
}
