import type { NextConfig } from "next";

// PWA / service worker disabled — see ServiceWorkerCleanup component.
// @ducanh2912/next-pwa was removed after it caused stale-chunk crashes
// (CacheFirst with no TTL for /_next/static/* served old JS after deploys).
const nextConfig: NextConfig = {};

export default nextConfig;
