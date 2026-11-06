/* Derived views over the Productivity Center data — ports of the v3 dashboard's
   date/week/month helpers. Everything is anchored to the dataset's own "today"
   (ProductivityData.today: the request time when live, PIPELINE_TODAY for the snapshot)
   and computed on plain YYYY-MM-DD keys in Eastern time, so server and client render
   identical output (no `new Date()` at render time).

   Pure helpers are exported directly; helpers that read the dataset come from
   createProductivityLogic(data), which components get through useProductivity(). */
import type { Meeting, PlanningTask, ProductivityData } from "./productivity-types";

export const TZ = "America/New_York";

/* ---------------- date keys ---------------- */

const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD of an instant, in Eastern time (Meetings Master stores UTC). */
export function dateKeyET(iso: string): string {
  return keyFmt.format(new Date(iso));
}

const keyDate = (key: string) => new Date(key + "T12:00:00Z");

export function addDays(key: string, n: number): string {
  const d = keyDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (key: string) => keyDate(key).getUTCDay();

/** Format a date key (calendar day, no time-zone shift). */
export const fmtKey = (key: string, opts: Intl.DateTimeFormatOptions) =>
  keyDate(key).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/** Monday of the Mon–Fri work week a day belongs to (Sat/Sun belong to the week just ended). */
export function mondayOf(key: string): string {
  const day = weekdayOf(key);
  return addDays(key, day === 0 ? -6 : 1 - day);
}

/** ISO-8601 week number of a date key. */
export function isoWeekOfKey(key: string): number {
  const d = keyDate(key);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** Monday of ISO week `n`, in the year that puts it nearest to `nearKey` (week selects carry no year). */
export function mondayOfIsoWeek(n: number, nearKey: string): string {
  const y = Number(nearKey.slice(0, 4));
  // ISO week 1 is the week containing Jan 4.
  const candidates = [y - 1, y, y + 1].map((yr) => addDays(mondayOf(`${yr}-01-04`), (n - 1) * 7));
  const dist = (k: string) => Math.abs(keyDate(k).getTime() - keyDate(nearKey).getTime());
  return candidates.sort((a, b) => dist(a) - dist(b))[0];
}

/** "Nov 2–6, 2026" / "Dec 28, 2026 – Jan 1, 2027" for a Mon–Fri week. */
export function weekRangeText(monday: string): string {
  const fri = addDays(monday, 4);
  if (monday.slice(0, 4) !== fri.slice(0, 4))
    return `${fmtKey(monday, { month: "short", day: "numeric", year: "numeric" })} – ${fmtKey(fri, { month: "short", day: "numeric", year: "numeric" })}`;
  const sameMonth = monday.slice(0, 7) === fri.slice(0, 7);
  return `${fmtKey(monday, { month: "short", day: "numeric" })}–${fmtKey(fri, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" })}, ${monday.slice(0, 4)}`;
}

/* ---------------- meeting / task formatters ---------------- */

export const fmtFullDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: TZ }) : "—";
export const fmtFullDateWithWeekday = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: TZ })
    : "—";
export const fmtFullTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ }) + " ET" : "—";

/* ---------------- calendar ---------------- */

export const monthKeyOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;
export const monthLabel = (year: number, month: number) => fmtKey(`${monthKeyOf(year, month)}-01`, { month: "long", year: "numeric" });

/** Sunday-first month grid: leading nulls, then one date key per day. */
export function buildCalendarCells(year: number, month: number): (string | null)[] {
  const first = `${monthKeyOf(year, month)}-01`;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [...Array<null>(weekdayOf(first)).fill(null), ...Array.from({ length: days }, (_, i) => addDays(first, i))];
}

/** One group per department (a meeting with several appears in each); none linked → "Unassigned", listed last. */
export function groupReviewMeetingsByDept(meetings: Meeting[]): { dept: string; meetings: Meeting[] }[] {
  const groups: Record<string, Meeting[]> = {};
  meetings.forEach((m) => (m.depts.length ? m.depts : ["Unassigned"]).forEach((d) => (groups[d] ??= []).push(m)));
  return Object.keys(groups)
    .sort((a, b) => (a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)))
    .map((dept) => ({ dept, meetings: groups[dept] }));
}

/** Parses the inconsistent "Meeting Location / Link" field. Never fabricates a link. */
export function parseLocationLink(raw: string | null | undefined): { joinUrl: string | null; text: string | null } {
  if (!raw || !raw.trim()) return { joinUrl: null, text: null };
  const s = raw.trim();
  const compound = s.match(/^Location:\s*(.*?)\s*\|\s*Video:\s*(.*)$/i);
  const locPart = compound ? compound[1].trim() : null;
  const videoPart = compound ? compound[2].trim() : null;
  const urlLike = (v: string | null) => !!v && /^(https?:\/\/|[a-z0-9.-]+\.[a-z]{2,}\/)/i.test(v);
  const toHref = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
  if (videoPart && urlLike(videoPart)) return { joinUrl: toHref(videoPart), text: locPart || videoPart };
  if (locPart && urlLike(locPart)) return { joinUrl: toHref(locPart), text: locPart };
  if (compound) return { joinUrl: null, text: [locPart, videoPart].filter(Boolean).join(" · ") || null };
  if (urlLike(s)) return { joinUrl: toHref(s), text: s };
  return { joinUrl: null, text: s };
}

/* ---------------- Tasks Planning lookup ---------------- */

/** Labels can differ from Airtable by a "[Suggested]: " prefix or a trailing period. */
export const normalizeTaskLabel = (s: string) =>
  s.replace(/^\[Suggested\]:\s*/i, "").replace(/\.+$/, "").trim().toLowerCase();

