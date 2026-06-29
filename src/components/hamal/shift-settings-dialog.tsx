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

export interface ShiftSettingsDialogProps {
  open: boolean;
  current: number;
  onClose: () => void;
  onSave: (hours: number) => void;
}

export function ShiftSettingsDialog({
  open,
  current,
  onClose,
  onSave,
}: ShiftSettingsDialogProps) {
  const [value, setValue] = useState(String(current));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hours = Math.floor(Number(value));
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      toast.error("אורך המשמרת חייב להיות בין 1 ל-24 שעות");
      return;
    }
    onSave(hours);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>הגדרות שבצק חמל</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-length">אורך משמרת (שעות)</Label>
            <Input
              id="shift-length"
              type="number"
              min={1}
              max={24}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              שינוי אורך המשמרת מחלק מחדש את לוח השבוע. שיבוצים קיימים שאינם
              מתיישרים לשעת התחלה חדשה לא יוצגו.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit">שמור</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
