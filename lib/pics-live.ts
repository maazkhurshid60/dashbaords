import "server-only";
import { getSchema, listRecords, withFallback, links, num, str, type AtRecord, type Fields, type TableSchema } from "./airtable.server";
import { SNAPSHOT_OPTIONS } from "./pics-options";
import { PICS_SEED } from "./pics-records";
import { MASTER_REPORTS_SEED } from "./pics-reports-data";
import type { PicsData, PicsOptions, PicsReport } from "./pics-types";
import type { ChecklistItem, PicsMeeting, PicsRecord, PicsType, ReviewRound, RoadmapRow } from "./types";

/* Live read of the P.I.C.S Operations dashboard from the VCG Intranet Airtable base.
   Maps the Airtable tables into the same shapes the snapshot modules use (PicsRecord, PicsReport),
   resolving linked records (departments, team members, roadmaps, checklists, meetings, review rounds)
   by record ID. On any failure withFallback() serves the bundled snapshot instead. */

export const PICS_TABLES = {
  pics: "tblbiIHxN97iyltFY",
  checklist: "tbl8Nm9AL749eBLZC",
  roadmaps: "tblTo1C185aBEIshk",
  reports: "tblRxHSe5HyDPLTZR",
  departments: "tblC2JxYOcofjMbFm",
  team: "tbl35kTjgPye2KTQ0",
  meetings: "tblyZdGQL8wmwiG6N",
  reviews: "tblh2CY3dxTaXlUfm",
  ants: "tbldfHdLTG8FEIY1f",
} as const;

/* Field names read per table (only what the dashboard shows). */
const F = {
  pics: [
    "P.I.C.S Name", "Type", "Stage", "Project Leads", "Related Department(s)", "Start Date", "End Date", "Overview", "Stakeholders",
    "Related Meetings", "Meetings Master", "Related P.I.C.S Roadmap Blocks", "Related Feedback & Review Rounds", "Assigned Tasks",
    "Briefing Link", "Hierarchy", "Related Parent/Child/Subchild", "Live Site URL", "Active", "Related P.I.C.S Checklists", "P.I.C.S Tag",
  ],
  checklist: ["Checklist Item Name", "Item Type", "Deliverable (Asset) Type", "Due Date", "Status", "Approved Date & Time", "OPANT Notes"],
  roadmaps: ["P.I.C.S Roadmap Phase Title", "Related P.I.C.S", "Roadmap Type", "Phase", "Roadmap Stage", "Roadmap Status", "Start Date", "Due Date"],
  reports: [
    "Report Title", "Report Type", "Prepared By", "Related Department(s)", "Report Audience", "Date Created", "Reporting Period", "Week Number",
    "Status", "Report Request", "Related ANT", "Delivery Link", "Related Roadmaps", "This Week's Activity", "Approved",
  ],
  meetings: ["Meeting Title", "Meeting Status", "Meeting Date & Time", "Facilitator", "Meeting Location / Link", "Meeting Objectives", "Meeting Duration (Minutes)"],
  reviews: [
    "Feedback & Review Title", "Round Number", "Round Type", "Status", "Due Date", "Reviewer(s)", "Related Checklist", "Review Atachments",
    "Review URLs", "Review Notes", "Review Actions", "Feedback URLs",
  ],
} as const;

const TASK_STATUS = ["Not Started", "In Progress", "Completed", "Blocked"];

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const day = (v: unknown) => str(v).slice(0, 10);
const lines = (v: unknown) =>
  str(v)
    .split(/[\n,\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s));

/* Many meeting links are stored without a scheme ("meet.google.com/abc-defg-hij"); make them absolute so
   window.open doesn't treat them as a path on this site. Non-URL text (a room name) is dropped. */
const webUrl = (s: string) => {
  const v = s.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v) ? `https://${v}` : undefined;
};

/** Lookups shared by the read mapping and the write routes (names of linked team members/departments). */
export interface Lookups {
  team: Map<string, string>;
  depts: Map<string, string>;
}

