/**
 * Local-timezone date key (YYYY-MM-DD). Never use toISOString() for "today" —
 * it returns UTC, which lags local midnight by hours in UTC+ timezones.
 */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Date key in the couple room's shared timezone. Both partners must agree on
 * what "today" is (for habits and the daily question) even when they're in
 * different timezones, so the room carries one canonical clock.
 */
export function roomDateKey(
  timezone: string | null | undefined,
  d: Date = new Date()
): string {
  if (!timezone) return localDateKey(d);
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
  } catch {
    return localDateKey(d);
  }
}
