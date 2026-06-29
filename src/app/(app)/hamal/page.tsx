import { requireTab } from "@/lib/guards";
import { getCurrentProfile } from "@/lib/permissions";
import { HamalClient } from "./hamal-client";

export default async function HamalPage() {
  await requireTab("hamal");
  const profile = await getCurrentProfile();
  return (
    <HamalClient
      isAdmin={profile?.is_admin ?? false}
      userPhone={profile?.phone ?? null}
    />
  );
}
