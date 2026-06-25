const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;

/**
 * Canonical app base URL for building user-facing links (e.g. admin-issued
 * password recovery links). Reuses NEXT_PUBLIC_SITE_URL (already set in
 * Vercel for metadataBase in layout.tsx) instead of introducing a second
 * variable for the same value — but reads it raw, without that file's
 * VERCEL_URL/localhost fallback chain, since a fallback URL is fine for
 * OG metadata but not for a password-reset link.
 *
 * NODE_ENV !== "development" covers any built deployment (preview or
 * production) — Next.js always builds with NODE_ENV=production, so this
 * fails closed rather than trusting a Vercel-specific env var.
 */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const isLocalBuild = process.env.NODE_ENV === "development";

  if (!raw) {
    throw new Error(
      isLocalBuild
        ? "NEXT_PUBLIC_SITE_URL no está configurada. Defínela en tu .env.local (ej. http://localhost:3000)."
        : "NEXT_PUBLIC_SITE_URL no está configurada. No se puede generar el enlace."
    );
  }

  if (!isLocalBuild && LOCALHOST_PATTERN.test(raw)) {
    throw new Error("NEXT_PUBLIC_SITE_URL apunta a localhost — no se puede generar el enlace fuera de desarrollo local.");
  }

  return raw.replace(/\/+$/, "");
}
