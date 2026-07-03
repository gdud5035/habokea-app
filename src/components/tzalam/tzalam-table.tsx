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
import { orderTzalamRows, tzalamAttrValue as attrValue } from "@/lib/tzalam-order";

export interface TzalamTableProps {
  items: TzalamItemRow[];
  columns: TzalamColumnRow[];
  types: TzalamEquipmentTypeRow[];
  groups: TzalamGroupRow[];
  marks: Record<string, boolean>;
  companyHe: (company: string) => string;
  showCompany: boolean;
  rowEditable: (company: string) => boolean;
  sortField?: "" | "type" | "group" | "present" | "signed";
  sortDir?: "asc" | "desc";
  onToggle: (item: TzalamItemRow, present: boolean) => void;
  onEdit: (item: TzalamItemRow) => void;
  onDelete: (item: TzalamItemRow) => void;
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
  sortField = "",
  sortDir = "asc",
  onToggle,
  onEdit,
  onDelete,
}: TzalamTableProps) {
  const colCount = 1 + (showCompany ? 1 : 0) + columns.length + 2;

  // Ordering + group-header placement is shared with the PDF export so the
  // download matches the on-screen view exactly.
  const rows = orderTzalamRows({
    items,
    columns,
    types,
    groups,
    marks,
    sortField,
    sortDir,
  });

  if (rows.length === 0) {
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
