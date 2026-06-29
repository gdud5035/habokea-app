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
import { Textarea } from "@/components/ui/textarea";

export interface DayTextDialogProps {
  open: boolean;
  /** e.g. "הערות — ראשון 28/06" */
  contextLabel: string;
  value: string;
  onClose: () => void;
  onSave: (content: string) => void;
}

export function DayTextDialog({
  open,
  contextLabel,
  value,
  onClose,
  onSave,
}: DayTextDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        {open && (
          <DayTextForm
            key={contextLabel}
            contextLabel={contextLabel}
            value={value}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DayTextForm({
  contextLabel,
  value,
  onClose,
  onSave,
}: Omit<DayTextDialogProps, "open">) {
  const [text, setText] = useState(value);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{contextLabel}</DialogTitle>
      </DialogHeader>

      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="טקסט חופשי…"
      />

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          ביטול
        </Button>
        <Button type="button" onClick={() => onSave(text.trim())}>
          שמור
        </Button>
      </DialogFooter>
    </>
  );
}
