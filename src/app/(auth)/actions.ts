"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  // If it's not an email, treat it as a phone and look up the email.
  if (!identifier.includes("@")) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("email")
      .eq("phone", identifier)
      .maybeSingle();
    if (!data?.email) {
      return { error: "מספר טלפון או אימייל לא נמצא" };
    }
    email = data.email;
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
