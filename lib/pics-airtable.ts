import "server-only";
import { NextResponse } from "next/server";
import { AirtableError, getSchema, listRecords, str } from "./airtable.server";
import { PICS_TABLES, initialsOf, loadLookups } from "./pics-live";
import type { ChecklistItem, RoadmapRow } from "./types";

/* Write helpers for the /api/pics/* route handlers. Every route sends an explicit allow-list of
   Airtable field names (verified against the base schema) to updateRecord/createRecord, and every
   single/multi-select value is resolved to an existing choice here, so writes go out with
   typecast=false and can never invent new select options or link records by name. */

/* ---------------------------------------------------------------- allow-lists (Airtable field names) */
export const ALLOW = {
  /** P.I.C.S (tblbiIHxN97iyltFY) — new record form + stage change. */
  picsCreate: [
    "P.I.C.S Name", "Type", "Stage", "Start Date", "End Date", "Related Department(s)", "Project Leads", "Overview", "Stakeholders",
    "Briefing Link", "Live Site URL", "Hierarchy", "Related Parent/Child/Subchild", "Active",
  ],
  picsUpdate: ["Stage"],
  /** P.I.C.S Checklist (tbl8Nm9AL749eBLZC). */
  checklistCreate: ["Checklist Item Name", "Due Date", "Item Type", "Deliverable (Asset) Type", "Status", "OPANT Notes", "Related P.I.C.S"],
  checklistUpdate: ["Checklist Item Name", "Due Date", "Item Type", "Deliverable (Asset) Type", "Status", "OPANT Notes"],
  checklistActivity: ["Checklist Item Name", "Status"],
  /** P.I.C.S Roadmaps (tblTo1C185aBEIshk). */
  roadmapCreate: ["P.I.C.S Roadmap Phase Title", "Roadmap Type", "Phase", "Roadmap Stage", "Roadmap Status", "Start Date", "Due Date", "Related P.I.C.S"],
  roadmapUpdate: ["P.I.C.S Roadmap Phase Title", "Roadmap Type", "Phase", "Roadmap Stage", "Roadmap Status", "Due Date"],
  /** Master Reports (tblRxHSe5HyDPLTZR). */
  reportCreate: [
    "Report Title", "Report Type", "Status", "Reporting Period", "Week Number", "Related Department(s)", "Report Audience", "Prepared By",
    "Related ANT", "Report Request", "Delivery Link", "Date Created", "Approved", "Created Via",
  ],
} as const;

