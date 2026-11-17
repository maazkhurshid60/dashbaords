import "server-only";
import { AirtableError, createRecord, deleteRecord, getSchema, updateRecord, type AtRecord, type Fields } from "@/lib/airtable.server";
import { CRM_TABLES, MAPPERS } from "@/lib/crm-live";
import type { Kind, WriteResult } from "@/lib/crm-types";

/* Write side of the Communications CRM. One function per hook of the prototype
   (communications-crm-hub.html): saveContact, saveCompany, saveDeal → Opportunities, savePipeline,
   saveTask, logActivity, sendReply, sendChatReply, saveSource, snovAction, postUpdate, saveView,
   notifySlack, saveNotificationRules (+ updateMessage, saveChatSession, saveAnswer).
   Each table has an explicit allow-list; select values are checked against the live schema and
   typecast is off, so a write can never invent a new select option. Every write is logged to the
   Dashboard Sync Queue with {dashboard: "Communications", area: <tab>}. External services we have
   no keys for are reported back in `notConnected` — the Airtable side is still saved. */

const T = CRM_TABLES;

const ALLOW = {
  contacts: [
    "Name", "Outlet / Organization", "Role / Title", "Relationship", "Email", "Phone", "Location", "Last Contacted", "Notes",
    "Company", "Lifecycle Stage", "Lead Score", "Owner", "Lead Source", "Tags", "Followed By", "Contractor Status",
    "Engagement Type", "Department", "Team Member", "Contact Category", "Social Handle", "Website", "Related P.I.C.S", "Duplicate Of",
  ],
  companies: ["Company Name", "Website", "Industry", "Size", "City", "Tier", "Notes", "Owner"],
  opps: [
    "Opportunity Name", "Pipeline", "Pipeline Record", "Stage Changed At", "Value", "Close Date", "Next Step", "Next Step Date",
    "Lost Reason", "Plan", "Quantity", "Unit Price", "Pipeline Stage", "Primary Contact", "Owner", "Company", "Source Message",
    "Followed By", "Related P.I.C.S",
  ],
  pipelines: ["Pipeline Name", "Order", "Active", "Description", "Created By"],
  tasks: [
    "Task", "Assigned To", "Due Date", "Priority", "Status", "Completed", "Date Completed", "Related P.I.C.S", "P.I.C.S Tag",
    "Related Communications", "Related Opportunity", "Related Contact", "Task Type", "Notes From Assignee", "Last Dashboard Edit At",
  ],
  activities: ["Subject", "Type", "Body", "Date", "Source", "Contact", "Opportunity", "Owner", "Communication"],
  msgs: [
    "Status", "Needs Response", "Assignee", "Intent", "Reply Draft", "Snoozed Until", "Contact", "Opportunities", "Notes",
    "Reply Visibility", "Reopened", "Sent From", "Inbox Sources",
  ],
  chatSessions: ["Status", "Owner", "Contact"],
  chatMessages: ["Message", "Sender Type", "Sender Name", "Text", "Sent At", "Delivered Via", "Session", "Team Member"],
  sources: [
    "Source Name", "Source Type", "Address / URL", "Website", "Platform", "Status", "Owner", "Reply From", "Slack Channel",
    "Intranet Alerts", "AI Drafts", "AI Auto-Reply (Community)", "Reply Window (hours)", "Sync Method", "Notes",
  ],
  campaigns: ["Status", "Notes", "Owner"],
  announcements: [
    "Title", "Body", "Type", "Target Page", "Department", "Audience", "Status", "Publish Date", "Expires", "Pinned", "Posted By",
    "Publish To", "Slack Channel", "Related Opportunity", "Related Contact", "Likes",
  ],
  views: [
    "View Name", "Object", "Stages", "Locations", "Months", "Sources", "Tiers", "Industries", "Pipelines", "Stage Types",
    "Close Months", "Shared", "Owners", "Created By",
  ],
  rules: ["Inbox", "Intranet", "Slack", "Slack Channel", "Email", "Events", "Quiet Hours", "Owner"],
  answers: ["Answer Title", "Answer Body", "Answer Category", "Approved"],
} as const satisfies Partial<Record<Kind, readonly string[]>>;

