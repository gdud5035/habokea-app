"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TAB_KEYS, TAB_LABELS, ALWAYS_ALLOWED_TABS, type TabKey } from "@/lib/constants";
import type { ProfileRow, RoleRow, UserTabOverrideRow } from "@/types/database";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
  setUserRoleAction,
  setUserOverrideAction,
} from "@/app/(app)/admin/actions";
import { Pencil, Trash2 } from "lucide-react";

const NO_ROLE = "__none__";
const ALWAYS = new Set<TabKey>(ALWAYS_ALLOWED_TABS);

// Display label for a role name (the admin role is stored as "admin" in code).
function roleLabel(name: string): string {
  return name === "admin" ? "אדמין" : name;
}

type OverrideState = "default" | "allow" | "deny";
// userId -> tabKey -> "allow" | "deny" (absence = default)
type OverrideMap = Record<string, Record<string, "allow" | "deny">>;

function buildOverrideMap(rows: UserTabOverrideRow[]): OverrideMap {
  const map: OverrideMap = {};
  for (const row of rows) {
    if (row.can_access === null) continue;
    map[row.user_id] ??= {};
    map[row.user_id][row.tab_key] = row.can_access ? "allow" : "deny";
  }
  return map;
}

export function UsersManager({
  users: initialUsers,
  roles,
  overrides: initialOverrides,
}: {
  users: ProfileRow[];
  roles: RoleRow[];
  overrides: UserTabOverrideRow[];
}) {
  const [users, setUsers] = useState<ProfileRow[]>(initialUsers);
  const [overrides, setOverrides] = useState<OverrideMap>(
    buildOverrideMap(initialOverrides)
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const roleName = useMemo(() => {
    const m: Record<string, string> = {};
    roles.forEach((r) => (m[r.id] = r.name));
    return m;
  }, [roles]);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  // Default new users to the standard "משתמש" role (fall back to first non-admin
  // role, then to no role) instead of starting with no role selected.
  const defaultRoleId = useMemo(() => {
    const standard = roles.find((r) => r.name === "משתמש");
    if (standard) return standard.id;
    const nonAdmin = roles.find((r) => r.name !== "admin");
    return nonAdmin?.id ?? NO_ROLE;
  }, [roles]);

  // --- create user dialog ---
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role_id: defaultRoleId,
  });

  function handleCreate() {
    startTransition(async () => {
      const res = await createUserAction({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role_id: form.role_id === NO_ROLE ? null : form.role_id,
      });
      if (res.ok && res.data) {
        setUsers((u) => [
          ...u,
          {
            id: res.data!.id,
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            role_id: form.role_id === NO_ROLE ? null : form.role_id,
            must_change_password: false,
            created_at: "",
          },
        ]);
        toast.success("המשתמש נוצר. הסיסמה הראשונית היא מספר הטלפון.");
        setForm({ full_name: "", email: "", phone: "", role_id: defaultRoleId });
        setOpen(false);
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  function handleRoleChange(userId: string, value: string | null) {
    const roleId = !value || value === NO_ROLE ? null : value;
    setUsers((u) =>
      u.map((x) => (x.id === userId ? { ...x, role_id: roleId } : x))
    );
    startTransition(async () => {
      const res = await setUserRoleAction(userId, roleId);
      if (res.ok) toast.success("התפקיד עודכן");
      else toast.error(res.error);
    });
  }

  // --- edit user dialog ---
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  function openEdit(u: ProfileRow) {
    setEditForm({
      full_name: u.full_name ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
    });
    setEditUserId(u.id);
  }

  function handleUpdate() {
    if (!editUserId) return;
    const id = editUserId;
    startTransition(async () => {
      const res = await updateUserAction(id, editForm);
      if (res.ok) {
        setUsers((u) =>
          u.map((x) =>
            x.id === id
              ? {
                  ...x,
                  full_name: editForm.full_name.trim(),
                  email: editForm.email.trim().toLowerCase(),
                  phone: editForm.phone.trim(),
                }
              : x
          )
        );
        toast.success("הפרטים עודכנו");
        setEditUserId(null);
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete(u: ProfileRow) {
    const name = u.full_name || u.email || "המשתמש";
    if (!window.confirm(`למחוק את ${name}? פעולה זו אינה הפיכה.`)) return;
    startTransition(async () => {
      const res = await deleteUserAction(u.id);
      if (res.ok) {
        setUsers((list) => list.filter((x) => x.id !== u.id));
        if (selectedUserId === u.id) setSelectedUserId(null);
        toast.success("המשתמש נמחק");
      } else {
        toast.error(res.error);
      }
    });
  }

  function currentOverride(userId: string, tab: TabKey): OverrideState {
    return overrides[userId]?.[tab] ?? "default";
  }

  function handleOverrideChange(userId: string, tab: TabKey, value: OverrideState) {
    setOverrides((prev) => {
      const next = { ...prev, [userId]: { ...(prev[userId] ?? {}) } };
      if (value === "default") delete next[userId][tab];
      else next[userId][tab] = value;
      return next;
    });
    startTransition(async () => {
      const res = await setUserOverrideAction(userId, tab, value);
      if (res.ok) toast.success("ההרשאה עודכנה");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-lg">משתמשים</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button type="button">משתמש חדש</Button>} />
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>יצירת משתמש חדש</DialogTitle>
                <DialogDescription>
                  הסיסמה הראשונית של המשתמש תהיה מספר הטלפון שיוזן.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cu-name">שם מלא</Label>
                  <Input
                    id="cu-name"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cu-email">אימייל</Label>
                  <Input
                    id="cu-email"
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cu-phone">טלפון</Label>
                  <Input
                    id="cu-phone"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>תפקיד</Label>
                  <Select
                    value={form.role_id}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, role_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תפקיד" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {roleLabel(r.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleCreate} disabled={pending}>
                  {pending ? "יוצר..." : "צור משתמש"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם מלא</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                <TableHead className="text-right">הרשאות</TableHead>
                <TableHead className="text-right">עריכה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    אין משתמשים
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {u.email ?? "—"}
                  </TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {u.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role_id ?? NO_ROLE}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="בחר תפקיד" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {roleLabel(r.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant={selectedUserId === u.id ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setSelectedUserId((id) => (id === u.id ? null : u.id))
                      }
                    >
                      {selectedUserId === u.id ? "סגור" : "ערוך הרשאות"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => openEdit(u)}
                        aria-label="ערוך פרטים"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(u)}
                        disabled={pending}
                        aria-label="מחק משתמש"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={editUserId !== null}
        onOpenChange={(o) => !o && setEditUserId(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי משתמש</DialogTitle>
            <DialogDescription>
              עדכון השם, האימייל או מספר הטלפון של המשתמש.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="eu-name">שם מלא</Label>
              <Input
                id="eu-name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-email">אימייל</Label>
              <Input
                id="eu-email"
                type="email"
                dir="ltr"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-phone">טלפון</Label>
              <Input
                id="eu-phone"
                dir="ltr"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleUpdate} disabled={pending}>
              {pending ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              הרשאות אישיות — {selectedUser.full_name ?? selectedUser.email}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              ברירת מחדל = לפי התפקיד. ניתן לאלץ הרשאה (אפשר) או לחסום (חסום) לכל טאב.
            </p>
            <div className="space-y-3">
              {TAB_KEYS.map((tab) => {
                const locked = ALWAYS.has(tab);
                const value: OverrideState = locked
                  ? "allow"
                  : currentOverride(selectedUser.id, tab);
                return (
                  <div
                    key={tab}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <span className="font-medium">{TAB_LABELS[tab]}</span>
                    {locked ? (
                      <span className="text-sm text-muted-foreground">פתוח תמיד</span>
                    ) : (
                      <Select
                        value={value}
                        onValueChange={(v) =>
                          handleOverrideChange(
                            selectedUser.id,
                            tab,
                            v as OverrideState
                          )
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">ברירת מחדל</SelectItem>
                          <SelectItem value="allow">אפשר</SelectItem>
                          <SelectItem value="deny">חסום</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
