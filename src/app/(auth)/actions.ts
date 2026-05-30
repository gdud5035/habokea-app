"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

// Reduce a phone string to comparable digits: strip non-digits, drop an Israeli
// country code (972) and any leading zero, so all of these match each other:
//   0524599159 | 052-459-9159 | +972 52 459 9159 | 972524599159
function phoneCore(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("972")) d = d.slice(3);
  d = d.replace(/^0+/, "");
  return d;
}

// Resolve a login identifier (email OR phone) to an email, then sign in.
export async function signInAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "יש להזין מזהה וסיסמה" };
  }

  let email = identifier;

  // If it's not an email, treat it as a phone and look it up (format-tolerant).
  if (!identifier.includes("@")) {
    const core = phoneCore(identifier);
    if (!core) {
      return { error: "מספר טלפון לא תקין" };
    }
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("email, phone")
      .not("phone", "is", null);
    const rows = (data as Pick<ProfileRow, "email" | "phone">[] | null) ?? [];
    const match = rows.find((r) => r.phone && phoneCore(r.phone) === core);
    if (!match?.email) {
      return { error: "מספר טלפון לא נמצא" };
    }
    email = match.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "פרטי התחברות שגויים" };
  }

  redirect("/vehicles");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