/* ---------------------------------------------------------------- validation helpers */
export const bad = (msg: string) => new AirtableError(msg, 400);
export const isRecId = (v: unknown): v is string => typeof v === "string" && /^rec[A-Za-z0-9]{14}$/.test(v);
export const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
export const text = (v: unknown, max = 10000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const url = (v: unknown) => {
  const s = text(v, 2000);
  if (s && !/^https?:\/\//i.test(s)) throw bad(`Not a valid URL: ${s}`);
  return s;
};

/** Resolves a value to an existing choice of a single/multiple select field (ignores stray whitespace like
    "Execution " on the Roadmap Stage field). Throws 400 if the choice doesn't exist. */
export async function choice(tableId: string, field: string, value: string): Promise<string> {
  const t = (await getSchema()).find((x) => x.id === tableId);
  const fld = t?.fields.find((x) => x.name === field);
  if (!fld) throw new AirtableError(`Field "${field}" not found on ${tableId}`, 500);
  const v = value.trim();
  const hit = fld.options?.choices?.find((c) => c.name === value) ?? fld.options?.choices?.find((c) => c.name.trim() === v);
  if (!hit) throw bad(`"${v}" is not an option for ${field} in Airtable`);
  return hit.name;
}
export const choices = (tableId: string, field: string, values: string[]) => Promise.all(values.map((v) => choice(tableId, field, v)));

/** Department names → Departments record IDs (unknown names are rejected). */
export async function deptIds(names: string[]): Promise<string[]> {
  const { depts } = await loadLookups();
  return names.map((n) => {
    const id = [...depts].find(([, name]) => name === n)?.[0];
    if (!id) throw bad(`Unknown department "${n}"`);
    return id;
  });
}

/** Initials → Team Members record IDs. Only unambiguous matches are linked; the rest are returned as warnings
    (current team members win over past ones when initials collide). */
export async function teamIdsByInitials(initials: string[]) {
  const rows = await listRecords(PICS_TABLES.team, { fields: ["Name", "Currently Working"] });
  const ids: string[] = [];
  const leads: { i: string; name: string }[] = [];
  const unmatched: string[] = [];
  for (const raw of initials) {
    const want = raw.trim().toUpperCase();
    if (!want || want === "—") continue;
    let hits = rows.filter((r) => initialsOf(str(r.fields["Name"])) === want);
    if (hits.length > 1) hits = hits.filter((r) => r.fields["Currently Working"] === true);
    if (hits.length === 1) {
      ids.push(hits[0].id);
      leads.push({ i: want, name: str(hits[0].fields["Name"]).trim() });
    } else unmatched.push(raw.trim());
  }
  return { ids: [...new Set(ids)], leads, unmatched };
}

/** ANT names → ANT Library record IDs (case-insensitive; unknown names are returned as warnings). */
export async function antIds(names: string[]) {
  const rows = await listRecords(PICS_TABLES.ants, { fields: ["ANT Name"] });
  const ids: string[] = [];
  const unmatched: string[] = [];
  for (const n of names) {
    const hit = rows.find((r) => str(r.fields["ANT Name"]).trim().toLowerCase() === n.trim().toLowerCase());
    if (hit) ids.push(hit.id);
    else unmatched.push(n);
  }
  return { ids, unmatched };
}

/* ---------------------------------------------------------------- dashboard shape → Airtable fields */

/* Dashboard checklist (task status + approval status + complete/done) → the single Airtable "Status":
   approval wins (In Review / Approved / Rejected), then completion, then the task status. */
export function checklistStatus(c: Partial<ChecklistItem>): string {
  if (c.approvalStatus === "Approved") return "Approved";
  if (c.approvalStatus === "Rejected") return "Rejected";
  if (c.approvalStatus === "Review & Feedback") return "In Review";
  if (c.complete || c.status === "done") return "Completed";
  return c.taskStatus || "Not Started";
}

export async function checklistFields(c: Partial<ChecklistItem>) {
  const T = PICS_TABLES.checklist;
  const name = text(c.item, 500);
  if (!name) throw bad("Checklist item name is required");
  if (c.due != null && !isDate(c.due)) throw bad("Due date must be YYYY-MM-DD");
  return {
    "Checklist Item Name": name,
    "Due Date": c.due || null,
    "Item Type": c.itemType ? await choice(T, "Item Type", c.itemType) : null,
    "Deliverable (Asset) Type": c.assetType ? await choice(T, "Deliverable (Asset) Type", c.assetType) : null,
    Status: await choice(T, "Status", checklistStatus(c)),
    "OPANT Notes": text(c.notes),
  };
}

export async function roadmapFields(row: Partial<RoadmapRow>) {
  const T = PICS_TABLES.roadmaps;
  const label = text(row.label, 500);
  if (!label) throw bad("Roadmap item title is required");
  if (!isDate(row.date)) throw bad("Roadmap date must be YYYY-MM-DD");
  return {
    "P.I.C.S Roadmap Phase Title": label,
    "Roadmap Type": row.type ? await choice(T, "Roadmap Type", row.type) : null,
    Phase: row.phase ? await choice(T, "Phase", row.phase) : null,
    "Roadmap Stage": row.stage ? await choice(T, "Roadmap Stage", row.stage) : null,
    "Roadmap Status": row.status ? await choice(T, "Roadmap Status", row.status) : null,
    "Due Date": row.date,
  };
}

/* ---------------------------------------------------------------- route plumbing */
export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw bad("Request body must be JSON");
  }
}

/** Runs a route body and turns errors into { error } JSON with the Airtable status (never leaks the token). */
export async function handle(fn: () => Promise<unknown>) {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    const status = e instanceof AirtableError ? e.status : 500;
    const msg = e instanceof Error ? e.message : String(e);
    if (status >= 500) console.error("[api/pics]", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
