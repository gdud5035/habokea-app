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
import { ChevronLeft, ChevronRight, Settings, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAY_HE } from "@/lib/constants";
import {
  addDays,
  computeSlots,
  dateKey,
  getWeekStart,
  weekDays,
  type Slot,
} from "@/lib/utils/week";
import type {
  HamalAssignmentRow,
  HamalSambatzRow,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/loading-skeletons";
import { HamalGrid } from "@/components/hamal/hamal-grid";
import { AssignShiftDialog } from "@/components/hamal/assign-shift-dialog";
import { SambatzimDialog } from "@/components/hamal/sambatzim-dialog";
import { ShiftSettingsDialog } from "@/components/hamal/shift-settings-dialog";

const DEFAULT_SHIFT_HOURS = 8;
const SETTINGS_KEY = ["hamal_settings"] as const;
const SAMBATZIM_KEY = ["hamal_sambatzim"] as const;
const SHIFT_LENGTH_SETTING = "hamal_shift_length_hours";

const supabase = () => createClient();

// ---- short dd/MM ----
function ddmm(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

// ------------------------------------------------------------------
// Data fetchers
// ------------------------------------------------------------------

async function fetchShiftLength(): Promise<number> {
  const { data, error } = await supabase()
    .from("app_settings")
    .select("value")
    .eq("key", SHIFT_LENGTH_SETTING)
    .maybeSingle();
  if (error) throw error;
  const n = Number((data as { value: string } | null)?.value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_SHIFT_HOURS;
}

async function fetchSambatzim(): Promise<HamalSambatzRow[]> {
  const { data, error } = await supabase()
    .from("hamal_sambatzim")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchAssignments(
  startKey: string,
  endKey: string,
): Promise<HamalAssignmentRow[]> {
  const { data, error } = await supabase()
    .from("hamal_assignments")
    .select("*")
    .gte("shift_date", startKey)
    .lte("shift_date", endKey);
  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------
// Inner component
// ------------------------------------------------------------------

function HamalInner({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [assignCtx, setAssignCtx] = useState<{ date: Date; slot: Slot } | null>(
    null,
  );
  const [sambatzimOpen, setSambatzimOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const startKey = dateKey(days[0]);
  const endKey = dateKey(days[6]);
  const todayKey = dateKey(new Date());
  const ASSIGNMENTS_KEY = useMemo(
    () => ["hamal_assignments", startKey] as const,
    [startKey],
  );

  const settingsQuery = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: fetchShiftLength,
  });
  const sambatzimQuery = useQuery({
    queryKey: SAMBATZIM_KEY,
    queryFn: fetchSambatzim,
  });
  const assignmentsQuery = useQuery({
    queryKey: ASSIGNMENTS_KEY,
    queryFn: () => fetchAssignments(startKey, endKey),
  });

  const shiftLength = settingsQuery.data ?? DEFAULT_SHIFT_HOURS;
  const slots = useMemo(() => computeSlots(shiftLength), [shiftLength]);
  const sambatzim = useMemo(
    () => sambatzimQuery.data ?? [],
    [sambatzimQuery.data],
  );

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    sambatzim.forEach((s) => m.set(s.id, s.full_name));
    return m;
  }, [sambatzim]);

  const assignmentsByCell = useMemo(() => {
    const m = new Map<string, HamalAssignmentRow[]>();
    (assignmentsQuery.data ?? []).forEach((a) => {
      const key = `${a.shift_date}|${a.slot_start_hour}`;
      const arr = m.get(key);
      if (arr) arr.push(a);
      else m.set(key, [a]);
    });
    return m;
  }, [assignmentsQuery.data]);

  // ---- Mutations ----
  const saveAssignments = useMutation({
    mutationFn: async ({
      dk,
      startHour,
      ids,
    }: {
      dk: string;
      startHour: number;
      ids: string[];
    }) => {
      const client = supabase();
      const { error: delErr } = await client
        .from("hamal_assignments")
        .delete()
        .eq("shift_date", dk)
        .eq("slot_start_hour", startHour);
      if (delErr) throw delErr;
      if (ids.length > 0) {
        const { error: insErr } = await client
          .from("hamal_assignments")
          .insert(
            ids.map((sambatz_id) => ({
              shift_date: dk,
              slot_start_hour: startHour,
              sambatz_id,
            })),
          );
        if (insErr) throw insErr;
      }
    },
    onError: () => toast.error("שמירת השיבוץ נכשלה"),
    onSuccess: () => toast.success("השיבוץ נשמר"),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_KEY }),
  });

  const addSambatz = useMutation({
    mutationFn: async (full_name: string) => {
      const { error } = await supabase()
        .from("hamal_sambatzim")
        .insert([{ full_name }]);
      if (error) throw error;
    },
    onError: () => toast.error("הוספת הסמבץ נכשלה"),
    onSuccess: () => toast.success("הסמבץ נוסף"),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: SAMBATZIM_KEY }),
  });

  const deleteSambatz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase()
        .from("hamal_sambatzim")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("מחיקת הסמבץ נכשלה"),
    onSuccess: () => toast.success("הסמבץ נמחק"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SAMBATZIM_KEY });
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
    },
  });

  const updateShiftLength = useMutation({
    mutationFn: async (hours: number) => {
      const { error } = await supabase()
        .from("app_settings")
        .upsert(
          {
            key: SHIFT_LENGTH_SETTING,
            value: String(hours),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onError: () => toast.error("עדכון ההגדרות נכשל"),
    onSuccess: () => toast.success("ההגדרות נשמרו"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });

  // ---- Render ----
  if (
    settingsQuery.isLoading ||
    sambatzimQuery.isLoading ||
    assignmentsQuery.isLoading
  ) {
    return <TableSkeleton />;
  }

  const ctxCurrentIds = assignCtx
    ? (
        assignmentsByCell.get(
          `${dateKey(assignCtx.date)}|${assignCtx.slot.startHour}`,
        ) ?? []
      ).map((a) => a.sambatz_id)
    : [];

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">שבצק חמל</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSambatzimOpen(true)}>
            <Users className="size-4" />
            ניהול סמבצים
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              title="הגדרות"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {/* RTL: previous week sits on the right (chevron pointing right) */}
          <Button
            variant="outline"
            size="icon"
            title="שבוע קודם"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="שבוע הבא"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setWeekStart(getWeekStart(new Date()))}
          >
            השבוע
          </Button>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {ddmm(days[0])}–{ddmm(days[6])}
        </div>
      </div>

      <HamalGrid
        days={days}
        slots={slots}
        assignmentsByCell={assignmentsByCell}
        nameById={nameById}
        todayKey={todayKey}
        onCellClick={(date, slot) => setAssignCtx({ date, slot })}
      />

      <AssignShiftDialog
        open={assignCtx !== null}
        contextLabel={
          assignCtx
            ? `${WEEKDAY_HE[assignCtx.date.getDay()]} ${ddmm(assignCtx.date)} · ${assignCtx.slot.label}`
            : ""
        }
        sambatzim={sambatzim}
        currentIds={ctxCurrentIds}
        onClose={() => setAssignCtx(null)}
        onSave={(ids) => {
          if (assignCtx) {
            saveAssignments.mutate({
              dk: dateKey(assignCtx.date),
              startHour: assignCtx.slot.startHour,
              ids,
            });
          }
          setAssignCtx(null);
        }}
      />

      <SambatzimDialog
        open={sambatzimOpen}
        sambatzim={sambatzim}
        onClose={() => setSambatzimOpen(false)}
        onAdd={(name) => addSambatz.mutate(name)}
        onDelete={(id) => deleteSambatz.mutate(id)}
      />

      {isAdmin && (
        <ShiftSettingsDialog
          open={settingsOpen}
          current={shiftLength}
          onClose={() => setSettingsOpen(false)}
          onSave={(hours) => {
            updateShiftLength.mutate(hours);
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function HamalClient({ isAdmin }: { isAdmin: boolean }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <HamalInner isAdmin={isAdmin} />
    </QueryClientProvider>
  );
}
