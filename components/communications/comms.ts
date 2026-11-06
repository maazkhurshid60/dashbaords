/* Communications layer helpers (ported from VCG_Communications_Dashboard.html):
   SRC / INTENT_CLS / RANGES / ATT_IC / UP_PAGES / UP_TYPES constants, bucket(),
   autoClosed(), rangeBounds(), gmailLink(), upStatus(), aiDraft() … */
import { SERIES } from "@/components/charts";
import type { Tone } from "@/components/product-suite/format";
import { fmtD } from "@/components/product-suite/format";
import { liveOpts } from "@/components/product-suite/logic";
import { DAY, TODAY, iso } from "@/lib/product-data";
import type { Announcement, SuiteData, Ticket } from "@/lib/product-types";

/** Sources — icon glyphs from the original; colours = SERIES in fixed order (colour follows the source). */
export const SRC: Record<string, { n: string; ic: string; c: string }> = {
  Email: { n: "Gmail", ic: "✉", c: SERIES[0] },
  "Web Form": { n: "Site contact form", ic: "◍", c: SERIES[1] },
  Chat: { n: "Chatbot", ic: "◔", c: SERIES[2] },
  Community: { n: "Community help", ic: "☺", c: SERIES[3] },
  SMS: { n: "Text message", ic: "✆", c: SERIES[4] },
};
export const INTENT_TONE: Record<string, Tone> = {
  Complaint: "bad", Inquiry: "info", Booking: "teal", Partnership: "purple", Press: "purple", Internal: "plain", "Spam/Irrelevant": "plain",
};
export const INTENTS = ["Inquiry", "Booking", "Complaint", "Partnership", "Press", "Internal", "Spam/Irrelevant"];
/** Intent bars: categorical slots in fixed order */
export const INTENT_COLOR: Record<string, string> = {
  Complaint: SERIES[0], Inquiry: SERIES[1], Booking: SERIES[2], Partnership: SERIES[3], Press: SERIES[4], Internal: SERIES[5], Noise: SERIES[6],
};
export const intentLabel = (i: string) => (i === "Spam/Irrelevant" ? "Noise" : i);

