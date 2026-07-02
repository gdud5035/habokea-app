"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { TZALAM_COMPANIES } from "@/lib/constants";
import type { ProfileRow, TzalamUserCompanyRow } from "@/types/database";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function assertAdmin() {
  const me = await getCurrentProfile();
  if (!me?.is_admin) throw new Error("אין הרשאה");
  return me;
}

function isValidCompany(company: string): boolean {
  return (TZALAM_COMPANIES as readonly string[]).includes(company);
}

function wrap<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e) => ({
    ok: false as const,
    error: e instanceof Error ? e.message : "שגיאה לא צפויה",
  }));
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function createGroupAction(name: string): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "שם הקבוצה הוא שדה חובה" };
    const admin = createAdminClient();
    const { error } = await admin.from("tzalam_groups").insert({ name: trimmed });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

export async function renameGroupAction(
  id: string,
  name: string,
): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "שם הקבוצה הוא שדה חובה" };
    const admin = createAdminClient();
    const { error } = await admin
      .from("tzalam_groups")
      .update({ name: trimmed })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

export async function deleteGroupAction(id: string): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("tzalam_groups").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Equipment types
// ---------------------------------------------------------------------------

export async function createTypeAction(
  name: string,
  groupId: string | null,
): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "שם האמצעי הוא שדה חובה" };
    const admin = createAdminClient();
    const { error } = await admin
      .from("tzalam_equipment_types")
      .insert({ name: trimmed, group_id: groupId });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

export async function updateTypeAction(
  id: string,
  updates: { name?: string; group_id?: string | null },
): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const patch: { name?: string; group_id?: string | null } = {};
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) return { ok: false, error: "שם האמצעי הוא שדה חובה" };
      patch.name = trimmed;
    }
    if (updates.group_id !== undefined) patch.group_id = updates.group_id;
    const admin = createAdminClient();
    const { error } = await admin
      .from("tzalam_equipment_types")
      .update(patch)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

export async function deleteTypeAction(id: string): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from("tzalam_equipment_types")
      .delete()
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export async function createColumnAction(
  label: string,
  fieldType: "text" | "number",
): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const trimmed = label.trim();
    if (!trimmed) return { ok: false, error: "שם העמודה הוא שדה חובה" };
    const admin = createAdminClient();
    const { data: maxRow } = await admin
      .from("tzalam_columns")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = ((maxRow as { position: number } | null)?.position ?? -1) + 1;
    const { error } = await admin
      .from("tzalam_columns")
      .insert({ label: trimmed, field_type: fieldType, position: nextPos });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

export async function updateColumnAction(
  id: string,
  updates: { label?: string; field_type?: "text" | "number" },
): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const patch: { label?: string; field_type?: string } = {};
    if (updates.label !== undefined) {
      const trimmed = updates.label.trim();
      if (!trimmed) return { ok: false, error: "שם העמודה הוא שדה חובה" };
      patch.label = trimmed;
    }
    if (updates.field_type !== undefined) patch.field_type = updates.field_type;
    const admin = createAdminClient();
    const { error } = await admin.from("tzalam_columns").update(patch).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

export async function deleteColumnAction(id: string): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("tzalam_columns").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Per-user company access
// ---------------------------------------------------------------------------

export async function getTzalamAdminDataAction(): Promise<
  ActionResult<{ users: ProfileRow[]; userCompanies: TzalamUserCompanyRow[] }>
> {
  return wrap(async () => {
    await assertAdmin();
    const admin = createAdminClient();
    const [{ data: usersData }, { data: ucData }] = await Promise.all([
      admin.from("profiles").select("*").order("full_name"),
      admin.from("tzalam_user_companies").select("*"),
    ]);
    return {
      ok: true,
      data: {
        users: (usersData as ProfileRow[] | null) ?? [],
        userCompanies: (ucData as TzalamUserCompanyRow[] | null) ?? [],
      },
    };
  });
}

export async function setUserCompanyAction(
  userId: string,
  company: string,
  canView: boolean,
  canEdit: boolean,
): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    if (!isValidCompany(company)) return { ok: false, error: "פלוגה לא חוקית" };
    const admin = createAdminClient();

    // No access at all → remove the row entirely.
    if (!canView && !canEdit) {
      const { error } = await admin
        .from("tzalam_user_companies")
        .delete()
        .eq("user_id", userId)
        .eq("company", company);
      if (error) return { ok: false, error: error.message };
      revalidatePath("/tzalam");
      return { ok: true };
    }

    // Edit implies view.
    const view = canEdit ? true : canView;
    const { error } = await admin.from("tzalam_user_companies").upsert(
      { user_id: userId, company, can_view: view, can_edit: canEdit },
      { onConflict: "user_id,company" },
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Unlock a locked daily report (admin only)
// ---------------------------------------------------------------------------

export async function unlockTzalamDayAction(
  company: string,
  date: string,
): Promise<ActionResult> {
  return wrap(async () => {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from("tzalam_daily_locks")
      .delete()
      .eq("company", company)
      .eq("lock_date", date);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tzalam");
    return { ok: true };
  });
}
