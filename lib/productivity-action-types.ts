/* Client-safe shapes for the meeting card › Action items section (PROD-7 → PROD-12). */

export interface ActionItem {
  id: string;
  task: string;
  ownerId: string | null;
  owner: string | null;
  due: string | null;
  priority: string | null;
  status: string | null;
  completed: boolean;
  roadmapId: string | null;
  /** P.I.C.S Tag of the linked roadmap (falls back to the phase title). */
  roadmapTag: string | null;
}

export interface RoadmapOption {
  id: string;
  title: string;
  tag: string;
  picsId: string | null;
}

export interface ActionItemsPayload {
  items: ActionItem[];
  /** Meetings Master › Sync Action Items is still ticked (SUCANT running). */
  syncing: boolean;
  /** Recap URL or Action Item Summary present. */
  recapAvailable: boolean;
  /** Recap summary lists items not yet on the card. */
  recapPending: boolean;
  roadmapId: string | null;
  roadmaps: RoadmapOption[];
  members: { id: string; name: string }[];
  statuses: string[];
  priorities: string[];
  syncedAt: string;
}

/** Semantic body for create / edit — never raw Airtable field names. */
export interface ActionItemInput {
  task?: string;
  ownerId?: string | null;
  due?: string | null;
  priority?: string | null;
  status?: string | null;
  roadmapId?: string | null;
}
