import "server-only";
import { createRecord, updateRecord, type Audit, type Fields } from "./airtable.server";
import { CARD_TABLES } from "./pics-card";
import { bad, choice, isDate, isRecId, text } from "./pics-airtable";
import { loadLookups } from "./pics-live";

/* Write side of the P.I.C.S Master Card v2 hooks:
     saveRoadmapItem / saveRoadmapDraft → P.I.C.S Roadmaps      saveTask → Tasks Planning
     saveChecklistItem                  → P.I.C.S Checklist      saveFeedback → Feedback & Review Rounds
   The card sends its own keys (title, rType, due, reviewers…); each kind maps only the keys below to Airtable
   field names (explicit allow-lists), resolves select values to existing choices (no new options, typecast off)
   and team member / department names to record ids. Unknown keys are ignored. */

export type CardKind = "roadmap" | "task" | "checklist" | "feedback";

export const CARD_ALLOW = {
  roadmap: [
    "P.I.C.S Roadmap Phase Title", "Related P.I.C.S", "Related Roadmap Tasks", "Roadmap Type", "Phase", "Roadmap Stage", "Roadmap Status", "Month",
    "Week Number #", "Quarter", "Related Department(s)", "Related Feedback & Review Round(s)", "Sync Roadmap to Related P.I.C.S & P.I.C.S Checklists",
    "Assignee", "Dependencies", "Start Date", "Due Date", "Notes", "P.I.C.S Tag", "Tag Status", "Sprint Number",
  ],
  task: [
    "Task", "Assigned To", "Task Type", "Status", "Priority", "Start Date", "Due Date", "Hours Worked", "Planned Hours", "Task Details",
    "Notes From Assignee", "Related Roadmap",
  ],
  checklist: [
    "Checklist Item Name", "Checklist Number", "General Notes", "Item Type", "Deliverable (Asset) Type", "Due Date", "Status", "Checklist Owner",
    "Checklist Reviewer", "Related Roadmap", "Related P.I.C.S", "OPANT Notes",
  ],
  feedback: [
    "Feedback & Review Title", "Round Number", "Round Type", "Status", "Due Date", "Month", "Reviewer(s)", "Review URLs", "Review Notes",
    "Review Actions", "Feedback URLs", "P.I.C.S Tag", "Tag Status",
  ],
} as const;

const TABLE: Record<CardKind, string> = {
  roadmap: CARD_TABLES.roadmaps,
  task: CARD_TABLES.tasks,
  checklist: CARD_TABLES.checklist,
  feedback: CARD_TABLES.reviews,
};

type P = Record<string, unknown>;
const has = (p: P, k: string) => Object.prototype.hasOwnProperty.call(p, k);
const list = (v: unknown): string[] => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]).map((x) => String(x).trim()).filter(Boolean);
const recIds = (v: unknown, label: string) => {
  const ids = list(v);
  if (ids.some((x) => !isRecId(x))) throw bad(`${label} must be Airtable record ids`);
  return ids;
};
const date = (v: unknown, label: string) => {
  if (v == null || v === "") return null;
  if (!isDate(v)) throw bad(`${label} must be YYYY-MM-DD`);
  return v;
};
const number = (v: unknown, label: string) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw bad(`${label} must be a number`);
  return n;
};
const D = (s: string) => new Date(s + "T00:00:00Z");
const monthName = (s: string) => D(s).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
const isoWeek = (s: string) => {
  const t = D(s);
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - y0) / 864e5 + 1) / 7);
};

async function teamIds(names: string[]) {
  const { team } = await loadLookups();
  return names.map((n) => {
    const hits = [...team].filter(([, name]) => name === n);
    if (hits.length !== 1) throw bad(hits.length ? `"${n}" matches more than one team member` : `Unknown team member "${n}"`);
    return hits[0][0];
  });
}
async function deptIds(names: string[]) {
  const { depts } = await loadLookups();
  return names.map((n) => {
    const id = [...depts].find(([, name]) => name === n)?.[0];
    if (!id) throw bad(`Unknown department "${n}"`);
    return id;
  });
}
/** Optional select (Month / Week / Quarter auto-fields): skipped instead of failing when the choice doesn't exist. */
async function softChoice(tableId: string, field: string, value: string) {
  try {
    return await choice(tableId, field, value);
  } catch {
    return undefined;
  }
}
const sel = (tableId: string, field: string, v: unknown) => (v == null || String(v).trim() === "" ? null : choice(tableId, field, String(v)));

