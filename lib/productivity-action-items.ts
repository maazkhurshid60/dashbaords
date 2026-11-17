import "server-only";
import { type Audit, AirtableError, BASE_ID, type Fields, arr, bool, createRecord, deleteRecord, getSchema, links, str, updateRecord } from "@/lib/airtable.server";
import { PT } from "@/lib/productivity-fields";
import { BadRequest } from "@/lib/productivity-write";
import type { ActionItem, ActionItemsPayload, ActionItemInput, RoadmapOption } from "@/lib/productivity-action-types";

/* Meeting card › Action items (PROD-7 → PROD-12). Reads are uncached (the SUCANT automation
   writes behind Next's cache); writes go through airtable.server with explicit allow-lists
   and the audit tag so each one lands in the Dashboard Sync Queue. Field names / choices
   checked against GET meta/bases/appLH1D7ME6mU1zgE/tables on 2026-11-18. */

export const ROADMAPS = "tblTo1C185aBEIshk";
export const AUDIT: Audit = { dashboard: "Productivity Center", area: "Meeting card · Action items" };

/** Tasks Planning fields this section may write. */
export const AI_TASK_WRITABLE = [
  "Task",
  "Assigned To",
  "Due Date",
  "Priority",
  "Status",
  "Completed",
  "Related Meetings",
  "Related Roadmap",
  "Related P.I.C.S",
] as const;
/** Meetings Master fields this section may write. */
export const AI_MEETING_WRITABLE = ["Sync Action Items", "Related P.I.C.S Roadmap"] as const;

/** Section 11A: upcoming meetings wrongly link their own prep task — never show it as an action item. */
const isPrepTask = (name: string) => /^\s*VCG Meeting Prep\b/i.test(name);

async function get(path: string): Promise<{ id: string; fields: Fields; offset?: string; records?: { id: string; fields: Fields }[] }> {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new AirtableError("Airtable is not configured", 503);
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new AirtableError(`Airtable ${res.status}`, res.status === 404 ? 404 : 502);
  return res.json();
}

async function listAll(tableId: string, query: string) {
  const out: { id: string; fields: Fields }[] = [];
  let offset = "";
  do {
    const j = await get(`${tableId}?pageSize=100${query}${offset ? `&offset=${offset}` : ""}`);
    out.push(...(j.records ?? []));
    offset = j.offset ?? "";
  } while (offset);
  return out;
}

const qs = (fields: string[]) => fields.map((f) => `&fields%5B%5D=${encodeURIComponent(f)}`).join("");
const recIdOk = (id: string) => /^rec[A-Za-z0-9]{14}$/.test(id);
export function assertRec(id: unknown, what: string): string {
  if (typeof id !== "string" || !recIdOk(id)) throw new BadRequest(`Bad ${what} id`);
  return id;
}

export async function readMeeting(id: string) {
  assertRec(id, "meeting");
  const r = await get(`${PT.meetings}/${id}`);
  const f = r.fields;
  return {
    actionItemIds: links(f["Action Items"]),
    syncing: bool(f["Sync Action Items"]),
    recapUrl: str(f["Recap URL"]),
    summary: str(f["Action Item Summary"]),
    roadmapId: links(f["Related P.I.C.S Roadmap"])[0] ?? null,
  };
}

async function roadmapOptions(): Promise<RoadmapOption[]> {
  const rows = await listAll(ROADMAPS, qs(["P.I.C.S Roadmap Phase Title", "Related P.I.C.S", "P.I.C.S Tag"]));
  return rows
    .map((r) => ({
      id: r.id,
      title: str(r.fields["P.I.C.S Roadmap Phase Title"]),
      tag: str(r.fields["P.I.C.S Tag"]),
      picsId: links(r.fields["Related P.I.C.S"])[0] ?? null,
    }))
    .filter((r) => r.title)
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function memberOptions() {
  const rows = await listAll(PT.members, qs(["Name"]));
  return rows.map((r) => ({ id: r.id, name: str(r.fields.Name) })).filter((m) => m.name).sort((a, b) => a.name.localeCompare(b.name));
}

async function readTasks(ids: string[], roadmaps: RoadmapOption[], members: Map<string, string>): Promise<ActionItem[]> {
  if (!ids.length) return [];
  const out: ActionItem[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const formula = `OR(${chunk.map((id) => `RECORD_ID()='${id}'`).join(",")})`;
    const rows = await listAll(
      PT.tasks,
      `&filterByFormula=${encodeURIComponent(formula)}` + qs(["Task", "Assigned To", "Due Date", "Priority", "Status", "Completed", "Related Roadmap"]),
    );
    for (const r of rows) {
      const task = str(r.fields.Task);
      if (isPrepTask(task)) continue;
      const rmId = links(r.fields["Related Roadmap"])[0] ?? null;
      const rm = rmId ? roadmaps.find((x) => x.id === rmId) : undefined;
      const owners = links(r.fields["Assigned To"]);
      out.push({
        id: r.id,
        task,
        ownerId: owners[0] ?? null,
        owner: owners.map((o) => members.get(o)).filter(Boolean).join(", ") || null,
        due: str(r.fields["Due Date"]) || null,
        priority: str(r.fields.Priority) || null,
        status: str(r.fields.Status) || null,
        completed: bool(r.fields.Completed),
        roadmapId: rmId,
        roadmapTag: rm ? rm.tag || rm.title : null,
      });
    }
  }
  return out.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}

/** Lines of the recap's Action Item Summary that do not match a task already on the card. */
function pendingFromRecap(summary: string, items: ActionItem[]): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const have = items.map((i) => norm(i.task));
  return summary
    .split(/\r?\n/)
    .map((l) => norm(l.replace(/^\s*([-*•]|\d+[.)])\s*/, "")))
    .filter((l) => l.length > 3 && !have.some((h) => h && (h.includes(l) || l.includes(h)))).length;
}

