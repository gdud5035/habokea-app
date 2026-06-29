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

export interface ShiftSettings {
  length: number;
  start: number;
}

export interface ShiftSettingsDialogProps {
  open: boolean;
  current: ShiftSettings;
  onClose: () => void;
  onSave: (settings: ShiftSettings) => void;
}

export function ShiftSettingsDialog({
  open,
  current,
  onClose,
  onSave,
}: ShiftSettingsDialogProps) {
  const [length, setLength] = useState(String(current.length));
  const [start, setStart] = useState(String(current.start));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const len = Math.floor(Number(length));
    const st = Math.floor(Number(start));
    if (!Number.isFinite(len) || len < 1 || len > 24) {
      toast.error("אורך המשמרת חייב להיות בין 1 ל-24 שעות");
      return;
    }
    if (!Number.isFinite(st) || st < 0 || st > 23) {
      toast.error("שעת ההתחלה חייבת להיות בין 0 ל-23");
      return;
    }
    onSave({ length: len, start: st });
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
              value={length}
              onChange={(e) => setLength(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="day-start">שעת התחלה</Label>
            <Input
              id="day-start"
              type="number"
              min={0}
              max={23}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              חלוקת המשמרות מתחילה משעה זו. שינוי ההגדרות מחלק מחדש את לוח השבוע;
              שיבוצים שאינם מתיישרים לשעת התחלה חדשה לא יוצגו.
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