async function roadmapFields(p: P, create: boolean): Promise<Fields> {
  const T = TABLE.roadmap;
  const f: Fields = {};
  if (has(p, "title") || create) {
    const t = text(p.title, 500);
    if (!t) throw bad("Roadmap title is required");
    f["P.I.C.S Roadmap Phase Title"] = t;
  }
  if (has(p, "rType")) f["Roadmap Type"] = await sel(T, "Roadmap Type", p.rType);
  if (has(p, "phase")) f["Phase"] = await sel(T, "Phase", p.phase);
  if (has(p, "stage")) f["Roadmap Stage"] = await sel(T, "Roadmap Stage", p.stage);
  if (has(p, "status")) f["Roadmap Status"] = await sel(T, "Roadmap Status", p.status);
  if (has(p, "start")) {
    const s = date(p.start, "Start date");
    f["Start Date"] = s;
    if (s) {
      const m = await softChoice(T, "Month", monthName(s));
      const w = await softChoice(T, "Week Number #", String(isoWeek(s)));
      const q = await softChoice(T, "Quarter", "Q" + (Math.floor(D(s).getUTCMonth() / 3) + 1));
      if (m) f["Month"] = m;
      if (w) f["Week Number #"] = w;
      if (q) f["Quarter"] = q;
    }
  }
  if (has(p, "date")) f["Due Date"] = date(p.date, "Due date");
  if (has(p, "picsIds")) f["Related P.I.C.S"] = recIds(p.picsIds, "Related P.I.C.S");
  else if (create && isRecId(p.pics)) f["Related P.I.C.S"] = [p.pics];
  if (has(p, "tasks")) f["Related Roadmap Tasks"] = recIds(p.tasks, "Related Roadmap Tasks");
  if (has(p, "feedbackIds")) f["Related Feedback & Review Round(s)"] = recIds(p.feedbackIds, "Related Feedback & Review Round(s)");
  if (has(p, "depts")) f["Related Department(s)"] = await deptIds(list(p.depts));
  if (has(p, "assignee")) f["Assignee"] = await teamIds(list(p.assignee));
  if (has(p, "dependencies")) f["Dependencies"] = text(p.dependencies);
  if (has(p, "notes")) f["Notes"] = text(p.notes);
  if (has(p, "syncFlag")) f["Sync Roadmap to Related P.I.C.S & P.I.C.S Checklists"] = p.syncFlag === true || p.syncFlag === "on" || p.syncFlag === "true";
  if (has(p, "tag")) f["P.I.C.S Tag"] = text(p.tag, 200);
  if (has(p, "tagStatus")) f["Tag Status"] = await sel(T, "Tag Status", p.tagStatus);
  if (has(p, "sprintNo")) f["Sprint Number"] = number(p.sprintNo, "Sprint number");
  return f;
}

async function taskFields(p: P, create: boolean): Promise<Fields> {
  const T = TABLE.task;
  const f: Fields = {};
  if (has(p, "title") || create) {
    const t = text(p.title, 500);
    if (!t) throw bad("Task name is required");
    f["Task"] = t;
  }
  if (has(p, "assignee")) f["Assigned To"] = await teamIds(list(p.assignee));
  if (has(p, "type")) f["Task Type"] = await sel(T, "Task Type", p.type);
  if (has(p, "status")) f["Status"] = await sel(T, "Status", p.status);
  if (has(p, "priority")) f["Priority"] = await sel(T, "Priority", p.priority);
  if (has(p, "start")) f["Start Date"] = date(p.start, "Start date");
  if (has(p, "due")) f["Due Date"] = date(p.due, "Due date");
  if (has(p, "worked")) f["Hours Worked"] = number(p.worked, "Hours worked");
  if (has(p, "planned")) f["Planned Hours"] = number(p.planned, "Planned hours");
  if (has(p, "details")) f["Task Details"] = text(p.details, 2000).replace(/\s*\n\s*/g, " ");
  if (has(p, "notesFromAssignee")) f["Notes From Assignee"] = text(p.notesFromAssignee);
  if (has(p, "roadmapIds")) f["Related Roadmap"] = recIds(p.roadmapIds, "Related Roadmap");
  return f;
}

