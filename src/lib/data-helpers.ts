import { createClient } from "@/lib/supabase/client";
import type { DataHelperItem } from "@/types/database";

// Client-side fetch of a data_helper's items (vehicle_models / vehicle_usages).
export async function fetchDataHelper(name: string): Promise<DataHelperItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("data_helpers")
    .select("items")
    .eq("name", name)
    .maybeSingle();
  const row = data as { items: DataHelperItem[] } | null;
  return row?.items ?? [];
}
