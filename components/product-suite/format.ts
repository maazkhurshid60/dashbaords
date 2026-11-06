/* Formatting helpers + plain-language label maps shared by the Product and
   Communications dashboards (ported from the originals' HELPERS / PLAIN-LANGUAGE LABELS). */
import { SERIES } from "@/components/charts";

export const fmtN = (n: number | null | undefined) =>
  n == null || isNaN(n) ? "—" : Math.abs(n) >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : String(Math.round(n));
export const fmt$ = (n: number | null | undefined) =>
  n == null || isNaN(n) ? "—" : "$" + (Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + "k" : Math.round(n).toLocaleString("en-US"));
export const pct = (n: number | null | undefined, d = 0) => (n == null || isNaN(n) ? "—" : (n * 100).toFixed(d) + "%");
export const fmtD = (s: string | null | undefined) =>
  s ? new Date(s + (s.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
/** Relative time against the real clock (client only — the page renders after mount). */
export const ago = (s: string | null | undefined) => {
  if (!s) return "—";
  const m = (Date.now() - new Date(s).getTime()) / 6e4;
  return m < 1 ? "just now" : m < 60 ? Math.round(m) + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago";
};
export const fmtDT = (s: string) =>
  new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const shortPics = (n: string | null | undefined) => String(n || "").replace(/ \| [^|]+$/, "").trim();
export const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/* ---------- plain-language labels ---------- */
export const STAGE: Record<string, string> = {
  Backlog: "Planned",
  "In Discovery": "Researching",
  "In Development": "Being built",
  QA: "Testing",
  Live: "Live",
  Deprecated: "Retired",
};
export const STAGE_HELP: Record<string, string> = {
  Live: "Customers can use it now",
  Testing: "Built, being checked before release",
  "Being built": "Engineers are working on it",
  Researching: "Deciding exactly what to build",
  Planned: "On the list, not started",
};

/** Pill tones (map of the original's pill classes onto the design tokens). */
export type Tone = "good" | "bad" | "warn" | "info" | "teal" | "purple" | "plain";
export const STAGE_TONE: Record<string, Tone> = {
  Live: "good",
  Testing: "teal",
  "Being built": "info",
  Researching: "purple",
  Planned: "plain",
  Retired: "bad",
};
/* original statusPill (v1) colour map */
export const STATUS_TONE: Record<string, Tone> = {
  Live: "good", QA: "teal", "In Development": "info", "In Discovery": "purple", Backlog: "plain", Deprecated: "bad", Met: "good",
  "In Progress": "info", "Not Started": "plain", Planning: "plain", Ready: "good", Launched: "good", Delayed: "bad", "Rolled Out": "good",
  Scheduled: "info", "Rolled Back": "bad", READY: "good", ERROR: "bad", BUILDING: "warn", CANCELED: "plain", QUEUED: "warn",
  Running: "info", Concluded: "good", Draft: "plain", Processed: "good", Unprocessed: "info", Closed: "plain", Active: "info", Planned: "plain",
};
/* statusPill2 colour map + label rewrite */
export const STATUS2_TONE: Record<string, Tone> = {
  Completed: "good", "In Progress": "info", "At Risk": "warn", Delayed: "warn", "Not Started": "plain", Planning: "plain", Cancelled: "bad",
  "In Review": "purple", "In Review ": "purple", Met: "good", Blocked: "bad", Ready: "good", Launched: "good", READY: "good", ERROR: "bad",
  BUILDING: "warn", CANCELED: "plain", QUEUED: "warn",
};
export const status2Label = (s: string) => (s === "READY" ? "Live" : s === "ERROR" ? "Failed" : s === "CANCELED" ? "Cancelled" : s);
export const SENT_TONE: Record<string, Tone> = { Critical: "bad", High: "warn", Medium: "warn", Low: "plain" };
export const sevInfo = (s: string | null | undefined): { tone: Tone; label: string } => {
  const v = String(s || "");
  if (v.startsWith("P0")) return { tone: "bad", label: "Urgent" };
  if (v.startsWith("P1")) return { tone: "warn", label: "Needs work" };
  if (v.startsWith("P2")) return { tone: "warn", label: "Watch" };
  return { tone: "good", label: "Fine" };
};

/** Stat colour by meaning — the original's toneFor() (label always carries the meaning too). */
export function toneFor(lbl: string, num: string | number): Tone | "" {
  const n = parseFloat(String(num).replace(/[^0-9.\-]/g, ""));
  const zero = !(n > 0);
  if (/overdue|past due|errors?/i.test(lbl)) return zero ? "good" : "bad";
  if (/churn|left/i.test(lbl)) return "warn";
  if (/coming up|due in/i.test(lbl)) return "info";
  if (/done|met|passed|ready/i.test(lbl)) return "good";
  if (/ltv|lifetime|worth/i.test(lbl)) return "purple";
  if (/revenue|paid|mrr|arr/i.test(lbl)) return "good";
  if (/trial/i.test(lbl)) return "warn";
  if (/customers|users|inside/i.test(lbl)) return "info";
  return "";
}

/* ---------- categorical colours (SERIES, fixed order; colour follows the entity) ---------- */
export const PERSONA_ORDER = ["Angels", "Sellers", "Creators", "Pros", "Moguls", "Trends B2B", "Business Basic"];
/** Colour slots follow the persona; Airtable calls the B2B persona "ACRYLICS Trends (B2B Enterprise)". */
export const personaColor = (name: string | null | undefined) => {
  const n = String(name);
  const i = PERSONA_ORDER.findIndex((p) => p === n || (p === "Trends B2B" && /^ACRYLICS Trends/.test(n)));
  return i >= 0 ? SERIES[i] : "#9a9fad";
};
/** Feedback severity → fixed categorical slots (used by both the bars and the weekly line chart). */
export const SEV_ORDER = ["Critical", "High", "Medium", "Low"];
export const sevColor = (s: string) => SERIES[Math.max(0, SEV_ORDER.indexOf(s))];
