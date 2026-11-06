/* Choice lists for the P.I.C.S forms and filters. In live mode lib/pics-live.ts builds them from the Airtable
   schema (select choices) and the Departments table; SNAPSHOT_OPTIONS (the original hardcoded lists) is only
   used with snapshot data. */
import {
  APPROVAL_STATUS,
  ASSET_TYPES,
  ITEM_TYPES,
  PHASE_ORDER,
  REAL_DEPARTMENTS,
  RECORD_TYPES,
  ROADMAP_STATUS,
  ROADMAP_TYPES,
  STAGES,
  TASK_STATUS,
} from "./pics";
import { REPORT_AUDIENCE, REPORT_PERIODS, REPORT_STATUS, REPORT_TYPES } from "./pics-reports";
import type { PicsOptions } from "./pics-types";

export const SNAPSHOT_OPTIONS: PicsOptions = {
  types: [...RECORD_TYPES],
  stages: [...STAGES],
  hierarchy: ["Parent", "Child", "Sub-child"],
  departments: [...REAL_DEPARTMENTS],
  roadmapTypes: [...ROADMAP_TYPES],
  roadmapStages: [...STAGES],
  roadmapStatus: [...ROADMAP_STATUS],
  phases: [...PHASE_ORDER],
  itemTypes: [...ITEM_TYPES],
  assetTypes: [...ASSET_TYPES],
  checklistStatus: [...TASK_STATUS, "In Review", "Rejected", "Approved"],
  reportTypes: [...REPORT_TYPES],
  reportStatus: [...REPORT_STATUS],
  reportPeriods: [...REPORT_PERIODS],
  reportAudience: [...REPORT_AUDIENCE],
  weekNumbers: Array.from({ length: 52 }, (_, i) => String(i + 1)),
};

/* The single Airtable checklist "Status" is shown as a task status + an approval status. */
const APPROVAL_CHOICES = ["In Review", "Approved", "Rejected"];
/** Task-status choices: the Airtable checklist Status choices that aren't approval states. */
export const taskStatusOptions = (o: PicsOptions) => {
  const l = o.checklistStatus.filter((s) => !APPROVAL_CHOICES.includes(s));
  return l.length ? l : [...TASK_STATUS];
};
/** Approval choices: "Not Started" plus whichever approval states exist on the Airtable Status field. */
export const approvalOptions = (o: PicsOptions) => {
  const has = (s: string) => o.checklistStatus.includes(s);
  const l = ["Not Started", ...(has("In Review") ? ["Review & Feedback"] : []), ...["Approved", "Rejected"].filter(has)];
  return l.length > 1 ? l : [...APPROVAL_STATUS];
};

/** Keeps a current value selectable even if it isn't (or is no longer) one of the choices. */
export const withCurrent = (list: readonly string[], v: string | undefined | null) => (v && !list.includes(v) ? [v, ...list] : [...list]);
