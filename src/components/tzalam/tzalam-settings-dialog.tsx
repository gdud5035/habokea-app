"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Check } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TZALAM_COMPANIES,
  TZALAM_COMPANY_HE,
  type TzalamCompany,
} from "@/lib/constants";
import {
  createGroupAction,
  renameGroupAction,
  deleteGroupAction,
  createTypeAction,
  updateTypeAction,
  deleteTypeAction,
  createColumnAction,
  updateColumnAction,
  deleteColumnAction,
  getTzalamAdminDataAction,
  setUserCompanyAction,
} from "@/app/(app)/tzalam/actions";
import type {
  TzalamGroupRow,
  TzalamEquipmentTypeRow,
  TzalamColumnRow,
  ProfileRow,
  TzalamUserCompanyRow,
} from "@/types/database";

export interface TzalamSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  groups: TzalamGroupRow[];
  types: TzalamEquipmentTypeRow[];
  columns: TzalamColumnRow[];
  onChanged: () => void;
}

type TabKey = "columns" | "types" | "groups" | "access";
type FieldType = "text" | "number";

const NO_GROUP = "__none__";

function byPosition<T extends { position: number }>(a: T, b: T): number {
  return a.position - b.position;
}

export function TzalamSettingsDialog(props: TzalamSettingsDialogProps) {
  const { open, onClose } = props;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        dir="rtl"
        className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]"
      >
        <DialogHeader>
          <DialogTitle>הגדרות צלם</DialogTitle>
        </DialogHeader>
        {open && <SettingsBody {...props} />}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsBody({
  groups,
  types,
  columns,
  onChanged,
}: TzalamSettingsDialogProps) {
  const [tab, setTab] = useState<TabKey>("columns");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "columns", label: "עמודות" },
    { key: "types", label: "סוגי אמצעים" },
    { key: "groups", label: "קבוצות" },
    { key: "access", label: "הרשאות פלוגה" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <Button
            key={t.key}
            type="button"
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "columns" && (
        <ColumnsSection columns={columns} onChanged={onChanged} />
      )}
      {tab === "types" && (
        <TypesSection types={types} groups={groups} onChanged={onChanged} />
      )}
      {tab === "groups" && (
        <GroupsSection groups={groups} onChanged={onChanged} />
      )}
      {tab === "access" && <AccessSection />}
    </div>
  );
}

function fieldTypeHe(t: string): string {
  return t === "number" ? "מספר" : "טקסט";
}

/* ------------------------------- Columns ------------------------------- */