type WKind = keyof typeof ALLOW;
const TABLE: Record<WKind, string> = {
  contacts: T.contacts,
  companies: T.companies,
  opps: T.opps,
  pipelines: T.pipelines,
  tasks: T.tasks,
  activities: T.activities,
  msgs: T.msgs,
  chatSessions: T.chatSessions,
  chatMessages: T.chatMessages,
  sources: T.sources,
  campaigns: T.campaigns,
  announcements: T.announcements,
  views: T.views,
  rules: T.rules,
  answers: T.answers,
};

const isRec = (v: unknown): v is string => typeof v === "string" && /^rec[A-Za-z0-9]{14}$/.test(v);

/** Drops empty-string keys the client sends for "unchanged", checks select values against the schema. */
async function clean(tableId: string, fields: Fields): Promise<Fields> {
  const schema = (await getSchema()).find((t) => t.id === tableId);
  const out: Fields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const f = schema?.fields.find((x) => x.name === k);
    if (!f) throw new AirtableError(`Unknown field “${k}”`, 400);
    if (f.type === "singleSelect" && v !== null && v !== "") {
      const ok = f.options?.choices?.some((c) => c.name === v || c.name.trim() === v);
      if (!ok) throw new AirtableError(`“${String(v)}” isn't a ${k} option in Airtable`, 400);
      out[k] = f.options!.choices!.find((c) => c.name === v || c.name.trim() === v)!.name;
      continue;
    }
    if (f.type === "singleSelect" && v === "") {
      out[k] = null;
      continue;
    }
    if (f.type === "multipleSelects") {
      const list = Array.isArray(v) ? v.map(String) : [];
      const names = f.options?.choices?.map((c) => c.name) || [];
      const bad = list.filter((x) => !names.includes(x));
      if (bad.length) throw new AirtableError(`${k}: not an option — ${bad.join(", ")}`, 400);
      out[k] = list;
      continue;
    }
    if (f.type === "multipleRecordLinks") {
      const list = Array.isArray(v) ? v.filter(isRec) : [];
      out[k] = list;
      continue;
    }
    if ((f.type === "date" || f.type === "dateTime") && v === "") {
      out[k] = null;
      continue;
    }
    if ((f.type === "number" || f.type === "currency" || f.type === "percent") && (v === "" || v === null)) {
      out[k] = null;
      continue;
    }
    out[k] = v;
  }
  return out;
}

const area = (a: string) => ({ dashboard: "Communications", area: a, batchId: "com-" + Date.now().toString(36) });

async function save(kind: WKind, id: string | undefined, fields: Fields, tab: string): Promise<AtRecord> {
  const table = TABLE[kind];
  const f = await clean(table, fields);
  const allow = ALLOW[kind] as readonly string[];
  if (id) {
    if (!isRec(id)) throw new AirtableError("Bad record id", 400);
    return (await updateRecord(table, id, f, allow, false, area(tab))) as AtRecord;
  }
  return (await createRecord(table, f, allow, false, area(tab))) as AtRecord;
}

const rec = (kind: Kind, r: AtRecord) => ({ kind, record: MAPPERS[kind](r) });
const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);

type P = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const ids = (v: unknown) => (Array.isArray(v) ? v.filter(isRec) : isRec(v) ? [v] : []);
const fieldsOf = (p: P) => (p.fields && typeof p.fields === "object" ? (p.fields as Fields) : {});

