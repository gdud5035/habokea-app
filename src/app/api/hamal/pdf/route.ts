import { createClient } from "@/lib/supabase/server";
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { createElement } from "react";
import { join } from "node:path";
import { WEEKDAY_HE } from "@/lib/constants";
import {
  computeSlots,
  dateKey,
  getWeekStart,
  textOn,
  weekDays,
  HOME_SLOT,
  DAY_TEXT_ROWS,
} from "@/lib/utils/week";
import type {
  HamalAssignmentRow,
  HamalDayTextRow,
  HamalSambatzRow,
} from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bundled Hebrew-capable static TTFs (public/fonts). The previous Google
// "Heebo" URL was a Latin-only subset, which rendered Hebrew as tofu.
const fontDir = join(process.cwd(), "public", "fonts");
Font.register({
  family: "Alef",
  fonts: [
    { src: join(fontDir, "Alef-Regular.ttf"), fontWeight: "normal" },
    { src: join(fontDir, "Alef-Bold.ttf"), fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Alef",
    fontSize: 9,
    padding: 24,
    direction: "rtl",
    textAlign: "right",
  },
  title: { fontSize: 16, marginBottom: 12, textAlign: "right", fontWeight: "bold" },
  bold: { fontWeight: "bold" },
  table: {
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#999",
  },
  row: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  headerRow: {
    flexDirection: "row-reverse",
    backgroundColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#999",
  },
  cell: {
    padding: 3,
    borderLeftWidth: 1,
    borderLeftColor: "#ccc",
    textAlign: "right",
  },
  labelCell: {
    padding: 3,
    borderLeftWidth: 1,
    borderLeftColor: "#ccc",
    textAlign: "center",
    backgroundColor: "#e4e4e7",
  },
  specialCell: {
    padding: 3,
    borderLeftWidth: 1,
    borderLeftColor: "#ccc",
    textAlign: "right",
    backgroundColor: "#f4f4f5",
  },
  nameBox: {
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 3,
    marginBottom: 1,
  },
});

const TIME_W = "10%";
const DAY_W = "12.85%";

function nameBoxes(rows: HamalAssignmentRow[], byId: Map<string, HamalSambatzRow>) {
  return rows.map((a) => {
    const s = byId.get(a.sambatz_id);
    const color = s?.color ?? null;
    return createElement(
      View,
      {
        key: a.id,
        style: color
          ? [styles.nameBox, { backgroundColor: color }]
          : styles.nameBox,
      },
      createElement(
        Text,
        { style: color ? { color: textOn(color) } : {} },
        s?.full_name ?? "—",
      ),
    );
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weekParam = url.searchParams.get("week");
  const baseDate = weekParam ? new Date(weekParam) : new Date();
  const weekStart = getWeekStart(
    isNaN(baseDate.getTime()) ? new Date() : baseDate,
  );
  const days = weekDays(weekStart);
  const startKey = dateKey(days[0]);
  const endKey = dateKey(days[6]);

  const supabase = await createClient();

  const [
    { data: settingsData },
    { data: sambatzimData },
    { data: assignData },
    { data: dayTextData },
  ] = await Promise.all([
    supabase.from("app_settings").select("key, value"),
    supabase.from("hamal_sambatzim").select("*"),
    supabase
      .from("hamal_assignments")
      .select("*")
      .gte("shift_date", startKey)
      .lte("shift_date", endKey),
    supabase
      .from("hamal_day_text")
      .select("*")
      .gte("shift_date", startKey)
      .lte("shift_date", endKey),
  ]);

  const settings = (settingsData as { key: string; value: string }[]) ?? [];
  const getSetting = (k: string, dflt: number) => {
    const n = Number(settings.find((s) => s.key === k)?.value);
    return Number.isFinite(n) ? n : dflt;
  };
  const length = getSetting("hamal_shift_length_hours", 8);
  const start = getSetting("hamal_day_start_hour", 0);
  const showAttack =
    settings.find((s) => s.key === "hamal_show_attack")?.value !== "false";
  const slots = computeSlots(length, start);
  const textRows = DAY_TEXT_ROWS.filter(
    (r) => r.kind !== "attack" || showAttack,
  );

  const sambatzim = (sambatzimData as HamalSambatzRow[]) ?? [];
  const byId = new Map(sambatzim.map((s) => [s.id, s]));
  const assignments = (assignData as HamalAssignmentRow[]) ?? [];
  const dayTexts = (dayTextData as HamalDayTextRow[]) ?? [];
  const textByCell = new Map<string, string>();
  dayTexts.forEach((t) => textByCell.set(`${t.shift_date}|${t.kind}`, t.content));

  const byCell = new Map<string, HamalAssignmentRow[]>();
  const homeByDate = new Map<string, HamalAssignmentRow[]>();
  for (const a of assignments) {
    if (a.slot_start_hour === HOME_SLOT) {
      (homeByDate.get(a.shift_date) ?? homeByDate.set(a.shift_date, []).get(a.shift_date)!).push(a);
    } else {
      const key = `${a.shift_date}|${a.slot_start_hour}`;
      (byCell.get(key) ?? byCell.set(key, []).get(key)!).push(a);
    }
  }

  // Header row: time label + 7 day headers.
  const headerCells = [
    createElement(
      View,
      { key: "h-time", style: [styles.labelCell, { width: TIME_W }] },
      createElement(Text, { style: styles.bold }, "שעות"),
    ),
    ...days.map((d) =>
      createElement(
        View,
        { key: `h-${dateKey(d)}`, style: [styles.cell, { width: DAY_W }] },
        createElement(
          Text,
          { style: styles.bold },
          `${WEEKDAY_HE[d.getDay()]} ${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`,
        ),
      ),
    ),
  ];

  const slotRows = slots.map((slot) =>
    createElement(View, { key: `r-${slot.startHour}`, style: styles.row }, [
      createElement(
        View,
        { key: "lbl", style: [styles.labelCell, { width: TIME_W }] },
        createElement(Text, { style: styles.bold }, slot.label),
      ),
      ...days.map((d) =>
        createElement(
          View,
          { key: dateKey(d), style: [styles.cell, { width: DAY_W }] },
          nameBoxes(byCell.get(`${dateKey(d)}|${slot.startHour}`) ?? [], byId),
        ),
      ),
    ]),
  );

  const homeRow = createElement(View, { key: "home", style: styles.row }, [
    createElement(
      View,
      { key: "lbl", style: [styles.labelCell, { width: TIME_W }] },
      createElement(Text, { style: styles.bold }, "בבית"),
    ),
    ...days.map((d) =>
      createElement(
        View,
        { key: dateKey(d), style: [styles.specialCell, { width: DAY_W }] },
        nameBoxes(homeByDate.get(dateKey(d)) ?? [], byId),
      ),
    ),
  ]);

  const textRowEls = textRows.map((row) =>
    createElement(View, { key: row.kind, style: styles.row }, [
      createElement(
        View,
        { key: "lbl", style: [styles.labelCell, { width: TIME_W }] },
        createElement(Text, { style: styles.bold }, row.label),
      ),
      ...days.map((d) =>
        createElement(
          View,
          { key: dateKey(d), style: [styles.specialCell, { width: DAY_W }] },
          createElement(
            Text,
            {},
            textByCell.get(`${dateKey(d)}|${row.kind}`) ?? "",
          ),
        ),
      ),
    ]),
  );

  const doc = createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", orientation: "landscape" as const, style: styles.page },
      [
        createElement(
          Text,
          { style: styles.title, key: "title" },
          `שבצק חמל — ${days[0].getDate().toString().padStart(2, "0")}/${(days[0].getMonth() + 1).toString().padStart(2, "0")}–${days[6].getDate().toString().padStart(2, "0")}/${(days[6].getMonth() + 1).toString().padStart(2, "0")}`,
        ),
        createElement(View, { style: styles.table, key: "table" }, [
          createElement(View, { style: styles.headerRow, key: "head" }, headerCells),
          ...slotRows,
          homeRow,
          ...textRowEls,
        ]),
      ],
    ),
  );

  const buffer = await renderToBuffer(doc);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hamal_${startKey}.pdf"`,
    },
  });
}
