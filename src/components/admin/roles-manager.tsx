"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TAB_KEYS, TAB_LABELS, ALWAYS_ALLOWED_TABS, type TabKey } from "@/lib/constants";
import type { RoleRow, RoleTabAccessRow } from "@/types/database";
import {
  createRoleAction,
  deleteRoleAction,
  setRoleTabAction,
} from "@/app/(app)/admin/actions";

type RoleAccessMap = Record<string, Record<string, boolean>>; // roleId -> tabKey -> can_access

function buildAccessMap(rows: RoleTabAccessRow[]): RoleAccessMap {
  const map: RoleAccessMap = {};
  for (const row of rows) {
    map[row.role_id] ??= {};
    map[row.role_id][row.tab_key] = row.can_access;
  }
  return map;
}

const ALWAYS = new Set<TabKey>(ALWAYS_ALLOWED_TABS);

export function RolesManager({
  roles: initialRoles,
  access: initialAccess,
}: {
  roles: RoleRow[];
  access: RoleTabAccessRow[];
}) {
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [access, setAccess] = useState<RoleAccessMap>(buildAccessMap(initialAccess));
  const [newRole, setNewRole] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    if (!newRole.trim()) {
      toast.error("יש להזין שם תפקיד");
      return;
    }
    startTransition(async () => {
      const res = await createRoleAction(newRole.trim());
      if (res.ok && res.data) {
        setRoles((r) => [...r, { id: res.data!.id, name: newRole.trim(), created_at: "" }]);
        setNewRole("");
        toast.success("התפקיד נוצר");
      } else if (!res.ok) {
        toast.error(res.error);
      }
    });
  }

  function handleDelete(role: RoleRow) {
    if (role.name === "admin") return;
    if (!confirm(`למחוק את התפקיד "${role.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteRoleAction(role.id);
      if (res.ok) {
        setRoles((r) => r.filter((x) => x.id !== role.id));
        toast.success("התפקיד נמחק");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleToggle(roleId: string, tab: TabKey, next: boolean) {
    // optimistic
    setAccess((prev) => ({
      ...prev,
      [roleId]: { ...(prev[roleId] ?? {}), [tab]: next },
    }));
    startTransition(async () => {
      const res = await setRoleTabAction(roleId, tab, next);
      if (!res.ok) {
        toast.error(res.error);
        // revert
        setAccess((prev) => ({
          ...prev,
          [roleId]: { ...(prev[roleId] ?? {}), [tab]: !next },
        }));
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">הוספת תפקיד</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="שם התפקיד"
              className="max-w-xs"
            />
            <Button type="button" onClick={handleCreate} disabled={pending}>
              הוסף תפקיד
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">מטריצת הרשאות (תפקיד ↔ טאב)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">תפקיד</TableHead>
                {TAB_KEYS.map((tab) => (
                  <TableHead key={tab} className="text-center">
                    {TAB_LABELS[tab]}
                  </TableHead>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                const isAdmin = role.name === "admin";
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    {TAB_KEYS.map((tab) => {
                      const locked = isAdmin || ALWAYS.has(tab);
                      const checked = locked
                        ? true
                        : access[role.id]?.[tab] ?? false;
                      return (
                        <TableCell key={tab} className="text-center">
                          <Switch
                            checked={checked}
                            disabled={locked || pending}
                            onCheckedChange={(v) => handleToggle(role.id, tab, v)}
                            aria-label={`${role.name} - ${TAB_LABELS[tab]}`}
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      {!isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          onClick={() => handleDelete(role)}
                          aria-label="מחק תפקיד"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            תפקיד &quot;admin&quot; מקבל גישה לכל הטאבים אוטומטית. טאב &quot;פרופיל&quot; פתוח תמיד.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
