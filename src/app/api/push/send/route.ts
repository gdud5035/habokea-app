import { NextResponse } from "next/server";
import webpush from "web-push";
import { getCurrentProfile } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import type { PushSubscriptionRow, ProfileRow } from "@/types/database";

export const runtime = "nodejs";

type Audience =
  | { type: "all" }
  | { type: "role"; value: string }
  | { type: "user"; value: string };

interface SendBody {
  title: string;
  body: string;
  audience: Audience;
}

// Configure VAPID lazily (inside the handler) so importing this module at build
// time never depends on env vars being present.
function configureVapid(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

export async function POST(req: Request) {
  let payload: SendBody;
  try {
    payload = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
  }

  const me = await getCurrentProfile();
  if (!me?.is_admin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  if (!configureVapid()) {
    return NextResponse.json(
      { error: "מפתחות VAPID לא הוגדרו" },
      { status: 500 },
    );
  }

  const { title, body, audience } = payload;
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "כותרת ותוכן חובה" }, { status: 400 });
  }

  const admin = createAdminClient();

  let userIds: string[] | null = null;
  if (audience.type === "role") {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("role_id", audience.value);
    userIds = ((data as Pick<ProfileRow, "id">[] | null) ?? []).map(
      (r) => r.id,
    );
  } else if (audience.type === "user") {
    userIds = [audience.value];
  }

  let query = admin.from("push_subscriptions").select("*");
  if (userIds !== null) {
    query = query.in("user_id", userIds.length ? userIds : ["__none__"]);
  }
  const { data: subs } = await query;
  const subscriptions = (subs as PushSubscriptionRow[] | null) ?? [];

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify({ title, body }),
        );
        sent++;
      } catch {
        failed++;
        // Prune dead subscriptions (404/410).
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", s.endpoint);
      }
    }),
  );

  return NextResponse.json({ sent, failed });
}
