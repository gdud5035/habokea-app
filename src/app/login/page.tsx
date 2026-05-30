"use client";

import { useActionState } from "react";
import Image from "next/image";
import { signInAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/logo-256.png"
            alt="גדוד הבוקע 5035"
            width={88}
            height={88}
            className="rounded-2xl shadow"
            priority
          />
          <h1 className="text-xl font-bold">גדוד הבוקע 5035</h1>
          <p className="text-sm text-muted-foreground">התחברות למערכת</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identifier">אימייל או טלפון</Label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              dir="ltr"
              className="text-right"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              className="text-right"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={pending} className="mt-2 w-full">
            {pending ? "מתחבר..." : "התחבר"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
