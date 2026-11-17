import type { CardData, CardPics } from "@/lib/pics-card-types";

export type PersistKind = "roadmap" | "task" | "checklist" | "feedback";

export interface PersistRequest {
  kind: PersistKind;
  /** Airtable record id to update; null = create. */
  id: string | null;
  /** Card-shaped patch (engine keys, e.g. title / rType / due / reviewers). */
  patch: Record<string, unknown>;
  /** Card section the edit came from (Dashboard Sync Queue "Tab / Area"). */
  area: string;
}

export interface SharePayload {
  kind: "pics" | "fb";
  id: string;
  invites: { who: string; role: string; external: boolean }[];
  access: string;
  expiry: string;
  include: Record<string, boolean>;
  message: string;
  link: string;
}

export interface CardEngineOptions {
  data: CardData;
  /** Department view (OPS-24 / PRD-6): only P.I.C.S whose Related Department(s) contains it. */
  dept?: string;
  /** Extra grid filter (e.g. Operations stage tile / search box). */
  filter?: ((p: CardPics) => boolean) | null;
  initialType?: string;
  /** P.I.C.S id, tag or exact name to open on load. */
  openId?: string | null;
  /** Hide the prototype page title (the app supplies its own header). */
  embedded?: boolean;
  /** Show the prototype's dev bar + UPD tags. */
  devTools?: boolean;
  userName?: string;
  /** Path used for "Copy view-only link" / share links, e.g. /pics. */
  viewBase?: string;
  persist?: (req: PersistRequest) => Promise<{ id: string } | null>;
  share?: (payload: SharePayload) => Promise<{ ok: boolean; message?: string }>;
}

export interface CardEngineHandle {
  setFilter(fn: ((p: CardPics) => boolean) | null): void;
  open(id: string): void;
  destroy(): void;
}
