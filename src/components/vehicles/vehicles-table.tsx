"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import {
  VEHICLE_STATUSES,
  VEHICLE_COMPANIES,
  STATUS_HE,
  COMPANY_HE,
  SOURCE_HE,
  type VehicleStatus,
  type VehicleCompany,
  type VehicleSource,
} from "@/lib/constants";
import { formatDateHebrew, formatDateTimeHebrew, formatDateForInput, isDateNear } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { VehicleRow } from "@/types/database";

type EditableField =
  | "status"
  | "at_company"
  | "km"
  | "next_treatment"
  | "next_treatment_date"
  | "license_expiration"
  | "orea_last_fill";

interface EditingCell {
  id: string;
  field: EditableField;
}

export interface VehiclesTableProps {
  vehicles: VehicleRow[];
  getModelHe: (v?: string | null) => string;
  getUsageHe: (v?: string | null) => string;
  sortField: string;
  onSort: (field: string) => void;
  onInlineSave: (id: string, field: string, value: unknown) => void;
  isCompanySeparator: (index: number) => boolean;
  onEdit: (v: VehicleRow) => void;
  onDelete: (v: VehicleRow) => void;
}

const STATUS_CLASS: Record<VehicleStatus, string> = {
  active: "bg-green-100 text-green-800",
  garage: "bg-amber-100 text-amber-800",
  disabled: "bg-red-100 text-red-800",
};

const DATE_WARNING_CLASS = "bg-yellow-100 text-yellow-900";

const COLUMNS: { field: string; label: string; sortable: boolean }[] = [
  { field: "vehicle_number", label: "מספר רכב", sortable: true },
  { field: "model", label: "סוג", sortable: true },
  { field: "status", label: "סטטוס", sortable: true },
  { field: "at_company", label: "פלוגה", sortable: true },
  { field: "source", label: "מקור", sortable: true },
  { field: "usage", label: "תפקיד", sortable: true },
  { field: "km", label: 'ק"מ', sortable: true },
  { field: "km_last_update_at", label: "עדכון ק\"מ אחרון", sortable: true },
  { field: "next_treatment", label: "טיפול הבא", sortable: true },
  { field: "next_treatment_date", label: "תאריך טיפול הבא", sortable: true },
  { field: "back_from_garage", label: "חזרה ממוסך", sortable: true },
  { field: "license_expiration", label: "תפוגת רישיון", sortable: true },
  { field: "orea_last_fill", label: "מילוי אוראה אחרון", sortable: true },
  { field: "treatment_freq", label: "תדירות טיפול", sortable: true },
  { field: "problem_desc", label: "תקלות", sortable: false },
  { field: "notes", label: "הערות", sortable: false },
  { field: "updated_at", label: "עודכן לאחרונה", sortable: true },
  { field: "actions", label: "פעולות", sortable: false },
];

