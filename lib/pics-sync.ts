/* ---------- TASK PLANNING SYNC ----------
   Mirrors P.I.C.S Roadmaps rows into the shared Task Planning table. Entries are shown inline as a
   "Synced" badge on each roadmap row (never as a separate global list), matching the v4 dashboard.
   Session-only: nothing is written to Airtable yet. */
import type { PicsRecord, RoadmapRow } from "./types";
import type { TaskPlanningEntry } from "./pics-types";
import { todayISO } from "./pics";

export const BAU_PICS_ID = "bau";
export const BAU_NAME = "BAU (Unassigned)";

let seq = 0;
const newId = (prefix: string) => `${prefix}_${Date.now()}_${++seq}`;

/* Catch-all P.I.C.S bucket — any task/sprint/meeting/milestone synced with no P.I.C.S link lands here.
   "BAU" is a real choice on the Airtable P.I.C.S "Type" field, so it is a normal record (Type=BAU). */
export function ensureBauPicsRecord(records: PicsRecord[]): PicsRecord[] {
  if (records.some((r) => r.id === BAU_PICS_ID)) return records;
  const today = todayISO();
  return [
    ...records,
    {
      id: BAU_PICS_ID,
      type: "BAU",
      name: BAU_NAME,
      stage: "Ongoing",
      depts: ["Operations"],
      start: today,
      end: today,
      leads: [{ i: "—" }],
      meetingCount: 0,
      activityCount: 0,
      roadmapRows: [],
      checklist: [],
      overview: "Auto-catch-all for tasks, sprints, meetings, or milestones synced from Task Planning with no P.I.C.S link.",
    },
  ];
}

/** Builds the Task Planning row for a roadmap row; a null record routes it to the BAU bucket. */
export function taskPlanningEntryFor(r: PicsRecord | null, row: RoadmapRow): TaskPlanningEntry {
  return {
    id: newId("tp"),
    picsId: r ? r.id : BAU_PICS_ID,
    picsName: r ? r.name : BAU_NAME,
    title: row.label,
    type: row.type,
    date: row.date,
    stage: row.stage,
    status: row.status || "Not Started",
  };
}

/** Mirrors one row: returns the new Task Planning entry and the row stamped with its tpId. */
export function syncRoadmapRowToTaskPlanning(r: PicsRecord | null, row: RoadmapRow) {
  const entry = taskPlanningEntryFor(r, row);
  return { entry, row: { ...row, tpId: entry.id } };
}

/** On load: every existing roadmap row (except the BAU bucket's) gets a Task Planning mirror. */
export function seedTaskPlanningFromExistingRoadmaps(records: PicsRecord[]) {
  const taskPlanning: TaskPlanningEntry[] = [];
  const out = records.map((r) => {
    if (r.id === BAU_PICS_ID) return r;
    return {
      ...r,
      roadmapRows: r.roadmapRows.map((row) => {
        const s = syncRoadmapRowToTaskPlanning(r, row);
        taskPlanning.push(s.entry);
        return s.row;
      }),
    };
  });
  return { records: out, taskPlanning };
}

/** Keeps a Task Planning mirror current after its roadmap row is edited in-session. */
export function resyncTaskPlanning(tp: TaskPlanningEntry[], r: PicsRecord, row: RoadmapRow): TaskPlanningEntry[] {
  if (!row.tpId) return tp;
  return tp.map((e) =>
    e.id === row.tpId
      ? { ...e, picsId: r.id, picsName: r.name, title: row.label, type: row.type, date: row.date, stage: row.stage, status: row.status || "Not Started" }
      : e,
  );
}
