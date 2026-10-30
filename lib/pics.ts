import type { PicsRecord } from "./types";

/* Real choices on the live Airtable "Stage" field (fld4RzSQZB9T37lRi). 'Discovery', 'Execution' and
   'Implementation' are kept for legacy seed values; 'Execution & Implementation' and 'Completed' added in v4. */
export const STAGES = [
  "Not Started",
  "Discovery",
  "Strategy & Negotiation",
  "Facilitation & Negotiation",
  "Execution",
  "Implementation",
  "Execution & Implementation",
  "Launch",
  "Engagement & Measurement",
  "Assessment",
  "Completed",
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
  "Execution & Implementation": "#4B3F9E",
  Launch: "#5A3FE0",
  "Engagement & Measurement": "#7C6BC7",
  Assessment: "#9B90C9",
  Completed: "#2E7D46",
  Closed: "#6B6E76",
  Paused: "#9A9DA6",
  Ongoing: "#D32F3F",
};

/** "Active P.I.C.S" tile + first 5 stages are shown while the stage tiles are collapsed. */
export const VISIBLE_TILE_COUNT = 6;

/* Real choices on the Airtable "Type" field (fldexMQgfdpKDmWMF); BAU and Milestone added in v4. */
export const RECORD_TYPES = ["Project", "Initiative", "Campaign", "Sprint", "BAU", "Milestone"] as const;
export const PICS_TYPES = [...RECORD_TYPES, "All"] as const;

export const TYPE_TONE: Record<string, string> = {
  Project: "bg-brand-soft text-brand",
  Initiative: "bg-[#ffe9dc] text-[#b4461a]",
  Campaign: "bg-[#fde4ee] text-[#b02a62]",
  Sprint: "bg-teal-soft text-teal",
  BAU: "bg-plane text-ink-2",
  Milestone: "bg-warn-soft text-warn",
};

/* Real "Departments" table records (tblC2JxYOcofjMbFm) — Related Department(s) multi-select. */
export const REAL_DEPARTMENTS = [
  "ANT",
  "Creative",
  "Executive",
  "External",
  "Finance",
  "HR",
  "Legal & Compliance",
  "Marketing & Sales",
  "Media (Communications)",
  "Operations",
  "PR & Media",
  "Product",
  "Production/Fabrication",
  "Social Impact",
  "Success",
];

export const HIERARCHY_OPTIONS = ["None", "Parent", "Child", "Sub-child"] as const;

/* Roadmap-row Type → timeline marker kind (Meeting rows and unknown types fall back to "task"). */
export type MarkerKind = "task" | "milestone" | "sprint" | "meeting";
const TYPE_MARKER: Record<string, MarkerKind> = {
  Task: "task",
  Subtask: "task",
  Sprint: "sprint",
  Milestone: "milestone",
  "Feedback & Review": "task",
  Assessment: "task",
  Initiation: "task",
  Closed: "task",
};
export const markerKind = (type: string): MarkerKind => TYPE_MARKER[type] ?? "task";

export const MARKER_COLOR: Record<MarkerKind, string> = {
  task: "#5b2be0",
  milestone: "#eb6834",
  sprint: "#9b4dca",
  meeting: "#0e8f82",
};
export const MARKER_GLYPH: Record<MarkerKind, string> = { task: "1", milestone: "M", sprint: "S", meeting: "•" };

/** Legacy helper: marker glyph/color for a roadmap row Type. */
export function markerFor(type: string): { glyph: string; color: string } {
  if (type === "Meeting") return { glyph: "•", color: MARKER_COLOR.meeting };
  const k = markerKind(type);
  return { glyph: k === "task" ? "" : MARKER_GLYPH[k], color: MARKER_COLOR[k] };
}

/** Week-modal type boxes: Task/Subtask, Milestone, Sprint, Meeting. */
export const ROADMAP_TYPE_KEY: { key: MarkerKind; label: string }[] = [
  { key: "task", label: "Task/Subtask" },
  { key: "milestone", label: "Milestone" },
  { key: "sprint", label: "Sprint" },
  { key: "meeting", label: "Meeting" },
];

export const PHASE_ORDER = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];

/* Roadmap Type choices editable from the dashboard (Meeting rows come from Meetings Master). */
export const ROADMAP_TYPES = ["Task", "Subtask", "Sprint", "Milestone", "Feedback & Review", "Assessment", "Initiation", "Closed"];
export const ROADMAP_STATUS = ["Not Started", "In Progress", "Completed", "At Risk", "Delayed", "In Review", "Cancelled", "Planning"];
export const CHECK_STATUS = ["done", "overdue", "upcoming"] as const;
export const TASK_STATUS = ["Not Started", "In Progress", "Completed", "Blocked"];
export const APPROVAL_STATUS = ["Not Started", "Review & Feedback", "Approved", "Rejected"];
export const ASSET_TYPES = ["Web", "Report", "Feature", "Code", "Video", "Document"];
export const ITEM_TYPES = ["Task", "Deliverable"];

export const CHECKLIST_PAGE_SIZE = 10;
export const CAL_CHECKLIST_PAGE_SIZE = 10;

/* Heatmap buckets: 0 · 1–2 · 3–5 · 6+ → index into the HEAT ramp. */
export const heatBucket = (n: number) => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : 3);
export const HEAT_KEY_LABELS = ["0", "1–2 · light", "3–5 · medium", "6+ · dark"];

/* Real P.I.C.S "Hierarchy" field: Parent / Child / Sub-child — long form (detail modal). */
export function relationship(r: PicsRecord, byId: Record<string, PicsRecord>): string | null {
  const parent = r.parentId ? byId[r.parentId] : undefined;
  if (r.hierarchy === "Sub-child" && parent) return `Sub-child of ${parent.name}`;
  if (r.hierarchy === "Child" && parent) return `Child of ${parent.name}`;
  if (r.childIds?.length) {
    const names = r.childIds.map((id) => byId[id]?.name ?? id).join(", ");
    return `Parent · ${r.childIds.length} child ${r.childIds.length === 1 ? "record" : "records"} (${names})`;
  }
  if (parent) return `Child of ${parent.name}`;
  return null;
}

/* Short form shown on the record card. */
export function relationshipChip(r: PicsRecord, byId: Record<string, PicsRecord>): string | null {
  const parent = r.parentId ? byId[r.parentId] : undefined;
  if (r.hierarchy === "Sub-child" && parent) return `⤷⤷ Sub-child of ${parent.name}`;
  if (r.hierarchy === "Child" && parent) return `⤷ Child of ${parent.name}`;
  if (r.childIds?.length) return `Parent · ${r.childIds.length} child ${r.childIds.length === 1 ? "record" : "records"}`;
  if (parent) return `⤷ Child of ${parent.name}`;
  return null;
}

export function phaseCount(r: PicsRecord): number {
  return new Set(r.roadmapRows.map((x) => x.phase).filter(Boolean)).size;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);
