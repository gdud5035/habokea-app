import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/permissions";

export const runtime = "nodejs";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

type Audience =
  | { type: "all" }
  | { type: "role"; value: string }
  | { type: "user"; value: string };

interface SendBody {
  title?: string;
  body?: string;
  url?: string;
  audience?: Audience;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await req.json()) as SendBody;
  const title = payload.title?.trim();
  const body = payload.body?.trim() ?? "";
  const audience: Audience = payload.audience ?? { type: "all" };

  if (!title) {
    return Response.json({ error: "Missing title" }, { status: 400 });
  }

  const admin = createAdminClient();

  let query = admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (audience.type === "user") {
    if (!audience.value) {
      return Response.json({ error: "Missing user id" }, { status: 400 });
    }
    query = query.eq("user_id", audience.value);
  } else if (audience.type === "role") {
    if (!audience.value) {
      return Response.json({ error: "Missing role" }, { status: 400 });
    }

    // Resolve role name -> role id (value may be a role name or a role id)
    const { data: role } = await admin
      .from("roles")
      .select("id")
      .or(`name.eq.${audience.value},id.eq.${audience.value}`)
      .maybeSingle();

    const roleId = role?.id ?? audience.value;

    const { data: targetProfiles, error: profilesError } = await admin
      .from("profiles")
      .select("id")
      .eq("role_id", roleId);

    if (profilesError) {
      console.error("Failed to resolve role profiles", profilesError);
      return Response.json({ error: "Failed to resolve audience" }, { status: 500 });
    }

    const userIds = (targetProfiles ?? []).map((p) => p.id);
    if (userIds.length === 0) {
      return Response.json({ sent: 0, failed: 0 });
    }
    query = query.in("user_id", userIds);
  }

  const { data: subscriptions, error } = await query;

  if (error) {
    console.error("Failed to fetch subscriptions", error);
    return Response.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }

  const rows = (subscriptions ?? []) as SubscriptionRow[];
  const notification = JSON.stringify({
    title,
    body,
    url: payload.url ?? "/vehicles",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl",
    lang: "he",
  });

  let sent = 0;
  let failed = 0;
  const deadEndpoints: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      const subscription: WebPushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        await webpush.sendNotification(subscription, notification);
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          deadEndpoints.push(row.endpoint);
        } else {
          console.error("Push send failed", err);
        }
      }
    })
  );

  if (deadEndpoints.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
  }

  return Response.json({ sent, failed });
}
