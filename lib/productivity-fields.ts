/* Airtable tables and fields behind the Productivity Center (VCG Intranet base
   appLH1D7ME6mU1zgE). Client-safe: no token, only names. The write allow-lists below
   are the ONLY fields the /api/productivity/* routes may change; every name was checked
   against the base schema (GET /meta/bases/…/tables) on 2026-11-06. */
import type { StatusCode } from "./productivity-types";

export const PT = {
  members: "tbl35kTjgPye2KTQ0",
  schedules: "tbl8yDbF6CkIXihDv",
  checklists: "tblmyCQIYX6d58pMQ",
  tasks: "tblyOuPIvgifN4OOQ",
  meetings: "tblyZdGQL8wmwiG6N",
  reports: "tblRxHSe5HyDPLTZR",
  departments: "tblC2JxYOcofjMbFm",
  meetingTypes: "tbl7uUZWEgyAQfRAy",
  availability: "tbl7JdmLY7mlgnDKX",
  goals: "tblcSUspCdafrVNUs",
} as const;

/** Tasks Planning — checklist item status / edit panel. */
export const TASK_WRITABLE = ["Status", "Priority", "Due Date", "Notes From Assignee", "Completed", "Last Dashboard Edit At"] as const;
/** Task Checklists — notes, submit, review decision, summary trigger. */
export const CHECKLIST_WRITABLE = [
  "Team Member Notes & Observations",
  "Submit",
  "Date Submitted",
  "Checklist Status",
  "Checklist Feedback",
  "Approved",
  "Approved At",
  "Generate Checklist Summary",
] as const;
/** Meetings Master — agenda / recap approval. */
export const MEETING_WRITABLE = ["Agenda Approved", "Recap Approved"] as const;
/** Master Reports — status (Approved checkbox follows it). */
export const REPORT_WRITABLE = ["Status", "Approved", "Approved At"] as const;

/** 6-way checklist code → Tasks Planning "Status" choice. "Paused" has no Status choice (it is a Priority option), so P stays local. */
export const CODE_TO_TASK_STATUS: Record<StatusCode, string | null> = {
  NS: "Not Started",
  P: null,
  C: "Completed",
  NC: "Not Completed",
  D: "Delayed",
  O: "Overdue",
};

export const TASK_STATUS_TO_CODE: Record<string, StatusCode> = {
  "Not Started": "NS",
  Completed: "C",
  "Not Completed": "NC",
  Delayed: "D",
  Overdue: "O",
};

/** Body of PATCH /api/productivity/tasks/[id]. */
export interface TaskPatch {
  status?: string;
  priority?: string;
  due?: string;
  notes?: string;
}

/** Body of PATCH /api/productivity/checklists/[id]. */
export interface ChecklistPatch {
  notes?: string;
  submit?: boolean;
  decision?: "Approved" | "Rejected";
  feedback?: string;
  generateSummary?: boolean;
}
