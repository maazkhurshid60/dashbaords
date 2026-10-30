/* Derived views over the Productivity Center snapshot — ports of the v3 dashboard's
   date/week/month helpers. Everything is anchored to the dataset's own "today"
   (PIPELINE_TODAY) and computed on plain YYYY-MM-DD keys in Eastern time, so server
   and client render identical output (no `new Date()` at render time). */
import { ACTIVE_MEMBERS } from "./productivity-data";
import { MEETINGS_MASTER, PIPELINE_TODAY } from "./productivity-meetings";
import { TASKS_PLANNING } from "./productivity-tasks";
import type { Meeting, PlanningTask } from "./productivity-types";

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

export const TODAY_KEY = dateKeyET(PIPELINE_TODAY);

/* ---------------- meeting / task formatters ---------------- */

export const fmtFullDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: TZ }) : "—";
export const fmtFullDateWithWeekday = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: TZ })
    : "—";
export const fmtFullTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ }) + " ET" : "—";

/* ---------------- meetings ---------------- */

const MEETING_DAY = new Map(MEETINGS_MASTER.map((m) => [m.id, dateKeyET(m.dt)]));
export const meetingDay = (m: Meeting) => MEETING_DAY.get(m.id)!;
const byTime = (a: Meeting, b: Meeting) => a.dt.localeCompare(b.dt);

export const meetingById = (id: string) => MEETINGS_MASTER.find((m) => m.id === id);

export function pipelineMonth(offset: number): { year: number; month: number } {
  const [y, m] = TODAY_KEY.split("-").map(Number);
  const idx = y * 12 + (m - 1) + offset;
  return { year: Math.floor(idx / 12), month: idx % 12 };
}

export const monthKeyOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;
export const monthLabel = (year: number, month: number) => fmtKey(`${monthKeyOf(year, month)}-01`, { month: "long", year: "numeric" });

export function meetingsInMonth(year: number, month: number): Meeting[] {
  const mk = monthKeyOf(year, month);
  return MEETINGS_MASTER.filter((m) => meetingDay(m).startsWith(mk)).sort(byTime);
}

export function meetingsOnDay(key: string): Meeting[] {
  return MEETINGS_MASTER.filter((m) => meetingDay(m) === key).sort(byTime);
}

export function meetingsByDay(meetings: Meeting[]): Record<string, Meeting[]> {
  const map: Record<string, Meeting[]> = {};
  meetings.forEach((m) => (map[meetingDay(m)] ??= []).push(m));
  return map;
}

/** Sunday-first month grid: leading nulls, then one date key per day. */
export function buildCalendarCells(year: number, month: number): (string | null)[] {
  const first = `${monthKeyOf(year, month)}-01`;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [...Array<null>(weekdayOf(first)).fill(null), ...Array.from({ length: days }, (_, i) => addDays(first, i))];
}

/** Meetings in the Sunday–Saturday week containing PIPELINE_TODAY. */
export function meetingsThisWeek(): Meeting[] {
  const start = addDays(TODAY_KEY, -weekdayOf(TODAY_KEY));
  const end = addDays(start, 7);
  return MEETINGS_MASTER.filter((m) => meetingDay(m) >= start && meetingDay(m) < end).sort(byTime);
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

/* ---------------- Team Capacity weeks (Mon–Fri, relative to PIPELINE_TODAY) ---------------- */

export function capWeekDayKeys(offset: number): string[] {
  const day = weekdayOf(TODAY_KEY);
  const monday = addDays(TODAY_KEY, (day === 0 ? -6 : 1 - day) + offset * 7);
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
}
export const capWeekLabels = (offset: number) => capWeekDayKeys(offset).map((k) => fmtKey(k, { weekday: "short" }));
export const capWeekSublabels = (offset: number) => capWeekDayKeys(offset).map((k) => fmtKey(k, { month: "short", day: "numeric" }));
export function capWeekRangeLabel(offset: number): string {
  const keys = capWeekDayKeys(offset);
  const first = keys[0];
  const last = keys[4];
  const opts: Intl.DateTimeFormatOptions =
    first.slice(0, 4) !== last.slice(0, 4) ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" };
  return `${fmtKey(first, opts)} – ${fmtKey(last, opts)}`;
}

/** Tasks Planning records due Mon–Fri of the week, counted per assignee. */
export function tasksByMemberInWeek(offset: number): Record<string, number> {
  const keys = new Set(capWeekDayKeys(offset));
  const counts: Record<string, number> = {};
  TASKS_PLANNING.forEach((t) => {
    if (!t.due || !keys.has(t.due)) return;
    t.assignees.forEach((id) => (counts[id] = (counts[id] ?? 0) + 1));
  });
  return counts;
}

/** Per active member, per weekday: tasks due + meetings attended/facilitated. Plain counts. */
export function dailyLoadInWeek(offset: number): Record<string, number[]> {
  const keys = capWeekDayKeys(offset);
  const loads: Record<string, number[]> = Object.fromEntries(ACTIVE_MEMBERS.map((m) => [m.id, [0, 0, 0, 0, 0]]));
  TASKS_PLANNING.forEach((t) => {
    const i = keys.indexOf(t.due);
    if (i === -1) return;
    t.assignees.forEach((id) => loads[id] && loads[id][i]++);
  });
  MEETINGS_MASTER.forEach((mt) => {
    const i = keys.indexOf(meetingDay(mt));
    if (i === -1) return;
    const names = new Set(mt.attendees);
    if (mt.facilitator) names.add(mt.facilitator);
    ACTIVE_MEMBERS.forEach((m) => names.has(m.name) && loads[m.id][i]++);
  });
  return loads;
}

/* ---------------- Tasks Planning lookup ---------------- */

/** Labels can differ from Airtable by a "[Suggested]: " prefix or a trailing period. */
export const normalizeTaskLabel = (s: string) =>
  s.replace(/^\[Suggested\]:\s*/i, "").replace(/\.+$/, "").trim().toLowerCase();

export function findTaskPlanningByLabel(label: string): PlanningTask | null {
  const target = normalizeTaskLabel(label);
  if (!target) return null;
  return TASKS_PLANNING.find((t) => normalizeTaskLabel(t.task) === target) ?? null;
}
