"use client";

import { Fragment } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type {
  TzalamItemRow,
  TzalamColumnRow,
  TzalamEquipmentTypeRow,
  TzalamGroupRow,
} from "@/types/database";

export interface TzalamTableProps {
  items: TzalamItemRow[];
  columns: TzalamColumnRow[];
  types: TzalamEquipmentTypeRow[];
  groups: TzalamGroupRow[];
  marks: Record<string, boolean>;
  companyHe: (company: string) => string;
  showCompany: boolean;
  rowEditable: (company: string) => boolean;
  onToggle: (item: TzalamItemRow, present: boolean) => void;
  onEdit: (item: TzalamItemRow) => void;
  onDelete: (item: TzalamItemRow) => void;
}

function attrValue(item: TzalamItemRow, columnId: string): string {
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const v = attrs[columnId];
  if (v == null) return "";
  return String(v);
}

export function TzalamTable({
  items,
  columns,
  types,
  groups,
  marks,
  companyHe,
  showCompany,
  rowEditable,
  onToggle,
  onEdit,
  onDelete,
}: TzalamTableProps) {
  const typeById = new Map(types.map((t) => [t.id, t]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  // Sort: by group order, then equipment type order, then item position.
  const sorted = [...items].sort((a, b) => {
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

  const colCount = 1 + (showCompany ? 1 : 0) + columns.length + 2;

  // Precompute each row + whether it starts a new group section (no render-time mutation).
  const rows = sorted.map((item, idx) => {
    const type = item.equipment_type_id
      ? typeById.get(item.equipment_type_id)
      : null;
    const group = type?.group_id ? groupById.get(type.group_id) : null;
    const groupKey = group?.id ?? "__none__";
    const prev = sorted[idx - 1];
    const prevType = prev?.equipment_type_id
      ? typeById.get(prev.equipment_type_id)
      : null;
    const prevGroup = prevType?.group_id
      ? groupById.get(prevType.group_id)
      : null;
    const prevGroupKey = prevGroup?.id ?? "__none__";
    const showGroupHeader = !!group && (idx === 0 || groupKey !== prevGroupKey);
    return { item, type, group, showGroupHeader };
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        אין אמצעים להצגה
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table dir="rtl">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">נמצא</TableHead>
            <TableHead className="text-right">סוג האמצעי</TableHead>
            {showCompany && <TableHead className="text-right">פלוגה</TableHead>}
            {columns.map((c) => (
              <TableHead key={c.id} className="text-right">
                {c.label}
              </TableHead>
            ))}
            <TableHead className="text-center">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ item, type, group, showGroupHeader }) => {
            const editable = rowEditable(item.company);
            const present = marks[item.id] ?? false;

            return (
              <Fragment key={item.id}>
                {showGroupHeader && (
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableCell
                      colSpan={colCount}
                      className="py-1.5 text-right text-xs font-semibold text-muted-foreground"
                    >
                      {group!.name}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={present}
                        disabled={!editable}
                        onCheckedChange={(c: boolean) =>
                          onToggle(item, Boolean(c))
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {type?.name ?? "—"}
                  </TableCell>
                  {showCompany && (
                    <TableCell className="text-right">
                      {companyHe(item.company)}
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.id} className="text-right">
                      {attrValue(item, c.id) || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!editable}
                        onClick={() => onEdit(item)}
                        aria-label="ערוך"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!editable}
                        onClick={() => onDelete(item)}
                        aria-label="מחק"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
