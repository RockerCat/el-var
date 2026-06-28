"use client";

import { useEffect } from "react";

/**
 * One-time PWA cleanup — safe to remove after 2026-08-01 once all active
 * sessions have visited at least once and cleared their old service worker.
 *
 * Why this exists: the previous Workbox-based service worker used CacheFirst
 * (no TTL) for /_next/static/*. After each deploy, installed PWA users were
 * served stale JS chunks that no longer matched the server, which crashed the
 * React tree and locked the error boundary (reset could not help because the
 * same stale chunks were re-executed).
 *
 * What this does on every page load:
 *   1. Finds all service worker registrations for this origin.
 *   2. Clears every Cache Storage bucket (static-assets, icons, fonts, etc.).
 *   3. Unregisters every service worker.
 *   4. Reloads once — only if a SW was actually removed — so the browser
 *      fetches fresh assets from the network instead of anything the SW had
 *      cached or was intercepting.
 *
 * Loop-safe: after the first successful cleanup visit, both
 * `getRegistrations()` and `caches.keys()` return empty arrays and the
 * effect exits immediately without scheduling a reload.
 */
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const cacheKeys = "caches" in window ? await caches.keys() : [];

        // Nothing to clean up — most visits after initial migration.
        if (registrations.length === 0 && cacheKeys.length === 0) return;

        // Clear caches first so the SW can no longer serve stale responses.
        await Promise.all(cacheKeys.map((k) => caches.delete(k)));

        // Unregister every SW (handles both the old Workbox worker and the
        // transitional kill-switch at /sw.js).
        const unregisterResults = await Promise.all(
          registrations.map((r) => r.unregister()),
        );

        // Reload only if at least one SW was actively removed.  This ensures
        // the browser fetches fresh JS chunks from the network on the next
        // load rather than anything the SW was intercepting.
        if (unregisterResults.some(Boolean)) {
          window.location.reload();
        }
      } catch {
        // SW / Cache API failures are non-fatal — the page continues normally.
      }
    })();
  }, []);

  return null;
}
