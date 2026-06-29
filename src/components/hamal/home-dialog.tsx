"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { textOn } from "@/lib/utils/week";
import type { HamalSambatzRow } from "@/types/database";

export interface HomeDialogProps {
  open: boolean;
  /** e.g. "ראשון 29/06" */
  contextLabel: string;
  sambatzim: HamalSambatzRow[];
  currentIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}

export function HomeDialog({
  open,
  contextLabel,
  sambatzim,
  currentIds,
  onClose,
  onSave,
}: HomeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[440px]">
        {open && (
          <HomeForm
            key={contextLabel}
            contextLabel={contextLabel}
            sambatzim={sambatzim}
            currentIds={currentIds}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function HomeForm({
  contextLabel,
  sambatzim,
  currentIds,
  onClose,
  onSave,
}: Omit<HomeDialogProps, "open">) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentIds),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>בבית — {contextLabel}</DialogTitle>
      </DialogHeader>

      {sambatzim.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין סמבצים.</p>
      ) : (
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {sambatzim.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
            >
              <Checkbox
                checked={selected.has(s.id)}
                onCheckedChange={() => toggle(s.id)}
              />
              <span
                className="size-3 shrink-0 rounded-full border"
                style={{
                  backgroundColor: s.color ?? "transparent",
                  borderColor: s.color ? textOn(s.color) : undefined,
                }}
              />
              <span className="text-sm">{s.full_name}</span>
            </label>
          ))}
        </div>
      )}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          ביטול
        </Button>
        <Button type="button" onClick={() => onSave([...selected])}>
          שמור
        </Button>
      </DialogFooter>
    </>
  );
}
