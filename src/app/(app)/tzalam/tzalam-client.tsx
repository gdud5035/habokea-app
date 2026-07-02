"use client";

import { useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, Lock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  TZALAM_COMPANY_HE,
  type TzalamCompany,
} from "@/lib/constants";
import type { TzalamCompanyAccess } from "@/lib/permissions";
import type {
  TzalamItemRow,
  TzalamColumnRow,
  TzalamEquipmentTypeRow,
  TzalamGroupRow,
  TzalamDailyMarkRow,
  TzalamDailyLockRow,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/loading-skeletons";
import { TzalamTable } from "@/components/tzalam/tzalam-table";
import { TzalamItemModal } from "@/components/tzalam/tzalam-item-modal";
import { TzalamSettingsDialog } from "@/components/tzalam/tzalam-settings-dialog";
import { unlockTzalamDayAction } from "./actions";

export interface TzalamClientProps {
  isAdmin: boolean;
  access: TzalamCompanyAccess[];
  currentUserId: string;
}

const ALL = "__all__";

function todayLocalISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function companyHe(company: string): string {
  return TZALAM_COMPANY_HE[company as TzalamCompany] ?? company;
}

// ------------------------------------------------------------------
// Data fetchers
// ------------------------------------------------------------------

async function fetchColumns(): Promise<TzalamColumnRow[]> {
  const { data, error } = await createClient()
    .from("tzalam_columns")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchGroups(): Promise<TzalamGroupRow[]> {
  const { data, error } = await createClient()
    .from("tzalam_groups")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchTypes(): Promise<TzalamEquipmentTypeRow[]> {
  const { data, error } = await createClient()
    .from("tzalam_equipment_types")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchItems(
  viewCompanies: string[],
  isAdmin: boolean,
): Promise<TzalamItemRow[]> {
  let query = createClient()
    .from("tzalam_items")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (!isAdmin) query = query.in("company", viewCompanies);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchMarks(date: string): Promise<TzalamDailyMarkRow[]> {
  const { data, error } = await createClient()
    .from("tzalam_daily_marks")
    .select("*")
    .eq("mark_date", date);
  if (error) throw error;
  return data ?? [];
}

async function fetchLocks(date: string): Promise<TzalamDailyLockRow[]> {
  const { data, error } = await createClient()
    .from("tzalam_daily_locks")
    .select("*")
    .eq("lock_date", date);
  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------
// Inner component
// ------------------------------------------------------------------

function TzalamInner({ isAdmin, access, currentUserId }: TzalamClientProps) {
  const queryClient = useQueryClient();

  const viewCompanies = useMemo(
    () => access.filter((a) => a.view).map((a) => a.company),
    [access],
  );
  const editableCompanies = useMemo(
    () => access.filter((a) => a.edit).map((a) => a.company),
    [access],
  );
  const editableSet = useMemo(
    () => new Set<string>(editableCompanies),
    [editableCompanies],
  );

  const canEditCompany = (company: string) =>
    isAdmin || editableSet.has(company);

  const [today] = useState(todayLocalISO);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCompany, setSelectedCompany] = useState<string>(() =>
    viewCompanies.length === 1 ? viewCompanies[0] : ALL,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TzalamItemRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isToday = selectedDate === today;

  // ---- Queries ----
  const columnsQuery = useQuery({
    queryKey: ["tzalam_columns"],
    queryFn: fetchColumns,
  });
  const groupsQuery = useQuery({
    queryKey: ["tzalam_groups"],
    queryFn: fetchGroups,
  });
  const typesQuery = useQuery({
    queryKey: ["tzalam_types"],
    queryFn: fetchTypes,
  });
  const itemsQuery = useQuery({
    queryKey: ["tzalam_items", isAdmin, viewCompanies.join(",")],
    queryFn: () => fetchItems(viewCompanies, isAdmin),
  });
  const marksQuery = useQuery({
    queryKey: ["tzalam_marks", selectedDate],
    queryFn: () => fetchMarks(selectedDate),
  });
  const locksQuery = useQuery({
    queryKey: ["tzalam_locks", selectedDate],
    queryFn: () => fetchLocks(selectedDate),
  });

  const columns = useMemo(() => columnsQuery.data ?? [], [columnsQuery.data]);
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const types = useMemo(() => typesQuery.data ?? [], [typesQuery.data]);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  const marksMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const row of marksQuery.data ?? []) m[row.item_id] = row.present;
    return m;
  }, [marksQuery.data]);

  const locksMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const row of locksQuery.data ?? []) m[row.company] = true;
    return m;
  }, [locksQuery.data]);

  // ---- Visible items (company filter) ----
  const visibleItems = useMemo(() => {
    if (selectedCompany === ALL) return items;
    return items.filter((i) => i.company === selectedCompany);
  }, [items, selectedCompany]);

  const showCompanyColumn = selectedCompany === ALL;

  const rowEditable = (company: string) =>
    isToday && !locksMap[company] && canEditCompany(company);

  // ---- Progress ----
  const total = visibleItems.length;
  const presentCount = visibleItems.filter((i) => marksMap[i.id]).length;
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  // ---- Mutations ----
  const toggleMark = useMutation({
    mutationFn: async ({
      item,
      present,
    }: {
      item: TzalamItemRow;
      present: boolean;
    }) => {
      const { error } = await createClient()
        .from("tzalam_daily_marks")
        .upsert(
          {
            item_id: item.id,
            mark_date: selectedDate,
            present,
            marked_by: currentUserId,
            marked_at: new Date().toISOString(),
          },
          { onConflict: "item_id,mark_date" },
        );
      if (error) throw error;
    },
    onMutate: async ({ item, present }) => {
      const key = ["tzalam_marks", selectedDate];
      await queryClient.cancelQueries({ queryKey: key });
      const previous =
        queryClient.getQueryData<TzalamDailyMarkRow[]>(key) ?? [];
      const next = previous.filter((r) => r.item_id !== item.id);
      next.push({
        id: `optimistic-${item.id}`,
        item_id: item.id,
        mark_date: selectedDate,
        present,
        marked_by: currentUserId,
        marked_at: new Date().toISOString(),
      });
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(["tzalam_marks", selectedDate], ctx.previous);
      toast.error("שמירת הסימון נכשלה");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["tzalam_marks", selectedDate],
      });
    },
  });

  const saveItem = useMutation({
    mutationFn: async (payload: {
      id?: string;
      company: string;
      equipment_type_id: string | null;
      attributes: Record<string, string | number>;
    }) => {
      const supabase = createClient();
      if (payload.id) {
        const { error } = await supabase
          .from("tzalam_items")
          .update({
            company: payload.company,
            equipment_type_id: payload.equipment_type_id,
            attributes: payload.attributes,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tzalam_items").insert({
          company: payload.company,
          equipment_type_id: payload.equipment_type_id,
          attributes: payload.attributes,
          position: 0,
        });
        if (error) throw error;
      }
    },
    onError: () => toast.error("שמירת האמצעי נכשלה"),
    onSuccess: () => toast.success("נשמר"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tzalam_items"] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient()
        .from("tzalam_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("מחיקת האמצעי נכשלה"),
    onSuccess: () => toast.success("נמחק"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tzalam_items"] });
    },
  });

  const lockDay = useMutation({
    mutationFn: async (company: string) => {
      const { error } = await createClient()
        .from("tzalam_daily_locks")
        .upsert(
          {
            company,
            lock_date: selectedDate,
            locked_by: currentUserId,
            locked_at: new Date().toISOString(),
          },
          { onConflict: "company,lock_date" },
        );
      if (error) throw error;
    },
    onError: () => toast.error("נעילת הדוח נכשלה"),
    onSuccess: () => toast.success("הדוח נעול"),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["tzalam_locks", selectedDate],
      });
    },
  });

  // ---- Handlers ----
  const handleToggle = (item: TzalamItemRow, present: boolean) => {
    if (!rowEditable(item.company)) return;
    toggleMark.mutate({ item, present });
  };

  const openAdd = () => {
    setSelectedItem(null);
    setModalOpen(true);
  };
  const openEdit = (item: TzalamItemRow) => {
    setSelectedItem(item);
    setModalOpen(true);
  };
  const handleDelete = (item: TzalamItemRow) => {
    if (window.confirm("האם למחוק אמצעי זה?")) deleteItem.mutate(item.id);
  };
  const handleSave = (data: {
    id?: string;
    company: string;
    equipment_type_id: string | null;
    attributes: Record<string, string | number>;
  }) => {
    saveItem.mutate(data);
    setModalOpen(false);
    setSelectedItem(null);
  };

  const handleUnlock = async (company: string) => {
    const res = await unlockTzalamDayAction(company, selectedDate);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("הדוח נפתח מחדש");
    queryClient.invalidateQueries({ queryKey: ["tzalam_locks", selectedDate] });
  };

  // ---- Company options for the filter ----
  const companyFilterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (viewCompanies.length !== 1) {
      opts.push({ value: ALL, label: "כל הפלוגות" });
    }
    for (const c of viewCompanies) {
      opts.push({ value: c, label: companyHe(c) });
    }
    return opts;
  }, [viewCompanies]);

  const modalCompanies = useMemo(
    () => (isAdmin ? viewCompanies : editableCompanies) as TzalamCompany[],
    [isAdmin, viewCompanies, editableCompanies],
  );

  const canAdd =
    isToday &&
    modalCompanies.length > 0 &&
    (selectedCompany === ALL || canEditCompany(selectedCompany));

  const specificLocked =
    selectedCompany !== ALL && locksMap[selectedCompany];
  const canFinishDay =
    selectedCompany !== ALL &&
    isToday &&
    canEditCompany(selectedCompany) &&
    !specificLocked;

  // ---- Render ----
  if (viewCompanies.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground" dir="rtl">
        אין לך הרשאה לצפות באף פלוגה. פנה למנהל המערכת.
      </div>
    );
  }

  const isLoading =
    columnsQuery.isLoading || itemsQuery.isLoading || typesQuery.isLoading;

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedCompany}
            onValueChange={(v) => setSelectedCompany(v || ALL)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="פלוגה" />
            </SelectTrigger>
            <SelectContent>
              {companyFilterOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => {
              const v = e.target.value;
              if (v && v <= today) setSelectedDate(v);
            }}
            className="w-40"
          />
          {!isToday && (
            <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              צפייה בהיסטוריה (לקריאה בלבד)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAdd && <Button onClick={openAdd}>הוסף אמצעי</Button>}
          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="הגדרות"
            >
              <Settings className="size-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress + finish-day row */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3">
        <div className="min-w-56 flex-1">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">
              מולא {presentCount} מתוך {total}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {canFinishDay && (
          <Button
            onClick={() => lockDay.mutate(selectedCompany)}
            className="gap-1.5"
          >
            <CheckCircle2 className="size-4" />
            סיימתי
          </Button>
        )}
        {specificLocked && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-sm text-muted-foreground">
              <Lock className="size-4" />
              הדוח נעול
            </span>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => handleUnlock(selectedCompany)}
              >
                פתח מחדש
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <TzalamTable
          items={visibleItems}
          columns={columns}
          types={types}
          groups={groups}
          marks={marksMap}
          companyHe={companyHe}
          showCompany={showCompanyColumn}
          rowEditable={rowEditable}
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <TzalamItemModal
        open={modalOpen}
        item={selectedItem}
        columns={columns}
        types={types}
        companies={modalCompanies}
        companyHe={companyHe}
        defaultCompany={
          selectedCompany !== ALL &&
          modalCompanies.includes(selectedCompany as TzalamCompany)
            ? (selectedCompany as TzalamCompany)
            : (modalCompanies[0] ?? null)
        }
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
      />

      {isAdmin && (
        <TzalamSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          groups={groups}
          types={types}
          columns={columns}
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ["tzalam_columns"] });
            queryClient.invalidateQueries({ queryKey: ["tzalam_groups"] });
            queryClient.invalidateQueries({ queryKey: ["tzalam_types"] });
          }}
        />
      )}
    </div>
  );
}

export function TzalamClient(props: TzalamClientProps) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <TzalamInner {...props} />
    </QueryClientProvider>
  );
}