/* ---------------- dataset-bound helpers ---------------- */

export type ProductivityLogic = ReturnType<typeof createProductivityLogic>;

export function createProductivityLogic(data: Pick<ProductivityData, "today" | "meetings" | "tasks" | "members">) {
  const { meetings: MEETINGS, tasks: TASKS, members: MEMBERS } = data;
  const TODAY_KEY = dateKeyET(data.today);

  const MEETING_DAY = new Map(MEETINGS.map((m) => [m.id, dateKeyET(m.dt)]));
  const meetingDay = (m: Meeting) => MEETING_DAY.get(m.id) ?? dateKeyET(m.dt);
  const byTime = (a: Meeting, b: Meeting) => a.dt.localeCompare(b.dt);
  const meetingIndex = new Map(MEETINGS.map((m) => [m.id, m]));
  const taskIndex = new Map(TASKS.map((t) => [t.id, t]));

  const meetingById = (id: string) => meetingIndex.get(id);
  const taskById = (id: string) => taskIndex.get(id);

  function pipelineMonth(offset: number): { year: number; month: number } {
    const [y, m] = TODAY_KEY.split("-").map(Number);
    const idx = y * 12 + (m - 1) + offset;
    return { year: Math.floor(idx / 12), month: idx % 12 };
  }

  function meetingsInMonth(year: number, month: number): Meeting[] {
    const mk = monthKeyOf(year, month);
    return MEETINGS.filter((m) => meetingDay(m).startsWith(mk)).sort(byTime);
  }

  function meetingsOnDay(key: string): Meeting[] {
    return MEETINGS.filter((m) => meetingDay(m) === key).sort(byTime);
  }

  function meetingsByDay(list: Meeting[]): Record<string, Meeting[]> {
    const map: Record<string, Meeting[]> = {};
    list.forEach((m) => (map[meetingDay(m)] ??= []).push(m));
    return map;
  }

  /** Meetings in the Sunday–Saturday week containing "today". */
  function meetingsThisWeek(): Meeting[] {
    const start = addDays(TODAY_KEY, -weekdayOf(TODAY_KEY));
    const end = addDays(start, 7);
    return MEETINGS.filter((m) => meetingDay(m) >= start && meetingDay(m) < end).sort(byTime);
  }

  /** Meetings in the Sunday–Saturday week around a Monday (a schedule's week). */
  function meetingsInWeekOf(monday: string): Meeting[] {
    const start = addDays(monday, -1);
    const end = addDays(start, 7);
    return MEETINGS.filter((m) => meetingDay(m) >= start && meetingDay(m) < end).sort(byTime);
  }

  /* Team Capacity weeks (Mon–Fri, relative to today). */
  function capWeekDayKeys(offset: number): string[] {
    const monday = addDays(mondayOf(TODAY_KEY), offset * 7);
    return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  }
  const capWeekLabels = (offset: number) => capWeekDayKeys(offset).map((k) => fmtKey(k, { weekday: "short" }));
  const capWeekSublabels = (offset: number) => capWeekDayKeys(offset).map((k) => fmtKey(k, { month: "short", day: "numeric" }));
  function capWeekRangeLabel(offset: number): string {
    const keys = capWeekDayKeys(offset);
    const first = keys[0];
    const last = keys[4];
    const opts: Intl.DateTimeFormatOptions =
      first.slice(0, 4) !== last.slice(0, 4) ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" };
    return `${fmtKey(first, opts)} – ${fmtKey(last, opts)}`;
  }

  /** Tasks Planning records due Mon–Fri of the week, counted per assignee. */
  function tasksByMemberInWeek(offset: number): Record<string, number> {
    const keys = new Set(capWeekDayKeys(offset));
    const counts: Record<string, number> = {};
    TASKS.forEach((t) => {
      if (!t.due || !keys.has(t.due)) return;
      t.assignees.forEach((id) => (counts[id] = (counts[id] ?? 0) + 1));
    });
    return counts;
  }

  /** Per active member, per weekday: tasks due + meetings attended/facilitated. Plain counts. */
  function dailyLoadInWeek(offset: number): Record<string, number[]> {
    const keys = capWeekDayKeys(offset);
    const loads: Record<string, number[]> = Object.fromEntries(MEMBERS.map((m) => [m.id, [0, 0, 0, 0, 0]]));
    TASKS.forEach((t) => {
      const i = keys.indexOf(t.due);
      if (i === -1) return;
      t.assignees.forEach((id) => loads[id] && loads[id][i]++);
    });
    MEETINGS.forEach((mt) => {
      const i = keys.indexOf(meetingDay(mt));
      if (i === -1) return;
      const names = new Set(mt.attendees);
      if (mt.facilitator) names.add(mt.facilitator);
      MEMBERS.forEach((m) => names.has(m.name) && loads[m.id][i]++);
    });
    return loads;
  }

  function findTaskPlanningByLabel(label: string): PlanningTask | null {
    const target = normalizeTaskLabel(label);
    if (!target) return null;
    return TASKS.find((t) => normalizeTaskLabel(t.task) === target) ?? null;
  }

  return {
    TODAY_KEY,
    meetingDay,
    meetingById,
    taskById,
    pipelineMonth,
    meetingsInMonth,
    meetingsOnDay,
    meetingsByDay,
    meetingsThisWeek,
    meetingsInWeekOf,
    capWeekDayKeys,
    capWeekLabels,
    capWeekSublabels,
    capWeekRangeLabel,
    tasksByMemberInWeek,
    dailyLoadInWeek,
    findTaskPlanningByLabel,
  };
}
