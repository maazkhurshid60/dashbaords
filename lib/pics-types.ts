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