export function VehiclesTable({
  vehicles,
  getModelHe,
  getUsageHe,
  sortField,
  onSort,
  onInlineSave,
  isCompanySeparator,
  onEdit,
  onDelete,
}: VehiclesTableProps) {
  const [editing, setEditing] = useState<EditingCell | null>(null);
  // Draft value for the cell being edited.
  const [draft, setDraft] = useState<string>("");

  const startEdit = (v: VehicleRow, field: EditableField) => {
    setEditing({ id: v.id, field });
    const raw = v[field];
    if (field === "next_treatment_date" || field === "license_expiration" || field === "orea_last_fill") {
      setDraft(formatDateForInput(raw as string | null));
    } else {
      setDraft(raw == null ? "" : String(raw));
    }
  };

  const commit = (v: VehicleRow, field: EditableField, value: string) => {
    setEditing(null);
    let parsed: unknown = value;
    if (field === "km") {
      parsed = value === "" ? null : Number(value);
    } else if (
      field === "next_treatment_date" ||
      field === "license_expiration" ||
      field === "orea_last_fill"
    ) {
      parsed = value || null;
    } else if (field === "next_treatment") {
      parsed = value || null;
    }
    // Only save if changed.
    const current = v[field];
    const currentNorm =
      field === "km"
        ? current == null
          ? null
          : Number(current)
        : (current ?? null);
    if (parsed === currentNorm) return;
    onInlineSave(v.id, field, parsed);
  };

  const isEditing = (id: string, field: EditableField) =>
    editing?.id === id && editing?.field === field;

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead
                key={col.field}
                onClick={col.sortable ? () => onSort(col.field) : undefined}
                className={cn(
                  "whitespace-nowrap text-right",
                  col.sortable && "cursor-pointer select-none",
                )}
              >
                {col.label}
                {col.sortable && sortField === col.field ? " ↕" : ""}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {vehicles.map((v, i) => {
            const separator = isCompanySeparator(i);
            return (
              <TableRow
                key={v.id}
                className={cn(
                  separator && "company-separator border-t-4 border-t-foreground/60",
                )}
              >
                {/* vehicle_number */}
                <TableCell className="whitespace-nowrap">
                  {v.vehicle_number}
                </TableCell>

                {/* model */}
                <TableCell className="whitespace-nowrap">
                  {getModelHe(v.model)}
                </TableCell>

                {/* status (editable) */}
                <TableCell>
                  {isEditing(v.id, "status") ? (
                    <select
                      autoFocus
                      className="rounded border px-1 py-0.5 text-sm"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        commit(v, "status", e.target.value);
                      }}
                      onBlur={() => commit(v, "status", draft)}
                    >
                      {VEHICLE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_HE[s]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "cursor-pointer rounded px-2 py-0.5 text-sm font-medium",
                        `status-${v.status}`,
                        STATUS_CLASS[v.status as VehicleStatus],
                      )}
                      onClick={() => startEdit(v, "status")}
                    >
                      {STATUS_HE[v.status as VehicleStatus]}
                    </span>
                  )}
                </TableCell>

                {/* at_company (editable) */}
                <TableCell className="whitespace-nowrap">
                  {isEditing(v.id, "at_company") ? (
                    <select
                      autoFocus
                      className="rounded border px-1 py-0.5 text-sm"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        commit(v, "at_company", e.target.value);
                      }}
                      onBlur={() => commit(v, "at_company", draft)}
                    >
                      {VEHICLE_COMPANIES.map((c) => (
                        <option key={c} value={c}>
                          {COMPANY_HE[c]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className="cursor-pointer"
                      onClick={() => startEdit(v, "at_company")}
                    >
                      {COMPANY_HE[v.at_company as VehicleCompany]}
                    </span>
                  )}
                </TableCell>

                {/* source */}
                <TableCell className="whitespace-nowrap">
                  {v.source ? SOURCE_HE[v.source as VehicleSource] : ""}
                </TableCell>

                {/* usage */}
                <TableCell className="whitespace-nowrap">
                  {getUsageHe(v.usage)}
                </TableCell>

                {/* km (editable) */}
                <TableCell className="whitespace-nowrap">
                  {isEditing(v.id, "km") ? (
                    <Input
                      autoFocus
                      type="number"
                      className="h-8 w-24"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(v, "km", draft)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commit(v, "km", draft);
                      }}
                    />
                  ) : (
                    <span
                      className="cursor-pointer"
                      onClick={() => startEdit(v, "km")}
                    >
                      {v.km != null ? v.km.toLocaleString("he-IL") : ""}
                    </span>
                  )}
                </TableCell>

                {/* km_last_update_at (read-only) */}
                <TableCell className="whitespace-nowrap">
                  {formatDateHebrew(v.km_last_update_at)}
                </TableCell>

                {/* next_treatment (editable) */}
                <TableCell className="whitespace-nowrap">
                  {isEditing(v.id, "next_treatment") ? (
                    <Input
                      autoFocus
                      className="h-8 w-28"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(v, "next_treatment", draft)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          commit(v, "next_treatment", draft);
                      }}
                    />
                  ) : (
                    <span
                      className="cursor-pointer"
                      onClick={() => startEdit(v, "next_treatment")}
                    >
                      {v.next_treatment}
                    </span>
                  )}
                </TableCell>

                {/* next_treatment_date (editable — fixed to edit its OWN field) */}
                <TableCell
                  className={cn(
                    "whitespace-nowrap",
                    isDateNear(v.next_treatment_date) &&
                      `date-warning ${DATE_WARNING_CLASS}`,
                  )}
                >
                  {isEditing(v.id, "next_treatment_date") ? (
                    <Input
                      autoFocus
                      type="date"
                      className="h-8 w-36"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(v, "next_treatment_date", draft)}
                    />
                  ) : (
                    <span
                      className="cursor-pointer"
                      onClick={() => startEdit(v, "next_treatment_date")}
                    >
                      {formatDateHebrew(v.next_treatment_date)}
                    </span>
                  )}
                </TableCell>

                {/* back_from_garage (read-only) */}
                <TableCell
                  className={cn(
                    "whitespace-nowrap",
                    isDateNear(v.back_from_garage) &&
                      `date-warning ${DATE_WARNING_CLASS}`,
                  )}
                >
                  {formatDateHebrew(v.back_from_garage)}
                </TableCell>

                {/* license_expiration (editable) */}
                <TableCell
                  className={cn(
                    "whitespace-nowrap",
                    isDateNear(v.license_expiration) &&
                      `date-warning ${DATE_WARNING_CLASS}`,
                  )}
                >
                  {isEditing(v.id, "license_expiration") ? (
                    <Input
                      autoFocus
                      type="date"
                      className="h-8 w-36"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(v, "license_expiration", draft)}
                    />
                  ) : (
                    <span
                      className="cursor-pointer"
                      onClick={() => startEdit(v, "license_expiration")}
                    >
                      {formatDateHebrew(v.license_expiration)}
                    </span>
                  )}
                </TableCell>

                {/* orea_last_fill (editable unless no_orea) */}
                <TableCell
                  className={cn(
                    "whitespace-nowrap",
                    isDateNear(v.orea_last_fill) &&
                      `date-warning ${DATE_WARNING_CLASS}`,
                  )}
                >
                  {v.no_orea ? (
                    <span>ללא</span>
                  ) : isEditing(v.id, "orea_last_fill") ? (
                    <Input
                      autoFocus
                      type="date"
                      className="h-8 w-36"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(v, "orea_last_fill", draft)}
                    />
                  ) : (
                    <span
                      className="cursor-pointer"
                      onClick={() => startEdit(v, "orea_last_fill")}
                    >
                      {formatDateHebrew(v.orea_last_fill)}
                    </span>
                  )}
                </TableCell>

                {/* treatment_freq (read-only) */}
                <TableCell className="whitespace-nowrap">
                  {v.treatment_freq}
                </TableCell>

                {/* problem_desc */}
                <TableCell className="max-w-[200px] truncate">
                  {v.problem_desc}
                </TableCell>

                {/* notes */}
                <TableCell className="max-w-[200px] truncate">
                  {v.notes}
                </TableCell>

                {/* updated_at (read-only, auto-stamped) */}
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTimeHebrew(v.updated_at)}
                </TableCell>

                {/* actions */}
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="ערוך"
                      onClick={() => onEdit(v)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="מחק"
                      onClick={() => onDelete(v)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}

          {vehicles.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-muted-foreground"
              >
                לא נמצאו רכבים
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
