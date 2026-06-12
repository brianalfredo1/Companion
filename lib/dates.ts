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
