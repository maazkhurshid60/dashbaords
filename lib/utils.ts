const DAY = 24 * 60 * 60 * 1000;

/** "Sep 21" from an ISO date or datetime. */
export function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length > 10 ? iso : iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Meeting Date & Time (stored UTC in Airtable) shown in Eastern time. */
export function fmtDT(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (iso.length <= 10) return fmt(iso);
  return (
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }) + " ET"
  );
}

/** ISO 8601 week number — matches Airtable's "Week Number #" field. */
export function isoWeek(dateStr: string): number {
  const d = new Date(dateStr.slice(0, 10) + "T00:00:00");
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / DAY + 1) / 7);
}

export function weekRangeFor(dates: string[]): number[] {
  if (!dates.length) return [];
  const weeks = dates.map(isoWeek);
  const out: number[] = [];
  for (let w = Math.min(...weeks); w <= Math.max(...weeks); w++) out.push(w);
  return out;
}

export function pctElapsed(start: string, end: string, now = Date.now()): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

export function monthKeyFor(dateStr: string | undefined): string {
  if (!dateStr) return "undated";
  if (dateStr.length > 10) {
    const parts = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      timeZone: "America/New_York",
    }).formatToParts(new Date(dateStr));
    return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
  }
  return dateStr.slice(0, 7);
}

export function monthLabelFor(key: string): string {
  if (key === "undated") return "No date";
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
