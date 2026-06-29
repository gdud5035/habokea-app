"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HamalSambatzRow } from "@/types/database";

export interface SambatzimDialogProps {
  open: boolean;
  sambatzim: HamalSambatzRow[];
  onClose: () => void;
  onAdd: (fullName: string) => void;
  onDelete: (id: string) => void;
}

export function SambatzimDialog({
  open,
  sambatzim,
  onClose,
  onAdd,
  onDelete,
}: SambatzimDialogProps) {
  const [name, setName] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("יש להזין שם מלא");
      return;
    }
    onAdd(trimmed);
    setName("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>ניהול סמבצים</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
            />
          </div>
          <Button type="submit">הוסף</Button>
        </form>

        <div className="max-h-72 overflow-y-auto rounded-md border">
          {sambatzim.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              אין סמבצים
            </p>
          ) : (
            <ul className="divide-y">
              {sambatzim.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <span className="text-sm">{s.full_name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="מחק"
                    onClick={() => {
                      if (
                        window.confirm(
                          `למחוק את ${s.full_name}? כל השיבוצים שלו יוסרו.`,
                        )
                      ) {
                        onDelete(s.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
