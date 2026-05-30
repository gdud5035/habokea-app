"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileRow, RoleRow } from "@/types/database";

type Audience = "all" | "role" | "user";

export function PushComposer({
  roles,
  users,
}: {
  roles: RoleRow[];
  users: ProfileRow[];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [roleValue, setRoleValue] = useState<string>("");
  const [userValue, setUserValue] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("יש למלא כותרת ותוכן");
      return;
    }
    let value: string | null = null;
    if (audience === "role") {
      if (!roleValue) {
        toast.error("יש לבחור תפקיד");
        return;
      }
      value = roleValue;
    } else if (audience === "user") {
      if (!userValue) {
        toast.error("יש לבחור משתמש");
        return;
      }
      value = userValue;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            audience: { type: audience, value },
          }),
        });

        if (!res.ok) {
          let msg = "שליחת ההתראה נכשלה";
          try {
            const err = await res.json();
            if (err?.error) msg = String(err.error);
          } catch {
            /* ignore */
          }
          toast.error(msg);
          return;
        }

        const data: { sent?: number; failed?: number } = await res.json();
        toast.success(
          `ההתראה נשלחה: ${data.sent ?? 0} הצליחו, ${data.failed ?? 0} נכשלו`
        );
        setTitle("");
        setBody("");
      } catch {
        toast.error("שגיאת רשת בעת שליחת ההתראה");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">שליחת התראה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="push-title">כותרת</Label>
          <Input
            id="push-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="push-body">תוכן</Label>
          <Textarea
            id="push-body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>קהל יעד</Label>
            <Select
              value={audience}
              onValueChange={(v) => setAudience(v as Audience)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המשתמשים</SelectItem>
                <SelectItem value="role">לפי תפקיד</SelectItem>
                <SelectItem value="user">משתמש ספציפי</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audience === "role" && (
            <div className="space-y-1.5">
              <Label>תפקיד</Label>
              <Select
                value={roleValue}
                onValueChange={(v) => setRoleValue(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {audience === "user" && (
            <div className="space-y-1.5">
              <Label>משתמש</Label>
              <Select
                value={userValue}
                onValueChange={(v) => setUserValue(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר משתמש" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name ?? u.email ?? u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button type="button" onClick={handleSend} disabled={pending}>
          {pending ? "שולח..." : "שלח התראה"}
        </Button>
      </CardContent>
    </Card>
  );
}
