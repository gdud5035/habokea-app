import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: Request) {
  const sub = (await req.json()) as SubscribeBody;

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Failed to save push subscription", error);
    return Response.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = (await req.json()) as { endpoint?: string };

  if (!endpoint) {
    return Response.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("Failed to delete push subscription", error);
    return Response.json({ error: "Failed to delete subscription" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
