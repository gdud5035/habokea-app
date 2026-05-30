import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/permissions";
import ProfileClient from "./profile-client";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ changePassword?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const sp = await searchParams;
  const forceChangePassword = sp.changePassword === "1";

  return (
    <ProfileClient profile={profile} forceChangePassword={forceChangePassword} />
  );
}
