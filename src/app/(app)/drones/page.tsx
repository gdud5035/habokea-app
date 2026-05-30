import { requireTab } from "@/lib/guards";
import { DronesClient } from "./drones-client";

export default async function DronesPage() {
  await requireTab("drones");
  return <DronesClient />;
}
