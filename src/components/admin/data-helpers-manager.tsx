"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { DataHelperItem } from "@/types/database";
import {
  addDataHelperItemAction,
  removeDataHelperItemAction,
} from "@/app/(app)/admin/actions";

type ListProps = {
  title: string;
  helperName: string;
  initialItems: DataHelperItem[];
};

function HelperList({ title, helperName, initialItems }: ListProps) {
  const [items, setItems] = useState<DataHelperItem[]>(initialItems);
  const [value, setValue] = useState("");
  const [translation, setTranslation] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!value.trim() || !translation.trim()) {
      toast.error("יש למלא ערך באנגלית ותרגום בעברית");
      return;
    }
    startTransition(async () => {
      const res = await addDataHelperItemAction(helperName, {
        value: value.trim(),
        translation_he: translation.trim(),
      });
      if (res.ok && res.data) {
        setItems(res.data.items);
        setValue("");
        setTranslation("");
        toast.success("הפריט נוסף בהצלחה");
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  function handleRemove(val: string) {
    startTransition(async () => {
      const res = await removeDataHelperItemAction(helperName, val);
      if (res.ok && res.data) {
        setItems(res.data.items);
        toast.success("הפריט הוסר");
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">אין פריטים עדיין</p>
          )}
          {items.map((it) => (
            <Badge
              key={it.value}
              variant="secondary"
              className="gap-1.5 py-1 ps-2.5 pe-1 text-sm"
            >
              <span dir="rtl">
                {it.value} / {it.translation_he}
              </span>
              <button
                type="button"
                aria-label="מחק פריט"
                disabled={pending}
                onClick={() => handleRemove(it.value)}
                className="rounded-full p-0.5 hover:bg-foreground/10 disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`${helperName}-value`}>ערך (אנגלית)</Label>
            <Input
              id={`${helperName}-value`}
              dir="ltr"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. zeev"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${helperName}-translation`}>תרגום (עברית)</Label>
            <Input
              id={`${helperName}-translation`}
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="למשל זאב"
            />
          </div>
          <Button type="button" onClick={handleAdd} disabled={pending}>
            {pending ? "שומר..." : "הוסף"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DataHelpersManager({
  vehicleModels,
  vehicleUsages,
}: {
  vehicleModels: DataHelperItem[];
  vehicleUsages: DataHelperItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <HelperList
        title="סוגי רכב"
        helperName="vehicle_models"
        initialItems={vehicleModels}
      />
      <HelperList
        title="תפקידים"
        helperName="vehicle_usages"
        initialItems={vehicleUsages}
      />
    </div>
  );
}