export const who = (f: string) => String(f || "").replace(/<.*?>/, "").replace(/"/g, "").trim() || String(f || "").replace(/[<>]/g, "");
export const bucket = (t: Ticket) =>
  ["Closed", "Done"].includes(t.status)
    ? "closed"
    : t.status === "Replied"
      ? "answered"
      : t.needs || ["Open", "New", "Todo", "In progress"].includes(t.status)
        ? "needs"
        : "closed";
export const autoClosed = (t: Ticket) => bucket(t) === "closed" && !t.assignee && ["Spam/Irrelevant", "Internal", "Booking"].includes(t.intent);
export const visibleTickets = (D: SuiteData, has: (...k: string[]) => boolean) =>
  (D.tickets || []).filter((t) => t.channel !== "Community" || has("Communications.Channel: Community"));
export const inboxes = (ts: Ticket[]) => [...new Set(ts.filter((t) => t.channel === "Email").flatMap((t) => String(t.to).match(/[\w.+-]+@gmail\.com/g) || []))];
export const hoursAgo = (d: string) => (TODAY.getTime() - new Date(d).getTime()) / 36e5;
export const ageTone = (h: number) => (h > 48 ? "text-bad" : h > 24 ? "text-warn" : "text-brand");
export const ageTxt = (h: number) => (h < 1 ? "just now" : h < 24 ? Math.round(h) + "h" : Math.round(h / 24) + "d");

/* ---------- date range (Today / This week / This month / All / Custom) ---------- */
export const RANGES: [string, string][] = [
  ["today", "Today"],
  ["week", "This week"],
  ["month", "This month"],
  ["all", "All dates"],
  ["custom", "Custom"],
];
export function rangeBounds(range: string, from: string, to: string): [string | null, string | null] {
  const d0 = new Date(TODAY);
  d0.setHours(0, 0, 0, 0);
  if (range === "today") return [iso(d0), null];
  if (range === "week") {
    const d = new Date(d0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return [iso(d), null];
  }
  if (range === "month") return [iso(new Date(d0.getFullYear(), d0.getMonth(), 1)), null];
  if (range === "custom") return [from || null, to || null];
  return [null, null];
}
export const inRange = (t: { date: string }, b: [string | null, string | null]) => {
  const d = (t.date || "").slice(0, 10);
  return (!b[0] || d >= b[0]) && (!b[1] || d <= b[1]);
};
export const rangeLabel = (range: string, b: [string | null, string | null]) =>
  range === "all"
    ? "all dates"
    : range === "custom"
      ? `${b[0] ? fmtD(b[0]) : "start"} – ${b[1] ? fmtD(b[1]) : "today"}`
      : (RANGES.find((r) => r[0] === range) || ["", ""])[1].toLowerCase();
export const customDefaults = () => ({ from: iso(TODAY.getTime() - 14 * DAY), to: iso(TODAY) });

/* ---------- attachments (Communications.Attachments; Gmail keeps the original) ---------- */
export const ATT_IC: Record<string, string> = {
  pdf: "PDF", doc: "DOC", docx: "DOC", xls: "XLS", xlsx: "XLS", csv: "CSV", ppt: "PPT", pptx: "PPT", ics: "CAL", zip: "ZIP",
  png: "IMG", jpg: "IMG", jpeg: "IMG", gif: "IMG", webp: "IMG", heic: "IMG", mp4: "VID", mov: "VID",
};
export const attExt = (n: string) => (String(n).split(".").pop() || "").toLowerCase();
export const fmtSize = (b: number | null | undefined) => (b == null ? "" : b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB");
export const gmailLink = (t: Ticket) => {
  const acct = (String(t.to).match(/[\w.+-]+@gmail\.com/) || ["vcgtracking@gmail.com"])[0];
  return t.thread
    ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(acct)}#all/${t.thread}`
    : `https://mail.google.com/mail/?authuser=${encodeURIComponent(acct)}#search/${encodeURIComponent('subject:"' + String(t.subject).replace(/^(Re|Fwd):\s*/i, "").slice(0, 60) + '"')}`;
};

/* ---------- Updates (Announcements) ---------- */
/* Example mode: Home + every department, and the original's six types. Live mode: the choices of
   Announcements › Target Page / Type in Airtable (anything else would be refused on save). */
export const UP_TYPES = ["News", "Announcement", "Release", "Policy", "Event", "Alert"];
export const UP_PAGES = (D: SuiteData) => liveOpts(D, "announcements.page", ["Home", ...(D.depts || []).map((d) => d.name)]);
export const upTypes = (D: SuiteData) => liveOpts(D, "announcements.type", UP_TYPES);
/** Audience is free text in Airtable (no choices), so these destinations stay a fixed list in both modes. */
export const UP_TYPE_TONE: Record<string, Tone> = { News: "plain", Announcement: "info", Release: "good", Policy: "purple", Event: "teal", Alert: "bad" };
export const UP_DESTS = ["Slack #general", "Slack #acrylics", "Email · whole team", "Email · department only"];
export const upStatus = (a: Announcement) =>
  a.status === "Draft" ? "Draft" : a.expires && a.expires.slice(0, 10) < iso(TODAY) ? "Expired" : a.date && new Date(a.date) > TODAY ? "Scheduled" : "Live";
export const UP_ST_TONE: Record<string, Tone> = { Live: "good", Scheduled: "info", Draft: "warn", Expired: "plain" };

/** Example-mode reply draft (the original's aiDraft — no AI call; live mode ticks Generate Draft instead). */
export function aiDraft(t: Ticket) {
  const name = who(t.from).split(" ")[0] || "there";
  if (t.intent === "Complaint")
    return `Hi ${name},\n\nThanks for flagging this, and sorry for the worry. I'm checking it now and will update you within a few hours — you won't lose your spot while we sort it out.\n\nIsis · ACRYLICS`;
  if (t.intent === "Partnership")
    return `Hi ${name},\n\nThanks for reaching out — we'd love to talk. Could you share a couple of times that work for a 20-minute call this week?\n\nIsis · ACRYLICS`;
  if (t.intent === "Booking") return `Hi ${name},\n\nThanks — confirmed on our side. See you then.\n\nIsis`;
  return `Hi ${name},\n\nThanks for your message. ${t.notes ? "Quick answer: " + t.notes.split(".")[0].replace(/^\[.*?\]\s*/, "") + "." : ""}\n\nLet me know if anything else comes up.\n\nIsis`;
}

/** "Tidy the wording" fallback (example mode): normalise spacing + sentence case; fills an empty title. */
export function tidy(body: string, title: string) {
  const b = body.trim().replace(/[ \t]+/g, " ").replace(/(^\w|[.!?]\s+\w)/g, (m) => m.toUpperCase());
  return { body: b, title: title.trim() ? title : b.split(/[.!?\n]/)[0].slice(0, 70) };
}
