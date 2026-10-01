import type { PicsRecord } from "./types";

export const STAGES = [
  "Not Started",
  "Discovery",
  "Strategy & Negotiation",
  "Facilitation & Negotiation",
  "Execution",
  "Implementation",
  "Launch",
  "Engagement & Measurement",
  "Assessment",
  "Closed",
  "Paused",
  "Ongoing",
] as const;

/* Each Stage's assigned color in the live Airtable single-select field. */
export const STAGE_COLOR: Record<string, string> = {
  "Not Started": "#7B7F8C",
  Discovery: "#A97FD1",
  "Strategy & Negotiation": "#9B4FC7",
  "Facilitation & Negotiation": "#C2298A",
  Execution: "#8B2F6B",
  Implementation: "#4B3F9E",
  Launch: "#5A3FE0",
  "Engagement & Measurement": "#7C6BC7",
  Assessment: "#9B90C9",
  Closed: "#6B6E76",
  Paused: "#9A9DA6",
  Ongoing: "#D32F3F",
};

export const PICS_TYPES = ["Project", "Initiative", "Campaign", "Sprint", "All"] as const;

export const TYPE_TONE: Record<string, string> = {
  Project: "bg-brand-soft text-brand",
  Initiative: "bg-[#ffe9dc] text-[#b4461a]",
  Campaign: "bg-[#fde4ee] text-[#b02a62]",
  Sprint: "bg-teal-soft text-teal",
};

/* Roadmap row Type → timeline marker. */
export function markerFor(type: string): { glyph: string; color: string } {
  if (type === "Milestone") return { glyph: "M", color: "#eb6834" };
  if (type === "Sprint") return { glyph: "S", color: "#9b4dca" };
  if (type === "Meeting") return { glyph: "•", color: "#0e8f82" };
  return { glyph: "", color: "#5b2be0" };
}

export const PHASE_ORDER = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];

export const ROADMAP_TYPES = ["Task", "Subtask", "Sprint", "Milestone", "Feedback & Review", "Assessment", "Initiation", "Closed"];
export const CHECK_STATUS = ["done", "overdue", "upcoming"] as const;
export const TASK_STATUS = ["Not Started", "In Progress", "Completed", "Blocked"];
export const APPROVAL_STATUS = ["Not Started", "Review & Feedback", "Approved", "Rejected"];
export const ASSET_TYPES = ["Web", "Report", "Feature", "Code", "Video", "Document"];
export const ITEM_TYPES = ["Task", "Deliverable"];

/* Real P.I.C.S "Hierarchy" field: Parent / Child / Sub-child. */
export function relationship(r: PicsRecord, byId: Record<string, PicsRecord>): string | null {
  const parent = r.parentId ? byId[r.parentId] : undefined;
  if (r.hierarchy === "Sub-child" && parent) return `Sub-child of ${parent.name}`;
  if (parent) return `Child of ${parent.name}`;
  if (r.childIds?.length) return `Parent · ${r.childIds.length} child record${r.childIds.length === 1 ? "" : "s"}`;
  return null;
}

export function phaseCount(r: PicsRecord): number {
  return new Set(r.roadmapRows.map((x) => x.phase).filter(Boolean)).size;
}
