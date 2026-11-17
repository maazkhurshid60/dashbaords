/* Data shape of the P.I.C.S Master Card v2 (the AIRTABLE object in PICS-Master-Card-v2.html).
   Built live by lib/pics-card.ts; components/pics-card/snapshot.json is the bundled fallback. */

export interface CardPics {
  id: string;
  name: string;
  type: string;
  stage: string;
  hierarchy: string;
  start: string;
  end: string;
  leads: string[];
  depts: string[];
  parent: string | null;
  tag: string;
  active: boolean;
  overview: string;
}

export interface CardRoadmap {
  id: string;
  title: string;
  rType: string;
  phase: string;
  stage: string;
  status: string;
  start: string;
  date: string;
  pics: string;
  relPics: string[];
  depts: string[];
  assignee: string[];
  deliverables: string[];
  feedbackIds: string[];
  checklistIds: string[];
  taskIds: string[];
  briefs: string[];
  goals: string[];
  reports: string[];
  dependencies: string;
  notes: string;
  syncFlag: boolean;
  tag: string;
  tagStatus: string;
  sprintNo: number | null;
}

export interface CardTask {
  id: string;
  title: string;
  assignee: string[];
  type: string;
  status: string;
  priority: string;
  start: string;
  due: string;
  worked: number;
  planned: number;
  details: string;
  notesFromAssignee: string;
  roadmapIds: string[];
}

export interface CardChecklist {
  id: string;
  title: string;
  num: number | null;
  itemType: string;
  assetType: string;
  due: string;
  status: string;
  owner: string[];
  reviewer: string[];
  roadmapIds: string[];
  feedbackIds: string[];
  notes: string;
  opant: string;
  tag: string;
}

export interface CardFeedback {
  id: string;
  title: string;
  round: number;
  type: string;
  status: string;
  due: string;
  reviewers: string[];
  url: string;
  notes: string;
  actions: string;
  pics: string;
  roadmapIds: string[];
  relPics: string[];
  relRoadmap: string[];
  checklistIds: string[];
  relChecklist: string[];
  month: string;
  attachments: { name: string; size?: number; type?: string; url?: string }[];
  reviewUrls: string;
  feedbackUrls: string;
  tag: string;
  tagStatus: string;
}

/** Select choices read from the live schema (trimmed). Missing keys fall back to the card's built-in lists. */
export interface CardOptions {
  roadmapType?: string[];
  phase?: string[];
  stage?: string[];
  status?: string[];
  tagStatus?: string[];
  depts?: string[];
  taskType?: string[];
  taskStatus?: string[];
  priority?: string[];
  clStatus?: string[];
  clItemType?: string[];
  clAsset?: string[];
  fbType?: string[];
  fbStatus?: string[];
}

export interface CardData {
  source: string;
  pulled: string;
  pics: CardPics[];
  roadmap: CardRoadmap[];
  tasks: CardTask[];
  checklist: CardChecklist[];
  feedback: CardFeedback[];
  options?: CardOptions;
}

export interface CardSource {
  live: boolean;
  syncedAt: string;
  error?: string;
}

/** Which dashboard a write came from (Dashboard Sync Queue "Dashboard"). */
export type CardDashboard = "PICS Operations" | "Product";
