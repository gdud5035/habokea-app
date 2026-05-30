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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VEHICLE_COMPANIES,
  COMPANY_HE,
  type VehicleCompany,
} from "@/lib/constants";
import type { DroneRow, DroneInsert } from "@/types/database";

export interface DroneModalProps {
  open: boolean;
  drone: DroneRow | null;
  onClose: () => void;
  onSave: (data: DroneInsert & { id?: string }) => void;
}

type FormState = {
  name: string;
  at_company: VehicleCompany | "";
  signed_by: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    at_company: "",
    signed_by: "",
  };
}

function fromDrone(d: DroneRow): FormState {
  return {
    name: d.name ?? "",
    at_company: (d.at_company ?? "") as VehicleCompany | "",
    signed_by: d.signed_by ?? "",
  };
}

export function DroneModal({ open, drone, onClose, onSave }: DroneModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        {/* Remount the form on each open so it re-initializes from props. */}
        {open && (
          <DroneModalForm
            key={drone?.id ?? "new"}
            drone={drone}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DroneModalForm({
  drone,
  onClose,
  onSave,
}: Omit<DroneModalProps, "open">) {
  const [form, setForm] = useState<FormState>(() =>
    drone ? fromDrone(drone) : emptyForm(),
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("יש להזין שם");
      return;
    }

    const payload: DroneInsert & { id?: string } = {
      name: form.name.trim(),
      at_company: form.at_company || null,
      signed_by: form.signed_by.trim() || null,
    };
    if (drone?.id) payload.id = drone.id;

    onSave(payload);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{drone?.id ? "עריכת רחפן" : "הוספת רחפן"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">שם *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>פלוגה</Label>
            <Select
              value={form.at_company || "__none__"}
              onValueChange={(v) =>
                set(
                  "at_company",
                  !v || v === "__none__" ? "" : (v as VehicleCompany),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר פלוגה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">ללא</SelectItem>
                {VEHICLE_COMPANIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {COMPANY_HE[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signed_by">חתום על ידי</Label>
            <Input
              id="signed_by"
              value={form.signed_by}
              onChange={(e) => set("signed_by", e.target.value)}
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
