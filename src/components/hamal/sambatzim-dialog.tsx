"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { HAMAL_COLORS } from "@/lib/constants";
import { textOn } from "@/lib/utils/week";
import type { HamalSambatzRow } from "@/types/database";

export interface SambatzimDialogProps {
  open: boolean;
  sambatzim: HamalSambatzRow[];
  onClose: () => void;
  onAdd: (fullName: string, color: string) => void;
  onDelete: (id: string) => void;
  onSetColor: (id: string, color: string) => void;
}

function Swatches({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {HAMAL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border transition-transform hover:scale-110",
            value === c && "ring-2 ring-foreground ring-offset-1",
          )}
          style={{ backgroundColor: c }}
          title={c}
        >
          {value === c && (
            <Check className="size-3.5" style={{ color: textOn(c) }} />
          )}
        </button>
      ))}
    </div>
  );
}

export function SambatzimDialog({
  open,
  sambatzim,
  onClose,
  onAdd,
  onDelete,
  onSetColor,
}: SambatzimDialogProps) {
  const [name, setName] = useState("");
  const [newColor, setNewColor] = useState<string>(HAMAL_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("יש להזין שם מלא");
      return;
    }
    onAdd(trimmed, newColor);
    setName("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>ניהול סמבצים</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex items-end gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
              className="flex-1"
            />
            <Button type="submit">הוסף</Button>
          </div>
          <Swatches value={newColor} onPick={setNewColor} />
        </form>

        <div className="max-h-72 overflow-y-auto rounded-md border">
          {sambatzim.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              אין סמבצים
            </p>
          ) : (
            <ul className="divide-y">
              {sambatzim.map((s) => (
                <li key={s.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingId((id) => (id === s.id ? null : s.id))
                        }
                        className="size-5 shrink-0 rounded-full border"
                        style={{ backgroundColor: s.color ?? "transparent" }}
                        title="שנה צבע"
                      />
                      <span className="text-sm">{s.full_name}</span>
                    </div>
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
                  </div>
                  {editingId === s.id && (
                    <div className="pt-2">
                      <Swatches
                        value={s.color}
                        onPick={(color) => {
                          onSetColor(s.id, color);
                          setEditingId(null);
                        }}
                      />
                    </div>
                  )}
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
