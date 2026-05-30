"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  STATUS_HE,
  COMPANY_HE,
  type VehicleStatus,
  type VehicleCompany,
} from "@/lib/constants";
import { formatDateHebrew, isDateNear } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { VehicleRow } from "@/types/database";

const STATUS_CLASS: Record<VehicleStatus, string> = {
  active: "bg-green-100 text-green-800",
  garage: "bg-amber-100 text-amber-800",
  disabled: "bg-red-100 text-red-800",
};

export interface VehicleMobileCardsProps {
  vehicles: VehicleRow[];
  getModelHe: (v?: string | null) => string;
  getUsageHe: (v?: string | null) => string;
  onEdit: (v: VehicleRow) => void;
  onDelete: (v: VehicleRow) => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span className="text-left">{value}</span>
    </div>
  );
}

export function VehicleMobileCards({
  vehicles,
  getModelHe,
  getUsageHe,
  onEdit,
  onDelete,
}: VehicleMobileCardsProps) {
  if (vehicles.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        לא נמצאו רכבים
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicles.map((v) => (
        <div key={v.id} className="rounded-lg border p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-base font-semibold">
              {v.vehicle_number}
            </span>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-sm font-medium",
                `status-${v.status}`,
                STATUS_CLASS[v.status as VehicleStatus],
              )}
            >
              {STATUS_HE[v.status as VehicleStatus]}
            </span>
          </div>

          <div className="space-y-1">
            <Row
              label="פלוגה"
              value={COMPANY_HE[v.at_company as VehicleCompany]}
            />
            <Row label="תפקיד" value={getUsageHe(v.usage)} />
            <Row label="סוג" value={getModelHe(v.model)} />
            <Row
              label='ק"מ'
              value={v.km != null ? v.km.toLocaleString("he-IL") : ""}
            />
            <Row label="טיפול הבא" value={v.next_treatment} />
            <Row
              label="תאריך טיפול"
              value={
                <span
                  className={cn(
                    isDateNear(v.next_treatment_date) &&
                      "date-warning rounded bg-yellow-100 px-1 text-yellow-900",
                  )}
                >
                  {formatDateHebrew(v.next_treatment_date)}
                </span>
              }
            />
            <Row
              label="תפוגת רישיון"
              value={
                <span
                  className={cn(
                    isDateNear(v.license_expiration) &&
                      "date-warning rounded bg-yellow-100 px-1 text-yellow-900",
                  )}
                >
                  {formatDateHebrew(v.license_expiration)}
                </span>
              }
            />
            {v.notes && <Row label="הערות" value={v.notes} />}
          </div>

          <div className="mt-3 flex justify-end gap-1">
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
        </div>
      ))}
    </div>
  );
}