export async function loadActionItems(meetingId: string): Promise<ActionItemsPayload> {
  const [m, roadmaps, memberList] = await Promise.all([readMeeting(meetingId), roadmapOptions(), memberOptions()]);
  const members = new Map(memberList.map((x) => [x.id, x.name]));
  const items = await readTasks(m.actionItemIds, roadmaps, members);
  return {
    items,
    syncing: m.syncing,
    recapAvailable: !!(m.recapUrl || m.summary),
    recapPending: m.summary ? pendingFromRecap(m.summary, items) > 0 : false,
    roadmapId: m.roadmapId,
    roadmaps,
    members: memberList,
    statuses: await choices("Status"),
    priorities: await choices("Priority"),
    syncedAt: new Date().toISOString(),
  };
}

async function choices(field: string): Promise<string[]> {
  const t = (await getSchema()).find((x) => x.id === PT.tasks);
  return (t?.fields.find((f) => f.name === field)?.options?.choices ?? []).map((c) => c.name).filter((n) => n.trim() && !n.startsWith("sel"));
}

async function checkSelects(fields: Fields) {
  for (const k of ["Status", "Priority"]) {
    const v = fields[k];
    if (v != null && !(await choices(k)).includes(String(v))) throw new BadRequest(`"${String(v)}" is not a ${k} option`);
  }
}

async function roadmapById(id: string | null | undefined) {
  if (!id) return null;
  assertRec(id, "roadmap");
  const r = await get(`${ROADMAPS}/${id}`);
  return { id, picsId: links(r.fields["Related P.I.C.S"])[0] ?? null };
}

/** Semantic form body → Tasks Planning fields (only the keys present). */
async function taskFields(b: ActionItemInput): Promise<Fields> {
  const f: Fields = {};
  if (b.task !== undefined) {
    if (typeof b.task !== "string" || !b.task.trim() || b.task.length > 500) throw new BadRequest("Action item is required");
    f.Task = b.task.trim();
  }
  if (b.ownerId !== undefined) f["Assigned To"] = b.ownerId ? [assertRec(b.ownerId, "owner")] : [];
  if (b.due !== undefined) {
    if (b.due && !/^\d{4}-\d{2}-\d{2}$/.test(b.due)) throw new BadRequest("Due date must be YYYY-MM-DD");
    f["Due Date"] = b.due || null;
  }
  if (b.priority !== undefined) f.Priority = b.priority || null;
  if (b.status !== undefined) {
    f.Status = b.status || null;
    f.Completed = b.status === "Completed";
  }
  if (b.roadmapId !== undefined) {
    const rm = await roadmapById(b.roadmapId);
    f["Related Roadmap"] = rm ? [rm.id] : [];
    f["Related P.I.C.S"] = rm?.picsId ? [rm.picsId] : [];
  }
  await checkSelects(f);
  return f;
}

export async function createActionItem(meetingId: string, b: ActionItemInput) {
  assertRec(meetingId, "meeting");
  if (b.task === undefined) throw new BadRequest("Action item is required");
  const f = await taskFields(b);
  f["Related Meetings"] = [meetingId];
  return createRecord(PT.tasks, f, AI_TASK_WRITABLE, false, AUDIT);
}

export async function updateActionItem(taskId: string, b: ActionItemInput) {
  assertRec(taskId, "task");
  const f = await taskFields(b);
  if (!Object.keys(f).length) throw new BadRequest("Nothing to update");
  return updateRecord(PT.tasks, taskId, f, AI_TASK_WRITABLE, false, AUDIT);
}

/** "Remove from this meeting": unlink Related Meetings only; the task itself stays. */
export async function unlinkActionItem(taskId: string, meetingId: string) {
  assertRec(taskId, "task");
  assertRec(meetingId, "meeting");
  const t = await get(`${PT.tasks}/${taskId}`);
  const rest = arr(t.fields["Related Meetings"]).filter((x) => x !== meetingId);
  return updateRecord(PT.tasks, taskId, { "Related Meetings": rest }, AI_TASK_WRITABLE, false, AUDIT);
}

export async function deleteActionItem(taskId: string) {
  assertRec(taskId, "task");
  return deleteRecord(PT.tasks, taskId, AUDIT);
}

/** PROD-8: tick Sync Action Items; SUCANT creates/links the Tasks Planning rows and unticks it. */
export async function triggerRecapSync(meetingId: string) {
  const m = await readMeeting(meetingId);
  if (!m.recapUrl && !m.summary) throw new BadRequest("Available after recap");
  return updateRecord(PT.meetings, meetingId, { "Sync Action Items": true }, AI_MEETING_WRITABLE, false, AUDIT);
}

/** PROD-9: save the meeting's roadmap and re-point every linked (non-prep) task at it. */
export async function syncToRoadmap(meetingId: string, roadmapId: string | null) {
  const m = await readMeeting(meetingId);
  const rm = await roadmapById(roadmapId);
  await updateRecord(PT.meetings, meetingId, { "Related P.I.C.S Roadmap": rm ? [rm.id] : [] }, AI_MEETING_WRITABLE, false, AUDIT);
  const tasks = await readTasks(m.actionItemIds, [], new Map());
  for (const t of tasks)
    await updateRecord(
      PT.tasks,
      t.id,
      { "Related Roadmap": rm ? [rm.id] : [], "Related P.I.C.S": rm?.picsId ? [rm.picsId] : [] },
      AI_TASK_WRITABLE,
      false,
      AUDIT,
    );
  return tasks.length;
}
