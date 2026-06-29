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
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAY_HE } from "@/lib/constants";
import {
  addDays,
  computeSlots,
  dateKey,
  getWeekStart,
  weekDays,
  HOME_SLOT,
  DAY_TEXT_ROWS,
  type Slot,
} from "@/lib/utils/week";
import {
  buildWeekRoster,
  formatWhatsAppMessage,
} from "@/lib/hamal-report";
import type {
  HamalAssignmentRow,
  HamalDayTextRow,
  HamalSambatzRow,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/loading-skeletons";
import { HamalGrid } from "@/components/hamal/hamal-grid";
import { AssignShiftDialog } from "@/components/hamal/assign-shift-dialog";
import { SambatzimDialog } from "@/components/hamal/sambatzim-dialog";
import {
  ShiftSettingsDialog,
  type ShiftSettings,
} from "@/components/hamal/shift-settings-dialog";
import { HomeDialog } from "@/components/hamal/home-dialog";
import { DayTextDialog } from "@/components/hamal/day-text-dialog";
import { ShiftCountsTable } from "@/components/hamal/shift-counts-table";

const DEFAULTS: ShiftSettings = { length: 8, start: 0, showAttack: true };
const SETTINGS_KEY = ["hamal_settings"] as const;
const SAMBATZIM_KEY = ["hamal_sambatzim"] as const;
const LENGTH_SETTING = "hamal_shift_length_hours";
const START_SETTING = "hamal_day_start_hour";
const SHOW_ATTACK_SETTING = "hamal_show_attack";

const supabase = () => createClient();

function ddmm(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

// Israeli local phone → wa.me international format (972…).
function waNumber(phone: string | null): string {
  if (!phone) return "";
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("972")) d = d.slice(3);
  d = d.replace(/^0+/, "");
  return d ? `972${d}` : "";
}

// ------------------------------------------------------------------
// Data fetchers
// ------------------------------------------------------------------

async function fetchSettings(): Promise<ShiftSettings> {
  const { data, error } = await supabase()
    .from("app_settings")
    .select("key, value")
    .in("key", [LENGTH_SETTING, START_SETTING, SHOW_ATTACK_SETTING]);
  if (error) throw error;
  const rows = (data as { key: string; value: string }[] | null) ?? [];
  const num = (k: string, dflt: number) => {
    const n = Number(rows.find((r) => r.key === k)?.value);
    return Number.isFinite(n) ? n : dflt;
  };
  return {
    length: num(LENGTH_SETTING, DEFAULTS.length),
    start: num(START_SETTING, DEFAULTS.start),
    showAttack: rows.find((r) => r.key === SHOW_ATTACK_SETTING)?.value !== "false",
  };
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

async function fetchDayText(
  startKey: string,
  endKey: string,
): Promise<HamalDayTextRow[]> {
  const { data, error } = await supabase()
    .from("hamal_day_text")
    .select("*")
    .gte("shift_date", startKey)
    .lte("shift_date", endKey);
  if (error) throw error;
  return data ?? [];
}

// ------------------------------------------------------------------
// Inner component
// ------------------------------------------------------------------

function HamalInner({
  isAdmin,
  userPhone,
}: {
  isAdmin: boolean;
  userPhone: string | null;
}) {
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [assignCtx, setAssignCtx] = useState<{ date: Date; slot: Slot } | null>(
    null,
  );
  const [homeCtx, setHomeCtx] = useState<Date | null>(null);
  const [textCtx, setTextCtx] = useState<{
    date: Date;
    kind: string;
    label: string;
  } | null>(null);
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
  const DAY_TEXT_KEY = useMemo(
    () => ["hamal_day_text", startKey] as const,
    [startKey],
  );

  const settingsQuery = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: fetchSettings,
  });
  const sambatzimQuery = useQuery({
    queryKey: SAMBATZIM_KEY,
    queryFn: fetchSambatzim,
  });
  const assignmentsQuery = useQuery({
    queryKey: ASSIGNMENTS_KEY,
    queryFn: () => fetchAssignments(startKey, endKey),
  });
  const dayTextQuery = useQuery({
    queryKey: DAY_TEXT_KEY,
    queryFn: () => fetchDayText(startKey, endKey),
  });

  const settings = settingsQuery.data ?? DEFAULTS;
  const slots = useMemo(
    () => computeSlots(settings.length, settings.start),
    [settings.length, settings.start],
  );
  const textRows = useMemo(
    () => DAY_TEXT_ROWS.filter((r) => r.kind !== "attack" || settings.showAttack),
    [settings.showAttack],
  );
  const sambatzim = useMemo(
    () => sambatzimQuery.data ?? [],
    [sambatzimQuery.data],
  );

  const sambatzById = useMemo(() => {
    const m = new Map<string, HamalSambatzRow>();
    sambatzim.forEach((s) => m.set(s.id, s));
    return m;
  }, [sambatzim]);
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    sambatzim.forEach((s) => m.set(s.id, s.full_name));
    return m;
  }, [sambatzim]);

  const allAssignments = useMemo(
    () => assignmentsQuery.data ?? [],
    [assignmentsQuery.data],
  );

  const assignmentsByCell = useMemo(() => {
    const m = new Map<string, HamalAssignmentRow[]>();
    allAssignments.forEach((a) => {
      if (a.slot_start_hour === HOME_SLOT) return;
      const key = `${a.shift_date}|${a.slot_start_hour}`;
      const arr = m.get(key);
      if (arr) arr.push(a);
      else m.set(key, [a]);
    });
    return m;
  }, [allAssignments]);

  const homeByDate = useMemo(() => {
    const m = new Map<string, HamalAssignmentRow[]>();
    allAssignments.forEach((a) => {
      if (a.slot_start_hour !== HOME_SLOT) return;
      const arr = m.get(a.shift_date);
      if (arr) arr.push(a);
      else m.set(a.shift_date, [a]);
    });
    return m;
  }, [allAssignments]);

  const dayText = useMemo(
    () => dayTextQuery.data ?? [],
    [dayTextQuery.data],
  );
  const textByCell = useMemo(() => {
    const m = new Map<string, string>();
    dayText.forEach((t) => m.set(`${t.shift_date}|${t.kind}`, t.content));
    return m;
  }, [dayText]);
  const dayTextByDate = useMemo(() => {
    const m = new Map<string, { note?: string; attack?: string }>();
    dayText.forEach((t) => {
      const entry = m.get(t.shift_date) ?? {};
      if (t.kind === "note") entry.note = t.content;
      else if (t.kind === "attack") entry.attack = t.content;
      m.set(t.shift_date, entry);
    });
    return m;
  }, [dayText]);

  const countById = useMemo(() => {
    const m = new Map<string, number>();
    allAssignments.forEach((a) => {
      if (a.slot_start_hour === HOME_SLOT) return;
      m.set(a.sambatz_id, (m.get(a.sambatz_id) ?? 0) + 1);
    });
    return m;
  }, [allAssignments]);

  // ---- Mutations ----
  // Used for both shift slots and the home row (slot_start_hour = -1).
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
    onError: () => toast.error("השמירה נכשלה"),
    onSuccess: () => toast.success("נשמר"),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_KEY }),
  });

  const addSambatz = useMutation({
    mutationFn: async ({
      full_name,
      color,
    }: {
      full_name: string;
      color: string;
    }) => {
      const { error } = await supabase()
        .from("hamal_sambatzim")
        .insert([{ full_name, color }]);
      if (error) throw error;
    },
    onError: () => toast.error("הוספת הסמבץ נכשלה"),
    onSuccess: () => toast.success("הסמבץ נוסף"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SAMBATZIM_KEY }),
  });

  const setSambatzColor = useMutation({
    mutationFn: async ({ id, color }: { id: string; color: string }) => {
      const { error } = await supabase()
        .from("hamal_sambatzim")
        .update({ color })
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("עדכון הצבע נכשל"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SAMBATZIM_KEY }),
  });

  const renameSambatz = useMutation({
    mutationFn: async ({ id, full_name }: { id: string; full_name: string }) => {
      const { error } = await supabase()
        .from("hamal_sambatzim")
        .update({ full_name })
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("עדכון השם נכשל"),
    onSuccess: () => toast.success("השם עודכן"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SAMBATZIM_KEY }),
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

  const saveDayText = useMutation({
    mutationFn: async ({
      dk,
      kind,
      content,
    }: {
      dk: string;
      kind: string;
      content: string;
    }) => {
      const client = supabase();
      if (!content) {
        const { error } = await client
          .from("hamal_day_text")
          .delete()
          .eq("shift_date", dk)
          .eq("kind", kind);
        if (error) throw error;
      } else {
        const { error } = await client.from("hamal_day_text").upsert(
          {
            shift_date: dk,
            kind,
            content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "shift_date,kind" },
        );
        if (error) throw error;
      }
    },
    onError: () => toast.error("השמירה נכשלה"),
    onSuccess: () => toast.success("נשמר"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: DAY_TEXT_KEY }),
  });

  const updateSettings = useMutation({
    mutationFn: async (next: ShiftSettings) => {
      const { error } = await supabase()
        .from("app_settings")
        .upsert(
          [
            {
              key: LENGTH_SETTING,
              value: String(next.length),
              updated_at: new Date().toISOString(),
            },
            {
              key: START_SETTING,
              value: String(next.start),
              updated_at: new Date().toISOString(),
            },
            {
              key: SHOW_ATTACK_SETTING,
              value: next.showAttack ? "true" : "false",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onError: () => toast.error("עדכון ההגדרות נכשל"),
    onSuccess: () => toast.success("ההגדרות נשמרו"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });

  // ---- Actions ----
  const handlePdf = () => {
    const a = document.createElement("a");
    a.href = `/api/hamal/pdf?week=${startKey}`;
    a.download = `hamal_${startKey}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleWhatsApp = () => {
    const roster = buildWeekRoster(
      days,
      slots,
      allAssignments,
      nameById,
      dayTextByDate,
    );
    const msg = formatWhatsAppMessage(roster, {
      showAttack: settings.showAttack,
    });
    const intl = waNumber(userPhone);
    if (!intl) {
      toast.error("לא מוגדר מספר טלפון בפרופיל — נפתחה בחירת איש קשר");
    }
    const base = intl ? `https://wa.me/${intl}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ---- Render ----
  if (
    settingsQuery.isLoading ||
    sambatzimQuery.isLoading ||
    assignmentsQuery.isLoading ||
    dayTextQuery.isLoading
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
  const homeCurrentIds = homeCtx
    ? (homeByDate.get(dateKey(homeCtx)) ?? []).map((a) => a.sambatz_id)
    : [];

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">שבצק חמל</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setSambatzimOpen(true)}>
            <Users className="size-4" />
            ניהול סמבצים
          </Button>
          <Button variant="outline" onClick={handlePdf}>
            <Download className="size-4" />
            הורד PDF
          </Button>
          <Button variant="outline" onClick={handleWhatsApp}>
            <MessageCircle className="size-4" />
            וואטסאפ
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
        homeByDate={homeByDate}
        sambatzById={sambatzById}
        textByCell={textByCell}
        textRows={textRows}
        todayKey={todayKey}
        onCellClick={(date, slot) => setAssignCtx({ date, slot })}
        onHomeClick={(date) => setHomeCtx(date)}
        onTextClick={(date, kind, label) => setTextCtx({ date, kind, label })}
      />

      <ShiftCountsTable sambatzim={sambatzim} countById={countById} />

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

      <HomeDialog
        open={homeCtx !== null}
        contextLabel={
          homeCtx ? `${WEEKDAY_HE[homeCtx.getDay()]} ${ddmm(homeCtx)}` : ""
        }
        sambatzim={sambatzim}
        currentIds={homeCurrentIds}
        onClose={() => setHomeCtx(null)}
        onSave={(ids) => {
          if (homeCtx) {
            saveAssignments.mutate({
              dk: dateKey(homeCtx),
              startHour: HOME_SLOT,
              ids,
            });
          }
          setHomeCtx(null);
        }}
      />

      <DayTextDialog
        open={textCtx !== null}
        contextLabel={
          textCtx
            ? `${textCtx.label} — ${WEEKDAY_HE[textCtx.date.getDay()]} ${ddmm(textCtx.date)}`
            : ""
        }
        value={
          textCtx
            ? textByCell.get(`${dateKey(textCtx.date)}|${textCtx.kind}`) ?? ""
            : ""
        }
        onClose={() => setTextCtx(null)}
        onSave={(content) => {
          if (textCtx) {
            saveDayText.mutate({
              dk: dateKey(textCtx.date),
              kind: textCtx.kind,
              content,
            });
          }
          setTextCtx(null);
        }}
      />

      <SambatzimDialog
        open={sambatzimOpen}
        sambatzim={sambatzim}
        onClose={() => setSambatzimOpen(false)}
        onAdd={(full_name, color) => addSambatz.mutate({ full_name, color })}
        onDelete={(id) => deleteSambatz.mutate(id)}
        onSetColor={(id, color) => setSambatzColor.mutate({ id, color })}
        onRename={(id, full_name) => renameSambatz.mutate({ id, full_name })}
      />

      {isAdmin && (
        <ShiftSettingsDialog
          open={settingsOpen}
          current={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            updateSettings.mutate(next);
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function HamalClient({
  isAdmin,
  userPhone,
}: {
  isAdmin: boolean;
  userPhone: string | null;
}) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <HamalInner isAdmin={isAdmin} userPhone={userPhone} />
    </QueryClientProvider>
  );
}
