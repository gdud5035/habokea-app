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
import type { TzalamExportPayload } from "@/lib/tzalam-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bundled Hebrew-capable static TTFs (public/fonts) so Hebrew renders instead
// of tofu. Same font the חמל export uses.
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
    fontSize: 8,
    padding: 20,
    direction: "rtl",
    textAlign: "right",
  },
  title: {
    fontSize: 15,
    marginBottom: 10,
    textAlign: "right",
    fontWeight: "bold",
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
    backgroundColor: "#e4e4e7",
    borderBottomWidth: 1,
    borderBottomColor: "#999",
  },
  groupRow: {
    flexDirection: "row-reverse",
    backgroundColor: "#f4f4f5",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  cell: {
    padding: 3,
    borderLeftWidth: 1,
    borderLeftColor: "#ccc",
    textAlign: "right",
  },
  headerCell: {
    padding: 3,
    borderLeftWidth: 1,
    borderLeftColor: "#999",
    textAlign: "right",
    fontWeight: "bold",
  },
  groupCell: {
    padding: 3,
    textAlign: "right",
    fontWeight: "bold",
  },
});

function isPayload(v: unknown): v is TzalamExportPayload {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.title === "string" &&
    Array.isArray(p.headers) &&
    Array.isArray(p.rows)
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!isPayload(body)) {
    return new Response("Invalid payload", { status: 400 });
  }
  const { title, headers, rows } = body;

  // First column ("נמצא") is a narrow checkmark; the rest share the remainder.
  const restCount = Math.max(headers.length - 1, 1);
  const markW = "7%";
  const cellW = `${93 / restCount}%`;
  const colWidth = (i: number) => (i === 0 ? markW : cellW);

  const headerCells = headers.map((h, i) =>
    createElement(
      View,
      { key: `h-${i}`, style: [styles.headerCell, { width: colWidth(i) }] },
      createElement(Text, {}, h),
    ),
  );

  const bodyRows = rows.map((r, ri) => {
    if (r.kind === "group") {
      return createElement(
        View,
        { key: `r-${ri}`, style: styles.groupRow },
        createElement(
          View,
          { style: [styles.groupCell, { width: "100%" }] },
          createElement(Text, {}, r.label),
        ),
      );
    }
    return createElement(
      View,
      { key: `r-${ri}`, style: styles.row },
      r.cells.map((c, ci) =>
        createElement(
          View,
          { key: `c-${ci}`, style: [styles.cell, { width: colWidth(ci) }] },
          createElement(
            Text,
            { style: ci === 0 ? { textAlign: "center" } : undefined },
            c,
          ),
        ),
      ),
    );
  });

  const doc = createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", orientation: "landscape" as const, style: styles.page },
      [
        createElement(Text, { style: styles.title, key: "title" }, title),
        createElement(View, { style: styles.table, key: "table" }, [
          createElement(
            View,
            { style: styles.headerRow, key: "head", fixed: true },
            headerCells,
          ),
          ...bodyRows,
        ]),
      ],
    ),
  );

  const buffer = await renderToBuffer(doc);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tzalam.pdf"`,
    },
  });
}
