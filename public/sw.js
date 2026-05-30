/* Service Worker for גדוד הבוקע 5035 PWA — Web Push only.
 * Intentionally has NO fetch handler: it must never cache app assets or HTML,
 * otherwise stale JS bundles would call server-action IDs that no longer exist
 * after a deploy ("Server Action ... was not found"). */

self.addEventListener("install", () => {
  // Activate this SW immediately, replacing any older registered version.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge any caches left behind by earlier SW versions that DID cache.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { title: "גדוד הבוקע 5035", body: event.data?.text() ?? "" };
    }
  })();

  const title = data.title || "גדוד הבוקע 5035";
  const body = data.body || "";
  const options = {
    body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    dir: "rtl",
    lang: "he",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })(),
  );
});