function ColumnsSection({
  columns,
  onChanged,
}: {
  columns: TzalamColumnRow[];
  onChanged: () => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newDefault, setNewDefault] = useState("");

  const sorted = [...columns].sort(byPosition);

  async function saveLabel(id: string, label: string, original: string) {
    const trimmed = label.trim();
    if (!trimmed || trimmed === original) return;
    const res = await updateColumnAction(id, { label: trimmed });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נשמר");
    onChanged();
  }

  async function saveDefault(id: string, value: string, original: string | null) {
    const next = value.trim();
    if (next === (original ?? "")) return;
    const res = await updateColumnAction(id, { default_value: next || null });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נשמר");
    onChanged();
  }

  async function remove(id: string) {
    if (!window.confirm("למחוק עמודה זו?")) return;
    const res = await deleteColumnAction(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נמחק");
    onChanged();
  }

  async function add() {
    const label = newLabel.trim();
    if (!label) {
      toast.error("יש להזין שם עמודה");
      return;
    }
    const res = await createColumnAction(label, newType, newDefault || null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נוסף");
    setNewLabel("");
    setNewType("text");
    setNewDefault("");
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">אין עמודות עדיין.</p>
        )}
        {sorted.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-2 rounded-lg border border-input p-2"
          >
            <div className="flex items-center gap-2">
              <InlineEdit
                value={c.label}
                onSave={(v) => saveLabel(c.id, v, c.label)}
              />
              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {fieldTypeHe(c.field_type)}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                onClick={() => remove(c.id)}
                aria-label="מחק עמודה"
              >
                <Trash2 />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">
                ברירת מחדל
              </span>
              <DefaultValueField
                key={`${c.id}-${c.default_value ?? ""}`}
                initial={c.default_value ?? ""}
                fieldType={c.field_type}
                onSave={(v) => saveDefault(c.id, v, c.default_value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-input p-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label>שם עמודה חדשה</Label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="שם"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>סוג</Label>
          <Select
            value={newType}
            onValueChange={(v) => setNewType((v as FieldType) || "text")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">טקסט</SelectItem>
              <SelectItem value="number">מספר</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>ברירת מחדל (רשות)</Label>
          <Input
            type={newType === "number" ? "number" : "text"}
            value={newDefault}
            onChange={(e) => setNewDefault(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="ללא"
          />
        </div>
        <Button type="button" onClick={add}>
          <Plus />
          הוסף עמודה
        </Button>
      </div>
    </div>
  );
}

function DefaultValueField({
  initial,
  fieldType,
  onSave,
}: {
  initial: string;
  fieldType: string;
  onSave: (value: string) => void | Promise<void>;
}) {
  const [buffer, setBuffer] = useState(initial);

  function commit() {
    if (buffer.trim() !== initial) void onSave(buffer);
  }

  return (
    <Input
      type={fieldType === "number" ? "number" : "text"}
      value={buffer}
      onChange={(e) => setBuffer(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      placeholder="ללא ברירת מחדל"
      className="h-8"
    />
  );
}

/* ------------------------------- Types --------------------------------- */

function TypesSection({
  types,
  groups,
  onChanged,
}: {
  types: TzalamEquipmentTypeRow[];
  groups: TzalamGroupRow[];
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<string>(NO_GROUP);

  const sortedTypes = [...types].sort(byPosition);
  const sortedGroups = [...groups].sort(byPosition);

  async function saveName(id: string, name: string, original: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === original) return;
    const res = await updateTypeAction(id, { name: trimmed });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נשמר");
    onChanged();
  }

  async function saveGroup(id: string, value: string) {
    const groupId = value === NO_GROUP ? null : value;
    const res = await updateTypeAction(id, { group_id: groupId });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נשמר");
    onChanged();
  }

  async function remove(id: string) {
    if (!window.confirm("למחוק אמצעי זה?")) return;
    const res = await deleteTypeAction(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נמחק");
    onChanged();
  }

  async function add() {
    const name = newName.trim();
    if (!name) {
      toast.error("יש להזין שם אמצעי");
      return;
    }
    const groupId = newGroup === NO_GROUP ? null : newGroup;
    const res = await createTypeAction(name, groupId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נוסף");
    setNewName("");
    setNewGroup(NO_GROUP);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {sortedTypes.length === 0 && (
          <p className="text-sm text-muted-foreground">אין אמצעים עדיין.</p>
        )}
        {sortedTypes.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-input p-2"
          >
            <InlineEdit
              value={t.name}
              onSave={(v) => saveName(t.id, v, t.name)}
            />
            <Select
              value={t.group_id ?? NO_GROUP}
              onValueChange={(v) => saveGroup(t.id, v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GROUP}>ללא קבוצה</SelectItem>
                {sortedGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              onClick={() => remove(t.id)}
              aria-label="מחק אמצעי"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-input p-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label>שם אמצעי חדש</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="שם"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>קבוצה</Label>
          <Select
            value={newGroup}
            onValueChange={(v) => setNewGroup(v || NO_GROUP)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_GROUP}>ללא קבוצה</SelectItem>
              {sortedGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={add}>
          <Plus />
          הוסף אמצעי
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Groups -------------------------------- */

function GroupsSection({
  groups,
  onChanged,
}: {
  groups: TzalamGroupRow[];
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");

  const sorted = [...groups].sort(byPosition);

  async function saveName(id: string, name: string, original: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === original) return;
    const res = await renameGroupAction(id, trimmed);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נשמר");
    onChanged();
  }

  async function remove(id: string) {
    if (!window.confirm("למחוק קבוצה זו?")) return;
    const res = await deleteGroupAction(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נמחק");
    onChanged();
  }

  async function add() {
    const name = newName.trim();
    if (!name) {
      toast.error("יש להזין שם קבוצה");
      return;
    }
    const res = await createGroupAction(name);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("נוסף");
    setNewName("");
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">אין קבוצות עדיין.</p>
        )}
        {sorted.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-2 rounded-lg border border-input p-2"
          >
            <InlineEdit
              value={g.name}
              onSave={(v) => saveName(g.id, v, g.name)}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              onClick={() => remove(g.id)}
              aria-label="מחק קבוצה"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-input p-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label>שם קבוצה חדשה</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="שם"
          />
        </div>
        <Button type="button" onClick={add}>
          <Plus />
          הוסף קבוצה
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Access -------------------------------- */

const ADMIN_DATA_KEY = ["tzalam_admin_data"] as const;
type AdminData = { users: ProfileRow[]; userCompanies: TzalamUserCompanyRow[] };

function AccessSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<AdminData>({
    queryKey: ADMIN_DATA_KEY,
    queryFn: async () => {
      const res = await getTzalamAdminDataAction();
      if (!res.ok) throw new Error(res.error);
      return res.data ?? { users: [], userCompanies: [] };
    },
  });

  const users = data?.users ?? [];
  const userCompanies = data?.userCompanies ?? [];

  function stateFor(userId: string, company: string): {
    view: boolean;
    edit: boolean;
  } {
    const row = userCompanies.find(
      (uc) => uc.user_id === userId && uc.company === company,
    );
    return { view: !!row?.can_view, edit: !!row?.can_edit };
  }

  async function apply(
    userId: string,
    company: TzalamCompany,
    view: boolean,
    edit: boolean,
  ) {
    // Enforce invariants: edit implies view; no view implies no edit.
    if (edit) view = true;
    if (!view) edit = false;

    // Optimistic update via the query cache.
    queryClient.setQueryData<AdminData>(ADMIN_DATA_KEY, (prev) => {
      const base = prev ?? { users: [], userCompanies: [] };
      const rest = base.userCompanies.filter(
        (uc) => !(uc.user_id === userId && uc.company === company),
      );
      const existing = base.userCompanies.find(
        (uc) => uc.user_id === userId && uc.company === company,
      );
      const nextUC =
        !view && !edit
          ? rest
          : [
              ...rest,
              {
                id: existing?.id ?? `tmp-${userId}-${company}`,
                user_id: userId,
                company,
                can_view: view,
                can_edit: edit,
                created_at: existing?.created_at ?? new Date().toISOString(),
              },
            ];
      return { ...base, userCompanies: nextUC };
    });

    const res = await setUserCompanyAction(userId, company, view, edit);
    if (!res.ok) toast.error(res.error);
    // Reconcile with server truth.
    queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY });
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">טוען...</p>;
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">אין משתמשים.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex flex-col gap-2 rounded-lg border border-input p-3"
        >
          <div className="text-sm font-medium">
            {u.full_name || u.email}
          </div>
          <div className="flex flex-col gap-1.5">
            {TZALAM_COMPANIES.map((company) => {
              const { view, edit } = stateFor(u.id, company);
              return (
                <div
                  key={company}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2 py-1"
                >
                  <span className="text-sm">
                    {TZALAM_COMPANY_HE[company]}
                  </span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={view}
                        onCheckedChange={(c: boolean) =>
                          apply(u.id, company, Boolean(c), edit)
                        }
                      />
                      צפייה
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={edit}
                        onCheckedChange={(c: boolean) =>
                          apply(u.id, company, view, Boolean(c))
                        }
                      />
                      עריכה
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- InlineEdit ------------------------------ */

function InlineEdit({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [buffer, setBuffer] = useState(value);

  function start() {
    setBuffer(value);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (buffer.trim() !== value) void onSave(buffer);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        className="group/inline flex flex-1 items-center gap-2 text-right text-sm"
      >
        <span className="flex-1 truncate">{value}</span>
        <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-60 group-hover/inline:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-1.5">
      <Input
        autoFocus
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
        aria-label="שמור"
      >
        <Check />
      </Button>
    </div>
  );
}
