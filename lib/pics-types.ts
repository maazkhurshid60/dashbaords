import type { PicsRecord } from "./types";

/* P.I.C.S-only shapes added with the v4 Operations dashboard (Reports tab, Task Planning sync, report chat). */

/** A row of the Airtable "Master Reports" table (tblRxHSe5HyDPLTZR) as shown on the P.I.C.S Reports tab. */
export interface PicsReport {
  id: string;
  title: string;
  reportType: string;
  picsId: string | null;
  ant: string;
  depts: string[];
  period: string;
  weekNumbers: string[];
  audience: string[];
  productivityTasks: number;
  date: string;
  status: string;
  preparedBy: string;
  reportRequest: string;
  deliveryLink: string;
  approved: boolean;
}

/** A row mirrored into the shared Task Planning table from a P.I.C.S Roadmaps row. */
export interface TaskPlanningEntry {
  id: string;
  picsId: string;
  picsName: string;
  title: string;
  type: string;
  date: string;
  stage?: string;
  status: string;
}

export type ChatFrom = "system" | "bot" | "user";
export interface ChatMessage {
  from: ChatFrom;
  text: string;
}

export type ReportChatStep = "title" | "type" | "depts" | "period" | "audience" | "request" | "confirm" | "edit" | "done";

export interface ReportDraft {
  title?: string;
  reportType?: string;
  depts?: string[];
  period?: string;
  audience?: string[];
  reportRequest?: string;
}

export interface ReportChatState {
  step: ReportChatStep;
  draft: ReportDraft;
  messages: ChatMessage[];
  started: boolean;
  lastReportId: string | null;
}

/** Everything the P.I.C.S Operations page loads (live from Airtable or the bundled snapshot). */
export interface PicsData {
  records: PicsRecord[];
  reports: PicsReport[];
  options: PicsOptions;
}

/** Choice lists for forms and filters. Live: the Airtable select choices (trimmed) + Departments table
    records; snapshot: the hardcoded lists in lib/pics.ts / lib/pics-reports.ts (SNAPSHOT_OPTIONS). */
export interface PicsOptions {
  /** P.I.C.S Type / Stage / Hierarchy. */
  types: string[];
  stages: string[];
  hierarchy: string[];
  /** Departments table names. */
  departments: string[];
  /** P.I.C.S Roadmaps Roadmap Type / Roadmap Stage / Roadmap Status / Phase. */
  roadmapTypes: string[];
  roadmapStages: string[];
  roadmapStatus: string[];
  phases: string[];
  /** P.I.C.S Checklist Item Type / Deliverable (Asset) Type / Status. */
  itemTypes: string[];
  assetTypes: string[];
  checklistStatus: string[];
  /** Master Reports Report Type / Status / Reporting Period / Report Audience / Week Number. */
  reportTypes: string[];
  reportStatus: string[];
  reportPeriods: string[];
  reportAudience: string[];
  weekNumbers: string[];
}
