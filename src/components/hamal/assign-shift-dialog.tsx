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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HamalSambatzRow } from "@/types/database";

const NONE = "__none__";

export interface AssignShiftDialogProps {
  open: boolean;
  /** Title context, e.g. "ראשון 29/06 · 08:00–16:00" */
  contextLabel: string;
  sambatzim: HamalSambatzRow[];
  /** Currently assigned sambatz ids (0-2). */
  currentIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}

export function AssignShiftDialog({
  open,
  contextLabel,
  sambatzim,
  currentIds,
  onClose,
  onSave,
}: AssignShiftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[440px]">
        {open && (
          <AssignForm
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

function AssignForm({
  contextLabel,
  sambatzim,
  currentIds,
  onClose,
  onSave,
}: Omit<AssignShiftDialogProps, "open">) {
  const [first, setFirst] = useState(currentIds[0] ?? NONE);
  const [second, setSecond] = useState(currentIds[1] ?? NONE);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const picked = [first, second].filter((v) => v && v !== NONE);
    if (picked.length === 2 && picked[0] === picked[1]) {
      toast.error("לא ניתן לשבץ את אותו חייל פעמיים באותה משמרת");
      return;
    }
    onSave(picked);
  }

  const options = (exclude: string) => (
    <>
      <SelectItem value={NONE}>— ללא —</SelectItem>
      {sambatzim
        .filter((s) => s.id !== exclude || exclude === NONE)
        .map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.full_name}
          </SelectItem>
        ))}
    </>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>שיבוץ — {contextLabel}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {sambatzim.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            אין סמבצים. הוסף סמבצים תחילה דרך כפתור &quot;ניהול סמבצים&quot;.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>חייל 1</Label>
              <Select value={first} onValueChange={setFirst}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{options(second)}</SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>חייל 2</Label>
              <Select value={second} onValueChange={setSecond}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{options(first)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button type="submit" disabled={sambatzim.length === 0}>
            שמור
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
