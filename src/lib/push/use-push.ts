"use client";

import { useCallback, useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/push/register-sw";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

// Client hook for Web Push subscription management.
// Returns { supported, subscribed, loading, subscribe, unsubscribe }.
export function usePushSubscription() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const ok =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!ok) {
        if (active) {
          setSupported(false);
          setLoading(false);
        }
        return;
      }
      if (active) setSupported(true);
      try {
        const reg = await registerServiceWorker();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (active) setSubscribed(!!sub);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setLoading(false);
        return;
      }
      const reg = await registerServiceWorker();
      if (!reg) {
        setLoading(false);
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
        setLoading(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(res.ok);
    } catch (e) {
      console.error("subscribe failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await registerServiceWorker();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
    } catch (e) {
      console.error("unsubscribe failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, subscribed, loading, subscribe, unsubscribe };
}
