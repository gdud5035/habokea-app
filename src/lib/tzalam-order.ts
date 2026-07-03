import type {
  TzalamItemRow,
  TzalamColumnRow,
  TzalamEquipmentTypeRow,
  TzalamGroupRow,
} from "@/types/database";

export type TzalamSortField = "" | "type" | "group" | "present" | "signed";
export type TzalamSortDir = "asc" | "desc";

export interface OrderedTzalamRow {
  item: TzalamItemRow;
  type: TzalamEquipmentTypeRow | null;
  group: TzalamGroupRow | null;
  /** True when this row begins a new group section (default sort only). */
  showGroupHeader: boolean;
}

export function tzalamAttrValue(item: TzalamItemRow, columnId: string): string {
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const v = attrs[columnId];
  if (v == null) return "";
  return String(v);
}

export interface OrderTzalamParams {
  items: TzalamItemRow[];
  columns: TzalamColumnRow[];
  types: TzalamEquipmentTypeRow[];
  groups: TzalamGroupRow[];
  marks: Record<string, boolean>;
  sortField?: TzalamSortField;
  sortDir?: TzalamSortDir;
}

/**
 * Produces the exact on-screen ordering of the tzalam table — the same sort,
 * grouping, and group-header placement the table renders. Shared by the table
 * component and the PDF export so the download matches the visible view.
 */
export function orderTzalamRows({
  items,
  columns,
  types,
  groups,
  marks,
  sortField = "",
  sortDir = "asc",
}: OrderTzalamParams): OrderedTzalamRow[] {
  const typeById = new Map(types.map((t) => [t.id, t]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const typeName = (item: TzalamItemRow): string =>
    (item.equipment_type_id ? typeById.get(item.equipment_type_id)?.name : "") ??
    "";
  const groupName = (item: TzalamItemRow): string => {
    const t = item.equipment_type_id ? typeById.get(item.equipment_type_id) : null;
    return (t?.group_id ? groupById.get(t.group_id)?.name : "") ?? "";
  };
  const signedColId = columns.find((c) => c.label === "חייל חתום")?.id ?? null;
  const signedName = (item: TzalamItemRow): string =>
    signedColId ? tzalamAttrValue(item, signedColId) : "";

  const sorted = [...items];
  if (sortField) {
    const dir = sortDir === "desc" ? -1 : 1;
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === "type") cmp = typeName(a).localeCompare(typeName(b), "he");
      else if (sortField === "group")
        cmp = groupName(a).localeCompare(groupName(b), "he");
      else if (sortField === "signed") {
        const sa = signedName(a);
        const sb = signedName(b);
        if (!sa && !sb) cmp = 0;
        else if (!sa) cmp = 1 * (dir === -1 ? -1 : 1);
        else if (!sb) cmp = -1 * (dir === -1 ? -1 : 1);
        else cmp = sa.localeCompare(sb, "he");
      } else if (sortField === "present")
        cmp = Number(marks[a.id] ?? false) - Number(marks[b.id] ?? false);
      return cmp * dir;
    });
  } else {
    sorted.sort((a, b) => {
      const ta = a.equipment_type_id ? typeById.get(a.equipment_type_id) : null;
      const tb = b.equipment_type_id ? typeById.get(b.equipment_type_id) : null;
      const ga = ta?.group_id ? groupById.get(ta.group_id) : null;
      const gb = tb?.group_id ? groupById.get(tb.group_id) : null;
      const gpa = ga?.position ?? 9999;
      const gpb = gb?.position ?? 9999;
      if (gpa !== gpb) return gpa - gpb;
      const tpa = ta?.position ?? 9999;
      const tpb = tb?.position ?? 9999;
      if (tpa !== tpb) return tpa - tpb;
      return a.position - b.position;
    });
  }

  return orderedFrom(sorted, sortField, typeById, groupById);
}

function orderedFrom(
  sorted: TzalamItemRow[],
  sortField: TzalamSortField,
  typeById: Map<string, TzalamEquipmentTypeRow>,
  groupById: Map<string, TzalamGroupRow>,
): OrderedTzalamRow[] {
  return sorted.map((item, idx) => {
    const type = item.equipment_type_id
      ? typeById.get(item.equipment_type_id) ?? null
      : null;
    const group = type?.group_id ? groupById.get(type.group_id) ?? null : null;
    const groupKey = group?.id ?? "__none__";
    const prev = sorted[idx - 1];
    const prevType = prev?.equipment_type_id
      ? typeById.get(prev.equipment_type_id)
      : null;
    const prevGroup = prevType?.group_id
      ? groupById.get(prevType.group_id)
      : null;
    const prevGroupKey = prevGroup?.id ?? "__none__";
    const showGroupHeader =
      !sortField && !!group && (idx === 0 || groupKey !== prevGroupKey);
    return { item, type, group, showGroupHeader };
  });
}

/** A single PDF row: either a group section header or a data row of cells. */
export type TzalamExportRow =
  | { kind: "group"; label: string }
  | { kind: "data"; cells: string[] };

export interface TzalamExportPayload {
  title: string;
  headers: string[];
  rows: TzalamExportRow[];
}

export interface BuildTzalamExportParams extends OrderTzalamParams {
  /** Whether the "פלוגה" column is shown (i.e. viewing all companies). */
  showCompany: boolean;
  /** Maps a company code to its Hebrew label. */
  companyHe: (company: string) => string;
  /** PDF title (e.g. includes the selected date). */
  title: string;
}

/**
 * Flattens the ordered, filtered view into a printable payload: header labels
 * plus one entry per visible row (group headers included), each present item
 * marked with ✔. Mirrors the columns rendered by the table minus the actions.
 */
export function buildTzalamExport({
  showCompany,
  companyHe,
  title,
  ...orderParams
}: BuildTzalamExportParams): TzalamExportPayload {
  const { columns, marks } = orderParams;
  const ordered = orderTzalamRows(orderParams);

  const headers = [
    "נמצא",
    "סוג האמצעי",
    ...(showCompany ? ["פלוגה"] : []),
    ...columns.map((c) => c.label),
  ];

  const rows: TzalamExportRow[] = [];
  for (const { item, type, group, showGroupHeader } of ordered) {
    if (showGroupHeader && group) {
      rows.push({ kind: "group", label: group.name });
    }
    const cells = [
      marks[item.id] ? "✔" : "",
      type?.name ?? "—",
      ...(showCompany ? [companyHe(item.company)] : []),
      ...columns.map((c) => tzalamAttrValue(item, c.id) || "—"),
    ];
    rows.push({ kind: "data", cells });
  }

  return { title, headers, rows };
}
