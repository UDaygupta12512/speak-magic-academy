// Timezone-aware date helpers — use the user's local calendar day, not UTC.
// Fixes streak/reward rollover for users outside UTC.

export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetweenLocal(fromISODate: string, toDate: Date = new Date()): number {
  // Parse YYYY-MM-DD as a LOCAL date (avoid UTC shift from `new Date("YYYY-MM-DD")`)
  const [y, m, d] = fromISODate.split("-").map(Number);
  const from = new Date(y, (m ?? 1) - 1, d ?? 1);
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function tomorrowLocal(): Date {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(0, 0, 0, 0);
  return t;
}

export function msUntilLocalMidnight(): number {
  return tomorrowLocal().getTime() - Date.now();
}

export function formatFriendlyDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
