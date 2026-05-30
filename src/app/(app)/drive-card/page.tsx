import { requireTab } from "@/lib/guards";
import DriveCardClient from "./drive-card-client";

export default async function DriveCardPage() {
  await requireTab("drive_card");
  return <DriveCardClient />;
}
