/**
 * Register the hand-written service worker at /sw.js (root scope).
 * Returns the registration, or null when service workers are unavailable.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (e) {
    console.error("SW registration failed", e);
    return null;
  }
}
