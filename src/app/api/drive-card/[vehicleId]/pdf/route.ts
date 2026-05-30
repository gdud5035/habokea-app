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
import type { DriveCardRow, VehicleRow, ProfileRow } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

Font.register({
  family: "Heebo",
  src: "https://fonts.gstatic.com/s/heebo/v26/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSysdUmj.ttf",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Heebo",
    fontSize: 9,
    padding: 24,
    direction: "rtl",
    textAlign: "right",
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
    textAlign: "right",
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 12,
    textAlign: "right",
  },
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
  totalsRow: {
    flexDirection: "row-reverse",
    marginTop: 10,
    fontSize: 11,
  },
});

// column widths (sum ~ 100%)
const cols = {
  date: "9%",
  driver: "11%",
  purpose: "14%",
  from: "11%",
  to: "11%",
  startKm: "8%",
  endKm: "8%",
  approved: "14%",
  dispatcher: "14%",
};

function cell(width: string, text: string, isHeader = false) {
  return createElement(
    View,
    { style: [styles.cell, { width }] },
    createElement(Text, isHeader ? { style: { fontSize: 8 } } : {}, text)
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("T")[0].split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await ctx.params;
  const supabase = await createClient();

  const [{ data: vehicle }, { data: entriesData }, { data: profilesData }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("id, vehicle_number, model, created_at")
        .eq("id", vehicleId)
        .single(),
      supabase
        .from("drive_cards")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("date", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email, phone, created_at"),
    ]);

  const v = vehicle as VehicleRow | null;
  const entries = (entriesData as DriveCardRow[]) || [];
  const profiles = (profilesData as ProfileRow[]) || [];

  const profileName: Record<string, string> = {};
  profiles.forEach((p) => {
    profileName[p.id] = p.full_name || p.email || p.id;
  });

  const totalTrips = entries.length;
  const totalKm = entries.reduce(
    (sum, e) => sum + ((e.end_km || 0) - (e.start_km || 0)),
    0
  );

  const headerCells = [
    cell(cols.date, "תאריך", true),
    cell(cols.driver, "נהג", true),
    cell(cols.purpose, "מטרת הנסיעה", true),
    cell(cols.from, "מהיכן", true),
    cell(cols.to, "לאן", true),
    cell(cols.startKm, 'ק"מ יציאה', true),
    cell(cols.endKm, 'ק"מ חזרה', true),
    cell(cols.approved, "אישור מפקד משימה", true),
    cell(cols.dispatcher, "אישור מפקד משלח משימה", true),
  ];

  const bodyRows = entries.map((e) =>
    createElement(View, { style: styles.row, key: e.id }, [
      cell(cols.date, formatDate(e.date)),
      cell(
        cols.driver,
        (e.driver_id ? profileName[e.driver_id] : "") || e.driver_id || "-"
      ),
      cell(cols.purpose, e.purpose || ""),
      cell(cols.from, e.from_location || ""),
      cell(cols.to, e.to_location || ""),
      cell(cols.startKm, String(e.start_km ?? "")),
      cell(cols.endKm, String(e.end_km ?? "")),
      cell(cols.approved, e.approved_by || ""),
      cell(cols.dispatcher, e.dispatcher_approval || "-"),
    ])
  );

  const vehicleLabel = v
    ? `${v.vehicle_number} - ${v.model}`
    : vehicleId;

  const doc = createElement(
    Document,
    {},
    createElement(Page, { size: "A4", orientation: "landscape" as const, style: styles.page }, [
      createElement(Text, { style: styles.title, key: "title" }, "כרטיס עבודה"),
      createElement(
        Text,
        { style: styles.subtitle, key: "subtitle" },
        `רכב: ${vehicleLabel}`
      ),
      createElement(View, { style: styles.table, key: "table" }, [
        createElement(View, { style: styles.headerRow, key: "head" }, headerCells),
        ...bodyRows,
      ]),
      createElement(
        Text,
        { style: styles.totalsRow, key: "totals" },
        `סה"כ נסיעות: ${totalTrips}    |    סה"כ ק"מ: ${totalKm}`
      ),
    ])
  );

  const buffer = await renderToBuffer(doc);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="drive_card_${vehicleId}.pdf"`,
    },
  });
}
