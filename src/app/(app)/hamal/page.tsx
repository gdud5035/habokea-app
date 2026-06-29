import { requireTab } from "@/lib/guards";
import { HamalClient } from "./hamal-client";

export default async function HamalPage() {
  await requireTab("hamal");
  return <HamalClient />;
}
