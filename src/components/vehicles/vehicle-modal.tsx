"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VEHICLE_STATUSES,
  VEHICLE_COMPANIES,
  VEHICLE_SOURCES,
  STATUS_HE,
  COMPANY_HE,
  SOURCE_HE,
  type VehicleStatus,
  type VehicleCompany,
  type VehicleSource,
} from "@/lib/constants";
import { formatDateForInput } from "@/lib/utils/format";
import type {
  VehicleRow,
  VehicleInsert,
  DataHelperItem,
} from "@/types/database";

export interface VehicleModalProps {
  open: boolean;
  vehicle: VehicleRow | null;
  models: DataHelperItem[];
  usages: DataHelperItem[];
  onClose: () => void;
  onSave: (data: VehicleInsert & { id?: string }) => void;
}

type FormState = {
  vehicle_number: string;
  model: string;
  status: VehicleStatus;
  at_company: VehicleCompany | "";
  source: VehicleSource | "";
  usage: string;
  km: string;
  next_treatment: string;
  next_treatment_date: string;
  back_from_garage: string;
  license_expiration: string;
  orea_last_fill: string;
  no_orea: boolean;
  treatment_freq: string;
  problem_desc: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    vehicle_number: "",
    model: "",
    status: "active",
    at_company: "Mafgad",
    source: "yaram",
    usage: "",
    km: "",
    next_treatment: "",
    next_treatment_date: "",
    back_from_garage: "",
    license_expiration: "",
    orea_last_fill: "",
    no_orea: false,
    treatment_freq: "",
    problem_desc: "",
    notes: "",
  };
}

function fromVehicle(v: VehicleRow): FormState {
  return {
    vehicle_number: v.vehicle_number ?? "",
    model: v.model ?? "",
    status: v.status as VehicleStatus,
    at_company: v.at_company as VehicleCompany,
    source: (v.source ?? "") as VehicleSource | "",
    usage: v.usage ?? "",
    km: v.km != null ? String(v.km) : "",
    next_treatment: v.next_treatment ?? "",
    next_treatment_date: formatDateForInput(v.next_treatment_date),
    back_from_garage: formatDateForInput(v.back_from_garage),
    license_expiration: formatDateForInput(v.license_expiration),
    orea_last_fill: formatDateForInput(v.orea_last_fill),
    no_orea: !!v.no_orea,
    treatment_freq: v.treatment_freq != null ? String(v.treatment_freq) : "",
    problem_desc: v.problem_desc ?? "",
    notes: v.notes ?? "",
  };
}

export function VehicleModal({
  open,
  vehicle,
  models,
  usages,
  onClose,
  onSave,
}: VehicleModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        {/* Remount the form on each open so it re-initializes from props. */}
        {open && (
          <VehicleModalForm
            key={vehicle?.id ?? "new"}
            vehicle={vehicle}
            models={models}
            usages={usages}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VehicleModalForm({
  vehicle,
  models,
  usages,
  onClose,
  onSave,
}: Omit<VehicleModalProps, "open">) {
  const [form, setForm] = useState<FormState>(() =>
    vehicle ? fromVehicle(vehicle) : emptyForm(),
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.vehicle_number.trim()) {
      toast.error("יש להזין מספר רכב");
      return;
    }
    if (!form.model) {
      toast.error("יש לבחור סוג");
      return;
    }
    if (!form.at_company) {
      toast.error("יש לבחור פלוגה");
      return;
    }
    if (!form.source) {
      toast.error("יש לבחור מקור");
      return;
    }
    // Validation rule from the original.
    if (!form.no_orea && !form.orea_last_fill) {
      toast.error("יש להזין תאריך מילוי אוראה אחרון עבור רכב עם אוראה");
      return;
    }

    const payload: VehicleInsert & { id?: string } = {
      vehicle_number: form.vehicle_number.trim(),
      model: form.model,
      status: form.status,
      at_company: form.at_company as VehicleCompany,
      source: form.source as VehicleSource,
      treatments_log: vehicle?.treatments_log ?? [],
      usage: form.usage || null,
      km: form.km !== "" ? Number(form.km) : null,
      next_treatment: form.next_treatment || null,
      next_treatment_date: form.next_treatment_date || null,
      back_from_garage: form.back_from_garage || null,
      license_expiration: form.license_expiration || null,
      orea_last_fill: form.no_orea ? null : form.orea_last_fill || null,
      no_orea: form.no_orea,
      treatment_freq:
        form.treatment_freq !== "" ? Number(form.treatment_freq) : null,
      problem_desc: form.problem_desc || null,
      notes: form.notes || null,
    };
    if (vehicle?.id) payload.id = vehicle.id;

    onSave(payload);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{vehicle?.id ? "עריכת רכב" : "הוספת רכב"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle_number">מספר רכב *</Label>
              <Input
                id="vehicle_number"
                value={form.vehicle_number}
                onChange={(e) => set("vehicle_number", e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>סוג *</Label>
              <Select
                value={form.model}
                onValueChange={(v) => set("model", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.translation_he}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>פלוגה *</Label>
              <Select
                value={form.at_company}
                onValueChange={(v) => set("at_company", v as VehicleCompany)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר פלוגה" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_COMPANIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {COMPANY_HE[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>מקור *</Label>
              <Select
                value={form.source}
                onValueChange={(v) => set("source", v as VehicleSource)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מקור" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SOURCE_HE[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="km">ק&quot;מ</Label>
              <Input
                id="km"
                type="number"
                value={form.km}
                onChange={(e) => set("km", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>סטטוס *</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as VehicleStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_HE[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>תפקיד</Label>
              <Select
                value={form.usage || "__none__"}
                onValueChange={(v) =>
                  set("usage", !v || v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">ללא</SelectItem>
                  {usages.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.translation_he}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="next_treatment">טיפול הבא</Label>
              <Input
                id="next_treatment"
                value={form.next_treatment}
                onChange={(e) => set("next_treatment", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="next_treatment_date">תאריך טיפול הבא</Label>
              <Input
                id="next_treatment_date"
                type="date"
                value={form.next_treatment_date}
                onChange={(e) => set("next_treatment_date", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="back_from_garage">חזרה ממוסך</Label>
              <Input
                id="back_from_garage"
                type="date"
                value={form.back_from_garage}
                onChange={(e) => set("back_from_garage", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license_expiration">תפוגת רישיון</Label>
              <Input
                id="license_expiration"
                type="date"
                value={form.license_expiration}
                onChange={(e) => set("license_expiration", e.target.value)}
              />
            </div>

            {!form.no_orea && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="orea_last_fill">מילוי אוראה אחרון</Label>
                <Input
                  id="orea_last_fill"
                  type="date"
                  value={form.orea_last_fill}
                  onChange={(e) => set("orea_last_fill", e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2 self-end pb-2">
              <Checkbox
                id="no_orea"
                checked={form.no_orea}
                onCheckedChange={(c: boolean) => set("no_orea", Boolean(c))}
              />
              <Label htmlFor="no_orea">ללא אוראה</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="treatment_freq">תדירות טיפול</Label>
              <Input
                id="treatment_freq"
                type="number"
                value={form.treatment_freq}
                onChange={(e) => set("treatment_freq", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="problem_desc">תקלות</Label>
              <Textarea
                id="problem_desc"
                value={form.problem_desc}
                onChange={(e) => set("problem_desc", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button type="submit">שמור</Button>
        </DialogFooter>
      </form>
    </>
  );
}
