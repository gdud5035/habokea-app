"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { TAB_KEYS, type TabKey } from "@/lib/constants";
import type { DataHelperItem } from "@/types/database";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function assertAdmin() {
  const me = await getCurrentProfile();
  if (!me?.is_admin) throw new Error("אין הרשאה");
  return me;
}

function isValidTab(key: string): key is TabKey {
  return (TAB_KEYS as readonly string[]).includes(key);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function createUserAction(input: {
  full_name: string;
  email: string;
  phone: string;
  role_id: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAdmin();

    const full_name = input.full_name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();

    if (!full_name) return { ok: false, error: "שם מלא הוא שדה חובה" };
    if (!email) return { ok: false, error: "אימייל הוא שדה חובה" };
    if (!phone) return { ok: false, error: "טלפון הוא שדה חובה (משמש כסיסמה ראשונית)" };

    const admin = createAdminClient();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: phone,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "";
      if (/already|exist|registered|duplicate/i.test(msg)) {
        return { ok: false, error: "משתמש עם אימייל זה כבר קיים" };
      }
      return { ok: false, error: msg || "יצירת המשתמש נכשלה" };
    }

    const userId = created.user.id;

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: userId,
      full_name,
      email,
      phone,
      role_id: input.role_id,
      must_change_password: false,
    });

    if (profileErr) {
      return { ok: false, error: profileErr.message || "שמירת פרופיל המשתמש נכשלה" };
    }

    revalidatePath("/admin");
    return { ok: true, data: { id: userId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

export async function updateUserAction(
  userId: string,
  input: { full_name: string; email: string; phone: string }
): Promise<ActionResult> {
  try {
    await assertAdmin();

    const full_name = input.full_name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();

    if (!full_name) return { ok: false, error: "שם מלא הוא שדה חובה" };
    if (!email) return { ok: false, error: "אימייל הוא שדה חובה" };
    if (!phone) return { ok: false, error: "טלפון הוא שדה חובה" };

    const admin = createAdminClient();

    // Keep the auth record in sync (email + metadata) so login stays consistent.
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: { full_name, phone },
    });
    if (authErr) {
      if (/already|exist|registered|duplicate/i.test(authErr.message)) {
        return { ok: false, error: "משתמש עם אימייל זה כבר קיים" };
      }
      return { ok: false, error: authErr.message || "עדכון המשתמש נכשל" };
    }

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ full_name, email, phone })
      .eq("id", userId);

    if (profileErr) {
      if (/duplicate|unique/i.test(profileErr.message)) {
        return { ok: false, error: "מספר טלפון זה כבר קיים במערכת" };
      }
      return { ok: false, error: profileErr.message || "שמירת הפרופיל נכשלה" };
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    if (me.id === userId) {
      return { ok: false, error: "לא ניתן למחוק את המשתמש שלך" };
    }

    const admin = createAdminClient();
    // Deleting the auth user cascades to the profile row and its dependents.
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message || "מחיקת המשתמש נכשלה" };

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

export async function setUserRoleAction(
  userId: string,
  roleId: string | null
): Promise<ActionResult> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ role_id: roleId })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

export async function setUserOverrideAction(
  userId: string,
  tabKey: string,
  value: "default" | "allow" | "deny"
): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!isValidTab(tabKey)) return { ok: false, error: "טאב לא חוקי" };
    const admin = createAdminClient();

    if (value === "default") {
      const { error } = await admin
        .from("user_tab_overrides")
        .delete()
        .eq("user_id", userId)
        .eq("tab_key", tabKey);
      if (error) return { ok: false, error: error.message };
    } else {
      const can_access = value === "allow";
      const { error } = await admin
        .from("user_tab_overrides")
        .upsert(
          { user_id: userId, tab_key: tabKey, can_access },
          { onConflict: "user_id,tab_key" }
        );
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

// ---------------------------------------------------------------------------
// Roles & role->tab access
// ---------------------------------------------------------------------------

export async function setRoleTabAction(
  roleId: string,
  tabKey: string,
  canAccess: boolean
): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!isValidTab(tabKey)) return { ok: false, error: "טאב לא חוקי" };
    const admin = createAdminClient();
    const { error } = await admin
      .from("role_tab_access")
      .upsert(
        { role_id: roleId, tab_key: tabKey, can_access: canAccess },
        { onConflict: "role_id,tab_key" }
      );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

export async function createRoleAction(name: string): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "שם התפקיד הוא שדה חובה" };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("roles")
      .insert({ name: trimmed })
      .select("id")
      .single();
    if (error || !data) {
      if (error && /duplicate|unique/i.test(error.message)) {
        return { ok: false, error: "תפקיד בשם זה כבר קיים" };
      }
      return { ok: false, error: error?.message ?? "יצירת התפקיד נכשלה" };
    }
    revalidatePath("/admin");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    const { data: role } = await admin
      .from("roles")
      .select("name")
      .eq("id", roleId)
      .single();

    if (role?.name === "admin") {
      return { ok: false, error: "לא ניתן למחוק את תפקיד המנהל" };
    }

    // Clean up dependent rows first.
    await admin.from("role_tab_access").delete().eq("role_id", roleId);
    await admin.from("profiles").update({ role_id: null }).eq("role_id", roleId);

    const { error } = await admin.from("roles").delete().eq("id", roleId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

// ---------------------------------------------------------------------------
// Data helpers (vehicle_models / vehicle_usages)
// ---------------------------------------------------------------------------

export async function addDataHelperItemAction(
  name: string,
  item: DataHelperItem
): Promise<ActionResult<{ items: DataHelperItem[] }>> {
  try {
    await assertAdmin();
    const value = item.value.trim();
    const translation_he = item.translation_he.trim();
    if (!value || !translation_he) {
      return { ok: false, error: "יש למלא ערך באנגלית ותרגום בעברית" };
    }

    const admin = createAdminClient();
    const { data: row, error: readErr } = await admin
      .from("data_helpers")
      .select("id, items")
      .eq("name", name)
      .single();

    if (readErr || !row) {
      return { ok: false, error: readErr?.message ?? "רשומת העזר לא נמצאה" };
    }

    const current = (row.items as DataHelperItem[] | null) ?? [];
    if (current.some((it) => it.value === value)) {
      return { ok: false, error: "ערך זה כבר קיים ברשימה" };
    }
    const next = [...current, { value, translation_he }];

    const { error: updErr } = await admin
      .from("data_helpers")
      .update({ items: next })
      .eq("id", row.id);
    if (updErr) return { ok: false, error: updErr.message };

    revalidatePath("/admin");
    return { ok: true, data: { items: next } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}

export async function removeDataHelperItemAction(
  name: string,
  value: string
): Promise<ActionResult<{ items: DataHelperItem[] }>> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { data: row, error: readErr } = await admin
      .from("data_helpers")
      .select("id, items")
      .eq("name", name)
      .single();

    if (readErr || !row) {
      return { ok: false, error: readErr?.message ?? "רשומת העזר לא נמצאה" };
    }

    const current = (row.items as DataHelperItem[] | null) ?? [];
    const next = current.filter((it) => it.value !== value);

    const { error: updErr } = await admin
      .from("data_helpers")
      .update({ items: next })
      .eq("id", row.id);
    if (updErr) return { ok: false, error: updErr.message };

    revalidatePath("/admin");
    return { ok: true, data: { items: next } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "שגיאה לא צפויה" };
  }
}
