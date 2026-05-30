"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataHelpersManager } from "@/components/admin/data-helpers-manager";
import { UsersManager } from "@/components/admin/users-manager";
import { RolesManager } from "@/components/admin/roles-manager";
import { PushComposer } from "@/components/admin/push-composer";
import type {
  DataHelperItem,
  ProfileRow,
  RoleRow,
  RoleTabAccessRow,
  UserTabOverrideRow,
} from "@/types/database";

type Section = "data" | "users" | "roles" | "push";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "users", label: "משתמשים" },
  { key: "roles", label: "תפקידים והרשאות" },
  { key: "data", label: "סוגי רכב / תפקידים" },
  { key: "push", label: "שליחת התראה" },
];

export function AdminClient({
  vehicleModels,
  vehicleUsages,
  roles,
  users,
  roleAccess,
  overrides,
}: {
  vehicleModels: DataHelperItem[];
  vehicleUsages: DataHelperItem[];
  roles: RoleRow[];
  users: ProfileRow[];
  roleAccess: RoleTabAccessRow[];
  overrides: UserTabOverrideRow[];
}) {
  const [section, setSection] = useState<Section>("users");

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">ניהול</h1>
        <p className="text-sm text-muted-foreground">ניהול משתמשים, הרשאות ונתוני מערכת</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {SECTIONS.map((s) => (
          <Button
            key={s.key}
            type="button"
            variant={section === s.key ? "default" : "ghost"}
            className={cn(section === s.key && "shadow-sm")}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {section === "users" && (
        <UsersManager users={users} roles={roles} overrides={overrides} />
      )}
      {section === "roles" && <RolesManager roles={roles} access={roleAccess} />}
      {section === "data" && (
        <DataHelpersManager
          vehicleModels={vehicleModels}
          vehicleUsages={vehicleUsages}
        />
      )}
      {section === "push" && <PushComposer roles={roles} users={users} />}
    </div>
  );
}
