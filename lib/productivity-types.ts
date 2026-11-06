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
  /** Tasks Planning record ID (live data; the snapshot matches by label). */
  taskId?: string;
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
  /** Tasks Planning record behind this item (live data only). Writes go to this record. */
  taskId?: string;
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
  /** Team Member Notes & Observations. */
  managerNotes: string;
  /** Checklist Feedback (reviewer). Snapshot data keeps feedback in managerNotes. */
  feedback?: string;
  /** Checklist Approver names. */
  approver?: string;
  /** Week label, e.g. "Week 45". */
  week?: string;
  /** Monday (YYYY-MM-DD) of the checklist's week; null when Airtable has no week for it. */
  weekStart?: string | null;
  /** Related Goals names. */
  goals?: string[];
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

/* ---------------- whole-page bundle ---------------- */

export interface WeekInfo {
  /** ISO week number of the current Mon–Fri week. */
  number: number;
  /** "Week 45" */
  label: string;
  /** "Nov 2–6, 2026" */
  range: string;
  /** Monday of the current week, YYYY-MM-DD. */
  start: string;
  /** "November 2026" (month of today). */
  monthLong: string;
  /** "Nov 2026" */
  monthShort: string;
}

/** Everything the Productivity Center renders, from Airtable (live) or the bundled snapshot. */
export interface ProductivityData {
  /** The dataset's "today" (ISO instant); every relative view anchors here. */
  today: string;
  week: WeekInfo;
  members: Member[];
  directory: Record<string, DirectoryEntry>;
  tasksThisMonth: { total: number; byStatus: Record<string, number> };
  /** Recurring Mon–Fri hours per active member from Team Availability (null = not set). */
  availability: Record<string, (number | null)[]>;
  availabilitySet: boolean;
  /** Weekly Schedules of the active roster, 12 weeks back to 8 ahead (oldest first). */
  schedules: Schedule[];
  /** Task Checklists of the active roster for the same window, plus any checklist still awaiting review. */
  checklists: ChecklistRecord[];
  reports: MasterReport[];
  reportStatusOptions: string[];
  reportContent: Record<string, ReportContent>;
  /** Comprehensive report card: this week's Weekly Pulse record + the latest generated Pulse / ANT text. */
  comprehensive: {
    current: { title: string; status: string; contentKey: string | null } | null;
    pulse: ReportContent | null;
    ant: ReportContent | null;
  };
  tasks: PlanningTask[];
  meetings: Meeting[];
  /** Whether edits are written back to Airtable (live data) or kept in this session (snapshot). */
  writable: boolean;
}
