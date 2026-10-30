/* ---------- MASTER REPORTS (P.I.C.S Reports tab) ----------
   Mirrors the Airtable "Master Reports" table (tblRxHSe5HyDPLTZR), cross-referenced with the ANT Connector
   and Productivity Center. The Report Build Assistant is a scripted, simulated guide — no AI API is called. */
import { REAL_DEPARTMENTS } from "./pics";
import type { PicsReport, ReportChatState } from "./pics-types";

// Real Airtable "Report Type" single-select choices (fldlheUV888z5t8TQ)
export const REPORT_TYPES = [
  "UPDATE",
  "STATUS",
  "FINANCIAL",
  "PRODUCT",
  "OPERATIONS",
  "SUCCESS",
  "ADVISOR",
  "CEO REPORT",
  "WEEKLY PULSE",
  "PERFORMANCE",
  "MORNING BRIEF",
  "RESEARCH REPORT",
];
// Real Airtable "Status" single-select choices (fldTae7InPeqbA2W7)
export const REPORT_STATUS = ["Not Started", "In Progress", "Ready for Review", "Approved"];
// Real Airtable "Reporting Period" single-select choices (flduNaeQcmJTPJo6a)
export const REPORT_PERIODS = ["Daily", "Weekly", "Monthly", "Quarterly"];
// Real Airtable "Report Audience" multi-select choices (fldtFlU5djUwEQjK8)
export const REPORT_AUDIENCE = ["Self / Internal Team", "Advisors", "Board & Investors", "External Partners"];

export const REPORT_STATUS_TONE: Record<string, string> = {
  "Not Started": "bg-plane text-ink-2",
  "In Progress": "bg-brand-soft text-brand",
  "Ready for Review": "bg-warn-soft text-warn",
  Approved: "bg-good-soft text-good",
};

export const periodLabel = (r: PicsReport) =>
  `${r.period}${r.weekNumbers?.length ? ` · Wk ${r.weekNumbers.join(", ")}` : ""}`;

/* ---------- Report Build Assistant (scripted) ---------- */

const GREETING =
  "Hi! I'm the Report Build Assistant. I'll walk you through the same fields as the Master Reports table so we can launch a new report together. What should we title it?";

export const EMPTY_CHAT: ReportChatState = { step: "title", draft: {}, messages: [], started: false, lastReportId: null };

export function startNewReportChat(): ReportChatState {
  return {
    step: "title",
    draft: {},
    messages: [
      { from: "system", text: "New report build started" },
      { from: "bot", text: GREETING },
    ],
    started: true,
    lastReportId: null,
  };
}

export type ChatEffect =
  | { kind: "launch"; report: PicsReport }
  | { kind: "appendNote"; reportId: string; text: string }
  | null;

/**
 * One step of the guided conversation. Pure: returns the next chat state plus an optional effect on the
 * Master Reports list (launch a new report, or append a note to the one just launched).
 */
export function advanceReportChat(
  prev: ReportChatState,
  text: string,
  ctx: { reports: PicsReport[]; today: string; newId: () => string },
): { state: ReportChatState; effect: ChatEffect } {
  const s: ReportChatState = { ...prev, draft: { ...prev.draft }, messages: [...prev.messages, { from: "user", text }] };
  const d = s.draft;
  const bot = (t: string) => s.messages.push({ from: "bot", text: t });
  let effect: ChatEffect = null;
  const t = text.trim();

  switch (s.step) {
    case "title":
      d.title = text;
      s.step = "type";
      bot(`Got it — "${text}". What kind of report is this? (${REPORT_TYPES.join(", ")})`);
      break;
    case "type":
      d.reportType = REPORT_TYPES.find((x) => x.toLowerCase() === t.toLowerCase()) ?? REPORT_TYPES[0];
      s.step = "depts";
      bot(`Noted as ${d.reportType}. Which department(s) is this for? (${REAL_DEPARTMENTS.join(", ")})`);
      break;
    case "depts":
      d.depts = text
        .split(",")
        .map((x) => x.trim())
        .filter((x) => REAL_DEPARTMENTS.includes(x));
      if (!d.depts.length) d.depts = ["Operations"];
      s.step = "period";
      bot(`Department(s): ${d.depts.join(", ")}. What's the reporting period? (${REPORT_PERIODS.join(", ")})`);
      break;
    case "period":
      d.period = REPORT_PERIODS.find((p) => p.toLowerCase() === t.toLowerCase()) ?? REPORT_PERIODS[1];
      s.step = "audience";
      bot(`Period: ${d.period}. Who's the audience? (${REPORT_AUDIENCE.join(", ")})`);
      break;
    case "audience":
      d.audience = text
        .split(",")
        .map((x) => x.trim())
        .filter((x) => REPORT_AUDIENCE.includes(x));
      if (!d.audience.length) d.audience = ["Self / Internal Team"];
      s.step = "request";
      bot(`Audience: ${d.audience.join(", ")}. Last thing — what should this report cover?`);
      break;
    case "request":
      d.reportRequest = text;
      s.step = "confirm";
      bot(
        `Here's the draft:\n• Title: ${d.title}\n• Type: ${d.reportType}\n• Dept(s): ${d.depts!.join(", ")}\n• Period: ${d.period}\n• Audience: ${d.audience!.join(", ")}\n• Covers: ${d.reportRequest}\n\nType "launch" to build it, or tell me what to change.`,
      );
      break;
    case "confirm":
      if (/^launch$/i.test(t)) {
        const report: PicsReport = {
          id: ctx.newId(),
          title: d.title ?? "Untitled report",
          reportType: d.reportType ?? REPORT_TYPES[0],
          picsId: null,
          ant: "",
          depts: d.depts ?? ["Operations"],
          period: d.period ?? REPORT_PERIODS[1],
          weekNumbers: [],
          audience: d.audience ?? ["Self / Internal Team"],
          productivityTasks: 0,
          date: ctx.today,
          status: "Not Started",
          preparedBy: "RANT",
          reportRequest: d.reportRequest ?? "",
          deliveryLink: "",
          approved: false,
        };
        effect = { kind: "launch", report };
        s.step = "done";
        s.lastReportId = report.id;
        bot(
          `✅ Report "${report.title}" launched and added to the Master Reports table. Keep chatting here anytime to ask for edits — I'll keep this thread open, even if you close this window.`,
        );
      } else {
        bot("No problem — tell me what to change (title, type, departments, period, audience, or what it covers) and I'll update the draft.");
        s.step = "edit";
      }
      break;
    case "edit":
      d.reportRequest = (d.reportRequest ? d.reportRequest + " " : "") + text;
      s.step = "confirm";
      bot(`Updated. Covers now: ${d.reportRequest}\n\nType "launch" to build it, or tell me what else to change.`);
      break;
    case "done": {
      const rec = ctx.reports.find((r) => r.id === s.lastReportId);
      if (rec) {
        effect = { kind: "appendNote", reportId: rec.id, text };
        bot(`Added that note to "${rec.title}". Want to start a fresh report instead? Use the ↺ button above.`);
      } else {
        bot("Want to start a new one? Use the ↺ button above, or just tell me the title and I'll get started.");
      }
      break;
    }
    default:
      s.step = "title";
      bot("Let's start over — what should we title the report?");
  }
  return { state: s, effect };
}
