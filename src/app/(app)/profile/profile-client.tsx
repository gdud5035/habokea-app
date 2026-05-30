"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/lib/push/use-push";
import type { ProfileWithRole } from "@/lib/permissions";
import { updateProfileAction, changePasswordAction } from "./actions";

function roleLabel(profile: ProfileWithRole): string {
  if (profile.is_admin || profile.role_name === "admin") return "מנהל";
  return profile.role_name || "—";
}

export default function ProfileClient({
  profile,
  forceChangePassword,
}: {
  profile: ProfileWithRole;
  forceChangePassword: boolean;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const passwordSectionRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const push = usePushSubscription();

  useEffect(() => {
    if (forceChangePassword) {
      passwordSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      passwordInputRef.current?.focus();
    }
  }, [forceChangePassword]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfileAction(fullName, phone);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("הפרטים נשמרו בהצלחה");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    if (password !== confirm) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await changePasswordAction(password);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("הסיסמה הוחלפה בהצלחה");
        setPassword("");
        setConfirm("");
      }
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleTogglePush(checked: boolean) {
    try {
      if (checked) {
        await push.subscribe();
      } else {
        await push.unsubscribe();
      }
    } catch {
      toast.error("פעולת ההתראות נכשלה");
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-6 py-6">
      <h1 className="text-2xl font-bold">הפרופיל שלי</h1>

      {forceChangePassword && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-900">
          עליך להחליף סיסמה לפני שתמשיך
        </div>
      )}

      {/* Details / edit */}
      <Card>
        <CardHeader>
          <CardTitle>פרטים אישיים</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={profile.email ?? ""}
                readOnly
                disabled
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">תפקיד</Label>
              <Input id="role" value={roleLabel(profile)} readOnly disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">שם מלא</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
              />
            </div>

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "שומר..." : "שמירת שינויים"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <div ref={passwordSectionRef}>
        <Card>
          <CardHeader>
            <CardTitle>החלפת סיסמה</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">סיסמה חדשה</Label>
                <Input
                  id="newPassword"
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  dir="ltr"
                />
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "מחליף..." : "החלפת סיסמה"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Notifications opt-in */}
      <Card>
        <CardHeader>
          <CardTitle>התראות</CardTitle>
        </CardHeader>
        <CardContent>
          {push.supported ? (
            <div className="flex items-center justify-between">
              <Label htmlFor="push-toggle">קבלת התראות</Label>
              <Switch
                id="push-toggle"
                checked={push.subscribed}
                disabled={push.loading}
                onCheckedChange={handleTogglePush}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">לא נתמך בדפדפן זה</p>
          )}
        </CardContent>
      </Card>

      <Separator className="opacity-0" />
    </div>
  );
}
