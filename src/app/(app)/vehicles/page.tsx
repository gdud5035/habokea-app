import { requireTab } from "@/lib/guards";
import { VehiclesClient } from "./vehicles-client";

export default async function VehiclesPage() {
  await requireTab("vehicles");
  return <VehiclesClient />;
}
