/* The sections ("sub-pages") of the Operations dashboard. The active one lives in the URL (?tab=meetings),
   so each section has its own link and the browser back button works. Shared by the server page and the client component. */
export const PICS_TABS = [
  ["overview", "Overview"],
  ["records", "Records"],
  ["checklists", "Checklists"],
  ["meetings", "Meetings"],
  ["calendar", "Calendar"],
  ["reports", "Reports"],
] as const;

export type PicsTab = (typeof PICS_TABS)[number][0];

export const isPicsTab = (v: unknown): v is PicsTab => PICS_TABS.some(([k]) => k === v);