export async function loadLookups(): Promise<Lookups> {
  const [team, depts] = await Promise.all([
    listRecords(PICS_TABLES.team, { fields: ["Name"] }),
    listRecords(PICS_TABLES.departments, { fields: ["Department Name"] }),
  ]);
  return {
    team: new Map(team.map((r) => [r.id, str(r.fields["Name"]).trim()])),
    depts: new Map(depts.map((r) => [r.id, str(r.fields["Department Name"]).trim()])),
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/* ---------------------------------------------------------------- per-table mappers */

/* Airtable "Status" (Not Started | In Progress | Completed | Blocked | In Review | Rejected | Approved) →
   the dashboard's task status / approval status / done-overdue-upcoming triple. */
export function mapChecklist(r: AtRecord): ChecklistItem {
  const f = r.fields;
  const at = str(f["Status"]) || "Not Started";
  const due = day(f["Due Date"]) || null;
  const complete = at === "Completed" || at === "Approved";
  const done = complete ? day(f["Approved Date & Time"]) || due || today() : null;
  const status: ChecklistItem["status"] = complete ? "done" : due && due < today() ? "overdue" : "upcoming";
  return {
    item: str(f["Checklist Item Name"]) || "(untitled checklist item)",
    due,
    done,
    status,
    taskStatus: TASK_STATUS.includes(at) ? at : at === "Approved" ? "Completed" : "In Progress",
    approvalStatus: at === "In Review" ? "Review & Feedback" : at === "Approved" ? "Approved" : at === "Rejected" ? "Rejected" : "Not Started",
    itemType: str(f["Item Type"]) || "Task",
    assetType: str(f["Deliverable (Asset) Type"]) || undefined,
    complete,
    overdue: status === "overdue",
    notes: str(f["OPANT Notes"]),
    atId: r.id,
  };
}

export function mapRoadmap(r: AtRecord): RoadmapRow | null {
  const f = r.fields;
  const date = day(f["Due Date"]) || day(f["Start Date"]);
  const label = str(f["P.I.C.S Roadmap Phase Title"]).trim();
  if (!date && !label) return null; // blank rows
  return {
    label: label || "(untitled roadmap item)",
    type: str(f["Roadmap Type"]) || "Task",
    date: date || day(r.createdTime),
    phase: str(f["Phase"]) || undefined,
    stage: str(f["Roadmap Stage"]).trim() || undefined,
    status: str(f["Roadmap Status"]).trim() || undefined,
    atId: r.id,
  };
}

function mapMeeting(r: AtRecord, L: Lookups): PicsMeeting | null {
  const f = r.fields;
  const date = str(f["Meeting Date & Time"]);
  if (!date) return null;
  return {
    label: str(f["Meeting Title"]) || "(untitled meeting)",
    date,
    link: webUrl(str(f["Meeting Location / Link"])),
    duration: num(f["Meeting Duration (Minutes)"]) ?? undefined,
    facilitator: links(f["Facilitator"]).map((id) => L.team.get(id)).filter(Boolean).join(", ") || undefined,
    prepStatus: str(f["Meeting Status"]) || undefined,
    objective: str(f["Meeting Objectives"]) || undefined,
  };
}

function mapReview(r: AtRecord, L: Lookups, checklist: Map<string, AtRecord>): ReviewRound {
  const f = r.fields;
  const att = Array.isArray(f["Review Atachments"]) ? (f["Review Atachments"] as { filename?: string }[]) : [];
  return {
    name: str(f["Feedback & Review Title"]) || "(untitled review round)",
    roundNumber: num(f["Round Number"]) ?? undefined,
    roundType: str(f["Round Type"]) || undefined,
    status: str(f["Status"]) || "Not Started",
    due: day(f["Due Date"]) || undefined,
    reviewer: links(f["Reviewer(s)"]).map((id) => L.team.get(id)).filter(Boolean).join(", ") || undefined,
    reviewUrl: lines(f["Review URLs"])[0],
    attachment: att[0]?.filename,
    reviewNotes: str(f["Review Notes"]) || undefined,
    reviewActions: str(f["Review Actions"]) || undefined,
    feedbackUrls: lines(f["Feedback URLs"]),
    activities: links(f["Related Checklist"])
      .map((id) => checklist.get(id))
      .filter((c): c is AtRecord => !!c)
      .map((c) => ({ label: str(c.fields["Checklist Item Name"]), status: str(c.fields["Status"]) || "Not Started", atId: c.id })),
  };
}

export interface RelatedIndex {
  checklist: Map<string, AtRecord>;
  roadmaps: Map<string, AtRecord>;
  meetings: Map<string, AtRecord>;
  reviews: Map<string, AtRecord>;
}

const pick = <T,>(ids: string[], m: Map<string, AtRecord>, fn: (r: AtRecord) => T | null) =>
  ids.map((id) => m.get(id)).filter((r): r is AtRecord => !!r).map(fn).filter((x): x is T => x != null);

/** One P.I.C.S row → PicsRecord. parentId/childIds are fixed up across all records by the caller. */
export function mapPics(r: AtRecord, L: Lookups, I: RelatedIndex): PicsRecord {
  const f = r.fields;
  const name = str(f["P.I.C.S Name"]).trim() || "(untitled P.I.C.S)";
  const t = str(f["Type"]) as PicsType;
  const start = day(f["Start Date"]) || day(r.createdTime);
  const leads = links(f["Project Leads"]).map((id) => {
    const n = L.team.get(id) ?? "";
    return { i: n ? initialsOf(n) : "?", name: n || undefined };
  });
  const meetingIds = [...new Set([...links(f["Related Meetings"]), ...links(f["Meetings Master"])])];
  const meetings = pick(meetingIds, I.meetings, (m) => mapMeeting(m, L));
  const checklist = pick(links(f["Related P.I.C.S Checklists"]), I.checklist, mapChecklist).sort((a, b) =>
    (a.due ?? "9999").localeCompare(b.due ?? "9999"),
  );
  const hierarchy = str(f["Hierarchy"]);
  const rec: PicsRecord = {
    id: r.id,
    // Any Airtable Type choice is kept (new choices show up as-is); a blank Type falls back by name.
    type: t ? t : /\bBAU\b/i.test(name) ? "BAU" : "Project",
    name,
    stage: str(f["Stage"]).trim() || "Not Started",
    depts: links(f["Related Department(s)"]).map((id) => L.depts.get(id)).filter((d): d is string => !!d),
    start,
    end: day(f["End Date"]) || start,
    leads: leads.length ? leads : [{ i: "—" }],
    meetingCount: meetings.length,
    activityCount: links(f["Assigned Tasks"]).length,
    roadmapRows: pick(links(f["Related P.I.C.S Roadmap Blocks"]), I.roadmaps, mapRoadmap).sort((a, b) => a.date.localeCompare(b.date)),
    meetings,
    reviewRounds: pick(links(f["Related Feedback & Review Rounds"]), I.reviews, (x) => mapReview(x, L, I.checklist)),
    checklist,
    overview: str(f["Overview"]) || undefined,
    stakeholders: str(f["Stakeholders"]) || undefined,
    briefingLink: str(f["Briefing Link"]) || null,
    liveSiteUrl: str(f["Live Site URL"]) || null,
    active: f["Active"] === true,
    tag: str(f["P.I.C.S Tag"]) || undefined,
  };
  if (hierarchy === "Parent" || hierarchy === "Child" || hierarchy === "Sub-child") rec.hierarchy = hierarchy;
  // "Related Parent/Child/Subchild" on a Child / Sub-child row points at its parent.
  const up = links(f["Related Parent/Child/Subchild"])[0];
  if (up && hierarchy !== "Parent") rec.parentId = up;
  return rec;
}

function mapReport(r: AtRecord, L: Lookups, ants: Map<string, string>, roadmaps: Map<string, AtRecord>, picsIds: Set<string>): PicsReport {
  const f = r.fields;
  // Master Reports has no direct P.I.C.S link: resolve it through "Related Roadmaps" → roadmap's "Related P.I.C.S".
  const viaRoadmap = links(f["Related Roadmaps"]).flatMap((id) => links(roadmaps.get(id)?.fields["Related P.I.C.S"]));
  const status = str(f["Status"]) || "Not Started";
  return {
    id: r.id,
    title: str(f["Report Title"]) || "(untitled report)",
    reportType: str(f["Report Type"]) || "—",
    picsId: viaRoadmap.find((id) => picsIds.has(id)) ?? null,
    ant: links(f["Related ANT"]).map((id) => ants.get(id)).filter(Boolean).join(", "),
    depts: links(f["Related Department(s)"]).map((id) => L.depts.get(id)).filter((d): d is string => !!d),
    period: str(f["Reporting Period"]) || "—",
    weekNumbers: Array.isArray(f["Week Number"]) ? (f["Week Number"] as unknown[]).map(str) : [],
    audience: Array.isArray(f["Report Audience"]) ? (f["Report Audience"] as unknown[]).map(str) : [],
    productivityTasks: links(f["This Week's Activity"]).length,
    date: day(f["Date Created"]) || day(r.createdTime),
    status,
    preparedBy: links(f["Prepared By"]).map((id) => initialsOf(L.team.get(id) ?? "?")).join(", ") || "—",
    reportRequest: str(f["Report Request"]),
    deliveryLink: str(f["Delivery Link"]),
    approved: f["Approved"] === true || status === "Approved",
  };
}

/* ---------------------------------------------------------------- loader */

const index = (rows: AtRecord<Fields>[]) => new Map(rows.map((r) => [r.id, r]));

/* ---------------------------------------------------------------- options (select choices) */

/** Trimmed, de-duplicated choice names of a select field ("Execution " → "Execution"); the write routes map a
    trimmed name back to the exact Airtable choice. Falls back to the snapshot list if the field is missing. */
function choicesOf(schema: TableSchema[], tableId: string, field: string, fallback: string[]): string[] {
  const f = schema.find((t) => t.id === tableId)?.fields.find((x) => x.name === field);
  const names = f?.options?.choices?.map((c) => c.name.trim()).filter(Boolean);
  return names?.length ? [...new Set(names)] : fallback;
}

function buildOptions(schema: TableSchema[], L: Lookups): PicsOptions {
  const T = PICS_TABLES;
  const S = SNAPSHOT_OPTIONS;
  const c = (t: string, f: string, fb: string[]) => choicesOf(schema, t, f, fb);
  const depts = [...new Set([...L.depts.values()].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return {
    types: c(T.pics, "Type", S.types),
    stages: c(T.pics, "Stage", S.stages),
    hierarchy: c(T.pics, "Hierarchy", S.hierarchy),
    departments: depts.length ? depts : S.departments,
    roadmapTypes: c(T.roadmaps, "Roadmap Type", S.roadmapTypes),
    roadmapStages: c(T.roadmaps, "Roadmap Stage", S.roadmapStages),
    roadmapStatus: c(T.roadmaps, "Roadmap Status", S.roadmapStatus),
    phases: c(T.roadmaps, "Phase", S.phases),
    itemTypes: c(T.checklist, "Item Type", S.itemTypes),
    assetTypes: c(T.checklist, "Deliverable (Asset) Type", S.assetTypes),
    checklistStatus: c(T.checklist, "Status", S.checklistStatus),
    reportTypes: c(T.reports, "Report Type", S.reportTypes),
    reportStatus: c(T.reports, "Status", S.reportStatus),
    reportPeriods: c(T.reports, "Reporting Period", S.reportPeriods),
    reportAudience: c(T.reports, "Report Audience", S.reportAudience),
    weekNumbers: c(T.reports, "Week Number", S.weekNumbers),
  };
}

async function load(): Promise<PicsData> {
  const [schema, L, pics, checklist, roadmaps, meetings, reviews, reports, ants] = await Promise.all([
    getSchema(),
    loadLookups(),
    listRecords(PICS_TABLES.pics, { fields: [...F.pics] }),
    listRecords(PICS_TABLES.checklist, { fields: [...F.checklist] }),
    listRecords(PICS_TABLES.roadmaps, { fields: [...F.roadmaps] }),
    listRecords(PICS_TABLES.meetings, { fields: [...F.meetings] }),
    listRecords(PICS_TABLES.reviews, { fields: [...F.reviews] }),
    listRecords(PICS_TABLES.reports, { fields: [...F.reports] }),
    listRecords(PICS_TABLES.ants, { fields: ["ANT Name"] }),
  ]);
  const I: RelatedIndex = { checklist: index(checklist), roadmaps: index(roadmaps), meetings: index(meetings), reviews: index(reviews) };
  const records = pics.map((r) => mapPics(r, L, I));

  // Children are derived from each child's parent link (the inverse field is only partly filled).
  const byId = new Map(records.map((r) => [r.id, r]));
  for (const r of records) {
    if (r.parentId && !byId.has(r.parentId)) delete r.parentId;
    if (r.parentId) {
      const p = byId.get(r.parentId)!;
      (p.childIds ??= []).push(r.id);
    }
  }

  const antNames = new Map(ants.map((r) => [r.id, str(r.fields["ANT Name"])]));
  const picsIds = new Set(byId.keys());
  return {
    records,
    reports: reports.map((r) => mapReport(r, L, antNames, I.roadmaps, picsIds)),
    options: buildOptions(schema, L),
  };
}

/** P.I.C.S Operations data: live from Airtable, or the bundled snapshot if Airtable can't be read. */
export function loadPics() {
  return withFallback(load, () => ({
    records: structuredClone(PICS_SEED),
    reports: structuredClone(MASTER_REPORTS_SEED),
    options: structuredClone(SNAPSHOT_OPTIONS),
  }));
}
