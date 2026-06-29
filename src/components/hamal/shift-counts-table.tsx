"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HamalSambatzRow } from "@/types/database";

export interface ShiftCountsTableProps {
  sambatzim: HamalSambatzRow[];
  /** sambatz_id → number of shifts this week (home excluded). */
  countById: Map<string, number>;
}

export function ShiftCountsTable({
  sambatzim,
  countById,
}: ShiftCountsTableProps) {
  const rows = useMemo(() => {
    return [...sambatzim]
      .map((s) => ({ s, count: countById.get(s.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.s.full_name.localeCompare(b.s.full_name, "he"));
  }, [sambatzim, countById]);

  if (sambatzim.length === 0) return null;

  return (
    <div className="space-y-2" dir="rtl">
      <h2 className="text-lg font-semibold">סיכום משמרות השבוע</h2>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">סמבץ</TableHead>
              <TableHead className="text-right">מספר משמרות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ s, count }) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full border"
                      style={{ backgroundColor: s.color ?? "transparent" }}
                    />
                    {s.full_name}
                  </div>
                </TableCell>
                <TableCell>{count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
