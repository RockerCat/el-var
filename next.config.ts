import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // next-pwa injects a webpack() config (used only for the production
  // `next build --webpack` run). Next 16 defaults `next dev` to Turbopack
  // and refuses to start when it sees a webpack config with no matching
  // turbopack config — this acknowledges that on purpose so `next dev`
  // keeps working unchanged. The PWA plugin is disabled in development
  // anyway, so no webpack-only behavior actually runs here.
  turbopack: {},
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    // App shell + static assets only — API responses and data are never cached.
    runtimeCaching: [
      {
        urlPattern: /^\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: { cacheName: "static-assets" },
      },
      {
        urlPattern: /\/icons\/.*\.(?:png|svg|ico)$/i,
        handler: "CacheFirst",
        options: { cacheName: "icons" },
      },
      {
        urlPattern: /\.(?:woff2?|ttf|otf)$/i,
        handler: "CacheFirst",
        options: { cacheName: "fonts" },
      },
    ],
  },
});

export default withPWA(nextConfig);
