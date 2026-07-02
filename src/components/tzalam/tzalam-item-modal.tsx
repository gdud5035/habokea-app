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
import type {
  TzalamItemRow,
  TzalamColumnRow,
  TzalamEquipmentTypeRow,
} from "@/types/database";
import type { TzalamCompany } from "@/lib/constants";

export interface TzalamItemModalProps {
  open: boolean;
  item: TzalamItemRow | null;
  columns: TzalamColumnRow[];
  types: TzalamEquipmentTypeRow[];
  companies: TzalamCompany[]; // editable companies to choose from
  companyHe: (company: string) => string;
  defaultCompany: TzalamCompany | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    company: string;
    equipment_type_id: string | null;
    attributes: Record<string, string | number>;
  }) => void;
}

export function TzalamItemModal(props: TzalamItemModalProps) {
  const { open, item, onClose } = props;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        {open && (
          <ItemForm key={item?.id ?? "new"} {...props} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  item,
  columns,
  types,
  companies,
  companyHe,
  defaultCompany,
  onClose,
  onSave,
}: Omit<TzalamItemModalProps, "open">) {
  const [company, setCompany] = useState<string>(
    item?.company ?? defaultCompany ?? companies[0] ?? "",
  );
  const [typeId, setTypeId] = useState<string>(item?.equipment_type_id ?? "");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const attrs = (item?.attributes ?? {}) as Record<string, unknown>;
    const init: Record<string, string> = {};
    for (const c of columns) {
      const v = attrs[c.id];
      init[c.id] = v == null ? "" : String(v);
    }
    return init;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) {
      toast.error("יש לבחור פלוגה");
      return;
    }
    if (!typeId) {
      toast.error("יש לבחור סוג אמצעי");
      return;
    }
    const attributes: Record<string, string | number> = {};
    for (const c of columns) {
      const raw = values[c.id]?.trim() ?? "";
      if (raw === "") continue;
      attributes[c.id] = c.field_type === "number" ? Number(raw) : raw;
    }
    onSave({
      id: item?.id,
      company,
      equipment_type_id: typeId,
      attributes,
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item?.id ? "עריכת אמצעי" : "הוספת אמצעי"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>פלוגה *</Label>
            <Select value={company} onValueChange={(v) => setCompany(v)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר פלוגה" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {companyHe(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>סוג אמצעי *</Label>
            <Select value={typeId} onValueChange={(v) => setTypeId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {columns.map((c) => (
            <div key={c.id} className="flex flex-col gap-1.5">
              <Label htmlFor={`col-${c.id}`}>{c.label}</Label>
              <Input
                id={`col-${c.id}`}
                type={c.field_type === "number" ? "number" : "text"}
                value={values[c.id] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [c.id]: e.target.value }))
                }
              />
            </div>
          ))}
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