async function checklistFields(p: P, create: boolean): Promise<Fields> {
  const T = TABLE.checklist;
  const f: Fields = {};
  if (has(p, "title") || create) {
    const t = text(p.title, 500);
    if (!t) throw bad("Checklist item name is required");
    f["Checklist Item Name"] = t;
  }
  if (has(p, "num")) f["Checklist Number"] = number(p.num, "Checklist number");
  if (has(p, "itemType")) f["Item Type"] = await sel(T, "Item Type", p.itemType);
  if (has(p, "assetType")) f["Deliverable (Asset) Type"] = await sel(T, "Deliverable (Asset) Type", p.assetType);
  if (has(p, "due")) f["Due Date"] = date(p.due, "Due date");
  if (has(p, "status")) f["Status"] = await sel(T, "Status", p.status);
  if (has(p, "owner")) f["Checklist Owner"] = await teamIds(list(p.owner));
  if (has(p, "reviewer")) f["Checklist Reviewer"] = await teamIds(list(p.reviewer));
  if (has(p, "notes")) f["General Notes"] = text(p.notes);
  if (has(p, "opant")) f["OPANT Notes"] = text(p.opant);
  if (has(p, "roadmapIds")) f["Related Roadmap"] = recIds(p.roadmapIds, "Related Roadmap");
  if (has(p, "picsIds")) f["Related P.I.C.S"] = recIds(p.picsIds, "Related P.I.C.S");
  return f;
}

async function feedbackFields(p: P): Promise<Fields> {
  const T = TABLE.feedback;
  const f: Fields = {};
  if (has(p, "title")) {
    const t = text(p.title, 500);
    if (!t) throw bad("Review round title is required");
    f["Feedback & Review Title"] = t;
  }
  if (has(p, "round")) f["Round Number"] = number(p.round, "Round number");
  if (has(p, "type")) f["Round Type"] = await sel(T, "Round Type", p.type);
  if (has(p, "status")) f["Status"] = await sel(T, "Status", p.status);
  if (has(p, "due")) {
    const d = date(p.due, "Due date");
    f["Due Date"] = d;
    const m = d ? await softChoice(T, "Month", monthName(d)) : undefined;
    if (m) f["Month"] = m;
  }
  if (has(p, "reviewers")) f["Reviewer(s)"] = await teamIds(list(p.reviewers));
  if (has(p, "reviewUrls")) f["Review URLs"] = text(p.reviewUrls);
  if (has(p, "notes")) f["Review Notes"] = text(p.notes, 90000);
  if (has(p, "actions")) f["Review Actions"] = text(p.actions, 90000);
  if (has(p, "feedbackUrls")) f["Feedback URLs"] = text(p.feedbackUrls);
  if (has(p, "tag")) f["P.I.C.S Tag"] = text(p.tag, 200);
  if (has(p, "tagStatus")) f["Tag Status"] = await sel(T, "Tag Status", p.tagStatus);
  return f;
}

export const isCardKind = (k: string): k is CardKind => k === "roadmap" || k === "task" || k === "checklist" || k === "feedback";

function auditOf(a: unknown, fallbackArea: string): Audit {
  const o = (a && typeof a === "object" ? a : {}) as { dashboard?: unknown; area?: unknown };
  const dashboard = o.dashboard === "Product" ? "Product" : "PICS Operations";
  return { dashboard, area: text(o.area, 120) || fallbackArea };
}

/** PATCH (id) or POST (no id) one card record. Returns the Airtable record id. */
export async function writeCard(kind: CardKind, id: string | null, patch: P, audit: unknown) {
  if (!patch || typeof patch !== "object") throw bad("Send { patch }");
  if (id && !isRecId(id)) throw bad("Not an Airtable record id");
  const create = !id;
  if (create && kind === "feedback") throw bad("Feedback & review rounds are created in Airtable");
  const fields =
    kind === "roadmap" ? await roadmapFields(patch, create)
    : kind === "task" ? await taskFields(patch, create)
    : kind === "checklist" ? await checklistFields(patch, create)
    : await feedbackFields(patch);
  if (!Object.keys(fields).length) return { id, skipped: true };
  const a = auditOf(audit, kind);
  const rec = id
    ? await updateRecord(TABLE[kind], id, fields, CARD_ALLOW[kind], false, a)
    : await createRecord(TABLE[kind], fields, CARD_ALLOW[kind], false, a);
  return { id: rec.id, fields: Object.keys(fields) };
}
