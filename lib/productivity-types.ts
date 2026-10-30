/* Shapes behind the Productivity Center (VCG Intranet Airtable base). Mirrors the
   constants in the v3 dashboard script; see lib/productivity-data.ts for provenance. */

export interface Member {
  id: string;
  name: string;
  role: string;
  dept: string;
  teamId: number;
  weeklyHours: number | null;
  initials: string;
}

/** Team Members directory row (Team Member ID + Email may be unset in Airtable). */
export interface DirectoryEntry {
  name: string;
  teamMemberId: number | null;
  email: string | null;
}

/** Tasks Planning record. */
export interface PlanningTask {
  id: string;
  task: string;
  due: string;
  assignees: string[];
  status: string;
  priority: string | null;
  week: string | null;
  taskDetails: string | null;
  relatedMeetings: string[];
}

/** Meetings Master record. `dt` is UTC; shown in Eastern time. */
export interface Meeting {
  id: string;
  title: string;
  dt: string;
  depts: string[];
  attendees: string[];
  facilitator: string | null;
  agendaReady: boolean;
  agendaApproved: boolean;
  agendaApprover: string | null;
  recapReady: boolean;
  recapApproved: boolean;
  recapApprover: string | null;
  objectives: string;
  prepStatus: string | null;
  agendaUrl: string | null;
  recapUrl: string | null;
  meetingType: string | null;
  locationLink: string | null;
  durationMinutes: number | null;
  agendaAssignee: string | null;
  recapAssignee: string | null;
  actionItems: string[];
}

export type ReviewKind = "agenda" | "recap";

export interface ScheduleTask {
  label: string;
  type: string;
  status: string;
  priority: string;
  start: string;
  due: string;
  details?: string;
  notes?: string;
}

export interface Schedule {
  id: string;
  memberId: string;
  member: string;
  initials: string;
  weekId: string;
  weekStart: string;
  hours: number | null;
  checklistId: string | null;
  tasks: ScheduleTask[];
}

/** 6-way checklist status: Not Started / Paused / Completed / Not Completed / Delayed / Overdue. */
export type StatusCode = "NS" | "P" | "C" | "NC" | "D" | "O";

export interface TaskEdit {
  status: string;
  priority: string;
  due: string;
  notes: string;
}

export interface TaskChecklistItem {
  label: string;
  done: boolean;
  notes: string;
  statusCode?: StatusCode;
  edit?: TaskEdit;
}

export interface ChecklistRecord {
  id: string;
  checklistId: string;
  member: string;
  approval: string;
  submitted: boolean;
  submittedAt: string | null;
  summary: string;
  items: TaskChecklistItem[];
  managerNotes: string;
}

export interface MasterReport {
  id: string;
  title: string;
  type: string;
  dept: string;
  date: string;
  status: string;
  hasContent: boolean;
  contentKey?: string;
  weekNumber: number | null;
  preparedBy: string;
  reportingPeriod: string;
  approved: boolean;
}

export interface ReportContent {
  reportTitle: string;
  reportDate: string;
  html: string;
}
