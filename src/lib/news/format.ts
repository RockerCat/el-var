const TZ = "America/Bogota";

/** Formats a news `created_at` UTC timestamp in Colombia local time. */
export function formatNewsDate(
  iso: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    ...options,
    timeZone: TZ,
  });
}
