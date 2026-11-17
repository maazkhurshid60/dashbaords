/* Pure helpers for the Communications CRM (client + server safe). */
import type { CrmData, Msg, Opp, Source, Stage, Task } from "@/lib/crm-types";

export const H = 3600_000;
export const DAY = 24 * H;

export const ts = (s: string) => {
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
};

export const fmtDate = (s: string) => {
  const t = ts(s);
  return t ? new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : "numeric" }) : "";
};

export const fmtDateTime = (s: string) => {
  const t = ts(s);
  return t ? new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
};

export const ago = (s: string, now = Date.now()) => {
  const t = ts(s);
  if (!t) return "";
  const m = Math.round((now - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 60) return `${d}d ago`;
  return fmtDate(s);
};

export const money = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) || v === 0 ? "Value TBD" : v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const moneyShort = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v)}`;

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/* ---------------------------------------------------------------- inbox */
const CLOSED = ["Done", "Closed", "Replied"];
export const isIncoming = (m: Msg) => m.direction !== "Outgoing";
export const isOpen = (m: Msg) => !CLOSED.includes(m.status);
export const isSnoozed = (m: Msg, now = Date.now()) => ts(m.snoozedUntil) > now;

export type SourceGroup = "Email" | "Site forms" | "Chatbot" | "Community";
export const SOURCE_GROUPS: SourceGroup[] = ["Email", "Site forms", "Chatbot", "Community"];

export const groupOfSource = (s: Source): SourceGroup =>
  /chat/i.test(s.type) ? "Chatbot" : /community|forum/i.test(s.type) ? "Community" : /form/i.test(s.type) ? "Site forms" : "Email";

export const groupOfChannel = (ch: string): SourceGroup =>
  /chat/i.test(ch) ? "Chatbot" : /community/i.test(ch) ? "Community" : /form/i.test(ch) ? "Site forms" : "Email";

export type InboxView = "needs" | "drafts" | "past24" | "new" | "handoff" | "answered" | "all";
export const INBOX_VIEWS: { id: InboxView; label: string }[] = [
  { id: "needs", label: "Needs a reply" },
  { id: "drafts", label: "AI drafts ready" },
  { id: "past24", label: "Past 24 hours" },
  { id: "new", label: "New people" },
  { id: "handoff", label: "Handed off by AI" },
  { id: "answered", label: "Answered" },
  { id: "all", label: "All messages" },
];

/** When the 24-hour reply promise ends: AI hand-off time for chats, otherwise the message date. */
export const replyDue = (m: Msg, D: Pick<CrmData, "chatSessions">) => {
  const s = D.chatSessions.find((c) => m.chatIds.includes(c.id));
  const start = ts(s?.handedOffAt || "") || ts(m.date);
  return start ? start + DAY : 0;
};

export function inboxMatch(view: InboxView, m: Msg, D: Pick<CrmData, "chatSessions">, now = Date.now()) {
  const needs = isIncoming(m) && isOpen(m) && !isSnoozed(m, now) && (m.needs || ["New", "Open", "Todo", "In progress"].includes(m.status));
  switch (view) {
    case "needs":
      return needs;
    case "drafts":
      return isOpen(m) && !!m.draft.trim();
    case "past24":
      return needs && replyDue(m, D) < now;
    case "new":
      return isIncoming(m) && isOpen(m) && !m.contactIds.length;
    case "handoff":
      return isOpen(m) && D.chatSessions.some((c) => m.chatIds.includes(c.id) && c.status === "Handed off");
    case "answered":
      return !isOpen(m) || m.answeredByAI;
    default:
      return true;
  }
}

/* ---------------------------------------------------------------- pipelines */
export const stageOf = (o: Opp, stages: Stage[]) => stages.find((s) => s.id === o.stageId);
export const stageType = (o: Opp, stages: Stage[]) => stageOf(o, stages)?.type || o.stageType;
export const isWon = (o: Opp, stages: Stage[]) => stageType(o, stages) === "Won";
export const isLost = (o: Opp, stages: Stage[]) => stageType(o, stages) === "Lost";
export const isOpenOpp = (o: Opp, stages: Stage[]) => !isWon(o, stages) && !isLost(o, stages);
export const prob = (o: Opp, stages: Stage[]) => stageOf(o, stages)?.probability ?? o.probability ?? 0;
/** Probability may be stored as 0–100 or 0–1. */
export const probFrac = (p: number) => (p > 1 ? p / 100 : p);
export const weighted = (o: Opp, stages: Stage[]) => (o.value || 0) * probFrac(prob(o, stages));
export const daysIn = (o: Opp, now = Date.now()) =>
  o.daysInStage ?? (ts(o.stageChangedAt || o.created) ? Math.floor((now - ts(o.stageChangedAt || o.created)) / DAY) : null);
export const needsNudge = (o: Opp, stages: Stage[], now = Date.now()) =>
  isOpenOpp(o, stages) && (o.stale || !o.nextStep || (!!o.nextStepDate && ts(o.nextStepDate) < now - DAY));

/* ---------------------------------------------------------------- tasks */
export const openTasks = (tasks: Task[]) => tasks.filter((t) => !t.completed && t.status !== "Completed");

/* ---------------------------------------------------------------- search */
export const norm = (s: string) => s.toLowerCase().normalize("NFKD");
export const hit = (q: string, ...xs: string[]) => {
  const n = norm(q.trim());
  return !n || xs.some((x) => norm(x || "").includes(n));
};

export const monthKey = (s: string) => (ts(s) ? new Date(ts(s)).toISOString().slice(0, 7) : "");
export const monthLabel = (k: string) => (k ? new Date(k + "-15").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—");
export const nowMs = () => Date.now();