/* ---------------------------------------------------------------- actions */
const ACTIONS: Record<string, (p: P) => Promise<WriteResult>> = {
  async saveContact(p) {
    return { ok: true, records: [rec("contacts", await save("contacts", s(p.id) || undefined, fieldsOf(p), s(p.tab) || "Contacts"))] };
  },
  async saveCompany(p) {
    return { ok: true, records: [rec("companies", await save("companies", s(p.id) || undefined, fieldsOf(p), s(p.tab) || "Contacts"))] };
  },
  /** Opportunities. Moving to a new stage stamps Stage Changed At and logs a Stage activity;
      moving to Won also posts a Win to Announcements (Slack #wins not connected yet). */
  async saveDeal(p) {
    const f = { ...fieldsOf(p) };
    const id = s(p.id) || undefined;
    const tab = s(p.tab) || "Pipelines";
    const stageName = s(p.stageName);
    if ("Pipeline Stage" in f) f["Stage Changed At"] = nowIso();
    const r = await save("opps", id, f, tab);
    const out: WriteResult = { ok: true, records: [rec("opps", r)] };
    if ("Pipeline Stage" in f && stageName) {
      const a = await save(
        "activities",
        undefined,
        {
          Subject: `Moved to ${stageName}`,
          Type: "Stage",
          Source: "System",
          Date: nowIso(),
          Opportunity: [r.id],
          Contact: ids(r.fields["Primary Contact"]),
          Owner: ids(p.by),
        },
        tab,
      );
      out.records!.push(rec("activities", a));
      if (/^won$/i.test(stageName)) {
        const name = String(r.fields["Opportunity Name"] ?? "");
        const w = await save(
          "announcements",
          undefined,
          {
            Title: `Won: ${name}`,
            Body: s(p.winNote) || `${name} moved to Won.`,
            Type: "Win",
            Status: "Published",
            "Publish Date": today(),
            "Publish To": ["Home page", "Slack"],
            "Slack Channel": "#wins",
            "Related Opportunity": [r.id],
            "Posted By": ids(p.by),
          },
          "Updates",
        );
        out.records!.push(rec("announcements", w));
        out.notConnected = ["Slack #wins"];
      }
    }
    return out;
  },
  /** New pipeline (name only — stages are shared), or archive one (Active = false). */
  async savePipeline(p) {
    return { ok: true, records: [rec("pipelines", await save("pipelines", s(p.id) || undefined, fieldsOf(p), "Pipelines"))] };
  },
  async saveTask(p) {
    const f: Fields = { ...fieldsOf(p), "Last Dashboard Edit At": nowIso() };
    if (f.Completed === true && !("Date Completed" in f)) f["Date Completed"] = nowIso();
    if (f.Completed === true && !("Status" in f)) f.Status = "Completed";
    return { ok: true, records: [rec("tasks", await save("tasks", s(p.id) || undefined, f, s(p.tab) || "Inbox"))] };
  },
  async logActivity(p) {
    const f: Fields = { Date: nowIso(), Source: "Manual", ...fieldsOf(p) };
    const out: WriteResult = { ok: true, records: [rec("activities", await save("activities", undefined, f, s(p.tab) || "Contacts"))] };
    const cid = ids(f.Contact)[0];
    if (cid && (f.Type === "Email" || f.Type === "Call" || f.Type === "Meeting")) {
      out.records!.push(rec("contacts", await save("contacts", cid, { "Last Contacted": today() }, s(p.tab) || "Contacts")));
    }
    return out;
  },
  /** Status / snooze / close / assign / link a message. */
  async updateMessage(p) {
    return { ok: true, records: [rec("msgs", await save("msgs", s(p.id), fieldsOf(p), "Inbox"))] };
  },
  /** Reply: marks the message Replied, keeps the text in Reply Draft, logs an Email activity on the
      contact. Sending the email itself needs the Gmail / Snov.io connection. */
  async sendReply(p) {
    const id = s(p.id);
    const body = s(p.body).trim();
    if (!body) throw new AirtableError("Write a reply first", 400);
    const m = await save(
      "msgs",
      id,
      {
        Status: "Replied",
        "Needs Response": false,
        "Reply Draft": body,
        ...(s(p.from) ? { "Sent From": s(p.from) } : {}),
        ...(s(p.visibility) ? { "Reply Visibility": s(p.visibility) } : {}),
      },
      "Inbox",
    );
    const contact = ids(m.fields["Contact"]);
    const a = await save(
      "activities",
      undefined,
      {
        Subject: `Re: ${String(m.fields["Subject"] ?? "")}`.slice(0, 250),
        Type: "Email",
        Source: "Manual",
        Body: body,
        Date: nowIso(),
        Communication: [id],
        Contact: contact,
        Opportunity: ids(m.fields["Opportunities"]),
        Owner: ids(p.by),
      },
      "Inbox",
    );
    const records = [rec("msgs", m), rec("activities", a)];
    if (contact[0]) records.push(rec("contacts", await save("contacts", contact[0], { "Last Contacted": today() }, "Inbox")));
    return { ok: true, records, notConnected: [s(p.visibility) === "Public reply" ? "Community forum posting" : "Email sending (Gmail / Snov.io)"] };
  },
  /** Chat reply: Chat Messages row (Team) + session Answered. Delivery needs the site chat widget. */
  async sendChatReply(p) {
    const session = s(p.session);
    const text = s(p.text).trim();
    if (!isRec(session) || !text) throw new AirtableError("Pick a chat and write a reply", 400);
    const via = s(p.via) === "Email" ? "Email" : "Chat";
    const m = await save(
      "chatMessages",
      undefined,
      {
        Message: text.slice(0, 120),
        Text: text,
        "Sender Type": "Team",
        "Sender Name": s(p.senderName),
        "Sent At": nowIso(),
        "Delivered Via": via,
        Session: [session],
        "Team Member": ids(p.by),
      },
      "Inbox",
    );
    const ss = await save("chatSessions", session, { Status: "Answered" }, "Inbox");
    return { ok: true, records: [rec("chatMessages", m), rec("chatSessions", ss)], notConnected: [via === "Chat" ? "Site chat widget" : "Email sending (Gmail)"] };
  },
  async saveChatSession(p) {
    return { ok: true, records: [rec("chatSessions", await save("chatSessions", s(p.id), fieldsOf(p), "Inbox"))] };
  },
  async saveSource(p) {
    const out: WriteResult = { ok: true, records: [rec("sources", await save("sources", s(p.id) || undefined, fieldsOf(p), "Inbox"))] };
    if (p.connect) out.notConnected = ["Inbox sync (Gmail / site form / chatbot connector)"];
    return out;
  },
  /** Launch / Pause / Resume a campaign: Email Campaigns › Status. Snov.io / Brevo need API keys. */
  async snovAction(p) {
    const verb = s(p.verb);
    const status = verb === "pause" ? "Paused" : verb === "launch" || verb === "resume" ? "Active" : "";
    if (!status) throw new AirtableError("Unknown campaign action", 400);
    const r = await save("campaigns", s(p.id), { Status: status }, "Campaigns");
    const ch = String(r.fields["Channel"] ?? "") || "Snov.io";
    return { ok: true, records: [rec("campaigns", r)], notConnected: [`${ch} API`] };
  },
  async postUpdate(p) {
    const f = fieldsOf(p);
    const r = await save("announcements", s(p.id) || undefined, f, "Updates");
    const to = Array.isArray(f["Publish To"]) ? (f["Publish To"] as string[]) : [];
    const nc = [...(to.includes("Slack") ? ["Slack"] : []), ...(to.includes("Email") ? ["Team email"] : [])];
    return { ok: true, records: [rec("announcements", r)], ...(nc.length ? { notConnected: nc } : {}) };
  },
  async saveView(p) {
    if (p.remove) {
      const id = s(p.id);
      if (!isRec(id)) throw new AirtableError("Bad record id", 400);
      await deleteRecord(T.views, id, area(s(p.tab) || "Contacts"));
      return { ok: true, removed: [{ kind: "views", id }] };
    }
    return { ok: true, records: [rec("views", await save("views", s(p.id) || undefined, fieldsOf(p), s(p.tab) || "Contacts"))] };
  },
  async notifySlack() {
    return { ok: true, notConnected: ["Slack"] };
  },
  async saveNotificationRules(p) {
    return { ok: true, records: [rec("rules", await save("rules", s(p.id) || undefined, fieldsOf(p), "Notifications"))] };
  },
  async saveAnswer(p) {
    return { ok: true, records: [rec("answers", await save("answers", s(p.id) || undefined, fieldsOf(p), "Inbox"))] };
  },
};

export const CRM_ACTIONS = Object.keys(ACTIONS);

export async function runCrmAction(action: string, payload: P): Promise<{ status: number; body: WriteResult }> {
  const fn = Object.prototype.hasOwnProperty.call(ACTIONS, action) ? ACTIONS[action] : undefined;
  if (!fn) return { status: 404, body: { ok: false, error: `Unknown action ${action}` } };
  try {
    return { status: 200, body: await fn(payload || {}) };
  } catch (e) {
    const status = e instanceof AirtableError ? (e.status >= 400 && e.status < 600 ? e.status : 500) : 500;
    console.error("[crm-write]", action, e);
    return { status, body: { ok: false, error: e instanceof Error ? e.message : String(e) } };
  }
}
