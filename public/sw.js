// La Penúltima — PWA kill-switch service worker
//
// The previous Workbox-based worker (CacheFirst, no TTL for /_next/static/*)
// caused hard crashes after deploys: stale JS chunks broke the React tree and
// the error-boundary reset button could not recover the app.
//
// This file replaces it permanently.  On install it skips waiting so it takes
// over any open tabs immediately; on activate it clears every Cache Storage
// bucket and claims all clients so future requests go to the network.
//
// This worker does NOT cache or intercept any network requests.
// The ServiceWorkerCleanup component (see src/components/pwa/) unregisters
// this worker on the next page visit, leaving the origin with no SW at all.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  await self.clients.claim();
});
