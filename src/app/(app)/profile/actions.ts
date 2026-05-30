"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

export async function updateProfileAction(
  fullName: string,
  phone: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "לא מחובר" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return {};
}

export async function changePasswordAction(
  password: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "לא מחובר" };

  const { error: pwError } = await supabase.auth.updateUser({ password });
  if (pwError) return { error: pwError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  revalidatePath("/profile");
  return {};
}
