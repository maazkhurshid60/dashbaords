/* Shapes mirror the Airtable tables behind the VCG Intranet dashboards. */

export type PicsType = "Project" | "Initiative" | "Campaign" | "Sprint";

export interface RoadmapRow {
  label: string;
  type: string;
  date: string;
  phase?: string;
  stage?: string;
  status?: string;
}

export interface PicsMeeting {
  label: string;
  date: string;
  link?: string;
  duration?: number;
  facilitator?: string;
  prepStatus?: string;
  objective?: string;
}

export interface ChecklistItem {
  item: string;
  due: string | null;
  done: string | null;
  status: "done" | "overdue" | "upcoming";
  taskStatus?: string;
  itemType?: string;
  approvalStatus?: string;
  assetType?: string;
  complete?: boolean;
  overdue?: boolean;
  notes?: string;
}

export interface ReviewActivity {
  label: string;
  status: string;
}

export interface ReviewRound {
  name: string;
  roundNumber?: number;
  roundType?: string;
  status: string;
  due?: string;
  reviewer?: string;
  reviewUrl?: string;
  attachment?: string;
  reviewNotes?: string;
  reviewActions?: string;
  feedbackUrls?: string[];
  activities?: ReviewActivity[];
}

export interface PicsRecord {
  id: string;
  type: PicsType;
  name: string;
  stage: string;
  depts: string[];
  start: string;
  end: string;
  leads: { i: string }[];
  meetingCount: number;
  activityCount: number;
  parentId?: string;
  hierarchy?: "Child" | "Sub-child";
  childIds?: string[];
  roadmapRows: RoadmapRow[];
  meetings?: PicsMeeting[];
  reviewRounds?: ReviewRound[];
  checklist: ChecklistItem[];
}

export interface Member {
  id: string;
  name: string;
  role: string;
  dept: string;
  teamId: number;
  weeklyHours: number | null;
  initials: string;
}

export interface WeekMeeting {
  id: string;
  title: string;
  dt: string;
  attendees: string[];
}

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

export type StatusCode = "NS" | "P" | "C" | "NC" | "D" | "O";

export interface TaskChecklistItem {
  label: string;
  done: boolean;
  notes: string;
  statusCode?: StatusCode;
  edit?: { status: string; priority: string; due: string; notes: string };
}

export interface Checklist {
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
