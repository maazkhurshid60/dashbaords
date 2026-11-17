/* Payload trimming for /pics. The page used to ship two full copies of the P.I.C.S data: the Operations
   dataset (PicsData: records with roadmap rows, review rounds, meetings, checklists) and the Master Card
   dataset (CardData). Only the Master Card renders records now; the Operations data feeds the overview
   tiles, the open-checklist list + edit modal, the calendar, the search and the Reports tab.

   packOps / packCard run on the server (app/pics/page.tsx); unpackOps / unpackCard run in the client
   component and rebuild exactly the shapes the components expect:
   - Operations records keep only (and leave out what the card's P.I.C.S row already says) the fields the tiles/lists/forms read; roadmapRows / reviewRounds are
     dropped (the Master Card shows those), meetings keep label/date/link/facilitator.
   - A checklist item that the Master Card already carries is sent as its record id and rebuilt from the
     card row (the server checks the rebuild is identical, otherwise the full item is sent).
   - Card rows drop blank fields (restored from a per-table default), and review rounds drop their
     relRoadmap / relChecklist titles when they can be rebuilt from the ids.
   Client-safe: no server imports. */
import type { CardChecklist, CardData, CardPics } from "./pics-card-types";
import type { PicsData } from "./pics-types";
import type { ChecklistItem, PicsMeeting, PicsRecord } from "./types";

/* ---------------------------------------------------------------- Operations data */

type SlimMeeting = Pick<PicsMeeting, "label" | "date" | "link" | "facilitator">;
export type PackedRecord = Partial<Pick<PicsRecord, "name" | "type" | "stage" | "start" | "end" | "depts" | "leads" | "tag">> &
  Omit<
    PicsRecord,
    "roadmapRows" | "reviewRounds" | "checklist" | "meetings" | "overview" | "stakeholders" | "briefingLink" | "liveSiteUrl" | "name" | "type" | "stage" | "start" | "end" | "depts" | "leads" | "tag"
  > & {
  /** Card checklist id (rebuilt from the card row) or the full item. */
  checklist: (string | ChecklistItem)[];
  meetings?: SlimMeeting[];
};
export interface PackedOps {
  records: PackedRecord[];
  reports: PicsData["reports"];
  options: PicsData["options"];
  /** Server date used for done/overdue when rebuilding checklist items (keeps SSR and hydration identical). */
  today: string;
  /** Completion date of rebuilt checklist items, when it differs from the due date. */
  done: Record<string, string>;
}

const DROPPED = ["roadmapRows", "reviewRounds", "overview", "stakeholders", "briefingLink", "liveSiteUrl", "checklist", "meetings"] as const;
type Row = Record<string, unknown>;
const TASK_STATUS = ["Not Started", "In Progress", "Completed", "Blocked"];

/** Same mapping as lib/pics-live.ts mapChecklist, from the Master Card's checklist row. */
function checklistFromCard(c: CardChecklist, doneAt: string | undefined, today: string): ChecklistItem {
  const at = c.status || "Not Started";
  const due = c.due || null;
  const complete = at === "Completed" || at === "Approved";
  const done = complete ? doneAt || due || today : null;
  const status: ChecklistItem["status"] = complete ? "done" : due && due < today ? "overdue" : "upcoming";
  return {
    item: c.title || "(untitled checklist item)",
    due,
    done,
    status,
    taskStatus: TASK_STATUS.includes(at) ? at : at === "Approved" ? "Completed" : "In Progress",
    approvalStatus: at === "In Review" ? "Review & Feedback" : at === "Approved" ? "Approved" : at === "Rejected" ? "Rejected" : "Not Started",
    itemType: c.itemType || "Task",
    assetType: c.assetType || undefined,
    complete,
    overdue: status === "overdue",
    notes: c.opant,
    atId: c.id,
  };
}

const canon = (o: object) => {
  const e = Object.entries(o).filter(([, v]) => v !== undefined);
  e.sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(e);
};

/* Record fields that the Master Card's P.I.C.S row also carries (left out when identical). */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const FROM_CARD: Record<string, (p: CardPics) => unknown> = {
  name: (p) => p.name,
  type: (p) => p.type,
  stage: (p) => p.stage,
  start: (p) => p.start,
  end: (p) => p.end,
  depts: (p) => p.depts,
  tag: (p) => p.tag,
  leads: (p) => (p.leads.length ? p.leads.map((n) => ({ i: initials(n), name: n })) : [{ i: "—" }]),
};

export function packOps(data: PicsData, card: CardData): PackedOps {
  const today = new Date().toISOString().slice(0, 10);
  const cl = new Map(card.checklist.map((c) => [c.id, c]));
  const cp = new Map(card.pics.map((p) => [p.id, p]));
  const done: Record<string, string> = {};
  const records = data.records.map((r): PackedRecord => {
    const { checklist, meetings } = r;
    const rest: Row = { ...r };
    for (const k of DROPPED) delete rest[k];
    const src = cp.get(r.id);
    if (src) for (const [k, fn] of Object.entries(FROM_CARD)) if (canon({ v: fn(src) }) === canon({ v: rest[k] })) delete rest[k];
    return {
      ...(rest as Omit<PackedRecord, "checklist" | "meetings">),
      meetings: meetings?.map((m) => ({ label: m.label, date: m.date, link: m.link, facilitator: m.facilitator })),
      checklist: checklist.map((c) => {
        const src = c.atId ? cl.get(c.atId) : undefined;
        if (!src || !c.atId) return c;
        const doneAt = c.done && c.done !== c.due ? c.done : undefined;
        if (canon(checklistFromCard(src, doneAt, today)) !== canon(c)) return c;
        if (doneAt) done[c.atId] = doneAt;
        return c.atId;
      }),
    };
  });
  return { records, reports: data.reports, options: data.options, today, done };
}

function fromCard(src: CardPics | undefined, r: Row) {
  const out: Row = {};
  if (src) for (const [k, fn] of Object.entries(FROM_CARD)) if (!(k in r)) out[k] = fn(src);
  return out as Pick<PicsRecord, "name" | "type" | "stage" | "start" | "end" | "depts" | "leads">;
}

export function unpackOps(p: PackedOps, card: CardData): PicsData {
  const cl = new Map(card.checklist.map((c) => [c.id, c]));
  const cp = new Map(card.pics.map((x) => [x.id, x]));
  const records = p.records.map(
    (r): PicsRecord => ({
      ...fromCard(cp.get(r.id), r),
      ...r,
      roadmapRows: [],
      reviewRounds: [],
      checklist: r.checklist.flatMap((c) => {
        if (typeof c !== "string") return [c];
        const src = cl.get(c);
        return src ? [checklistFromCard(src, p.done[c], p.today)] : [];
      }),
    }),
  );
  return { records, reports: p.reports, options: p.options };
}

/* ---------------------------------------------------------------- Master Card data */

const TABLES = ["pics", "roadmap", "tasks", "checklist", "feedback"] as const;
type Table = (typeof TABLES)[number];
export interface PackedCard extends Omit<CardData, Table> {
  /** Per table: the blank value of each field that was left out of a row. */
  blank: Record<Table, Row>;
  rows: Record<Table, Row[]>;
}

const isBlank = (v: unknown) => v === "" || v === null || v === false || (Array.isArray(v) && v.length === 0);
const sameBlank = (a: unknown, b: unknown) => a === b || (Array.isArray(a) && Array.isArray(b) && !a.length && !b.length);

/* Fields that are usually rebuildable from other (never derived) fields: titles of linked rows, the reverse
   side of a link, and the P.I.C.S chain (root → owner). A value is left out only when the rebuild matches it
   exactly, so order and edge cases (links to rows outside the card data) are preserved. */
type Derive = Partial<Record<Table, Record<string, (row: Row) => unknown>>>;
function derivers(d: CardData): Derive {
  const rmTitle = new Map(d.roadmap.map((r) => [r.id, r.title]));
  const clTitle = new Map(d.checklist.map((c) => [c.id, c.title]));
  const pics = new Map(d.pics.map((p) => [p.id, p]));
  const titles = (ids: unknown, m: Map<string, string>) => ((ids ?? []) as string[]).map((id) => m.get(id) || "");
  const reverse = (rows: Row[], field: string) => {
    const m = new Map<string, string[]>();
    for (const r of rows) for (const id of (r[field] ?? []) as string[]) m.set(id, [...(m.get(id) ?? []), r.id as string]);
    return (row: Row) => m.get(row.id as string) ?? [];
  };
  const chain = (row: Row) => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (let p = pics.get(row.pics as string); p && !seen.has(p.id); p = p.parent ? pics.get(p.parent) : undefined) {
      seen.add(p.id);
      out.unshift(p.name);
    }
    return out;
  };
  return {
    roadmap: {
      taskIds: reverse(d.tasks as unknown as Row[], "roadmapIds"),
      checklistIds: reverse(d.checklist as unknown as Row[], "roadmapIds"),
      feedbackIds: reverse(d.feedback as unknown as Row[], "roadmapIds"),
      relPics: chain,
    },
    checklist: { feedbackIds: reverse(d.feedback as unknown as Row[], "checklistIds") },
    feedback: {
      relRoadmap: (row) => titles(row.roadmapIds, rmTitle),
      relChecklist: (row) => titles(row.checklistIds, clTitle),
      relPics: chain,
    },
  };
}

/* relPics lists P.I.C.S names; when not rebuildable they are sent as indexes into data.pics (key "~relPics"). */
const IX = "~relPics";

export function packCard(data: CardData): PackedCard {
  const der = derivers(data);
  const nameIx = new Map<string, number>();
  const dupNames = new Set<string>();
  data.pics.forEach((p, i) => (nameIx.has(p.name) ? dupNames.add(p.name) : nameIx.set(p.name, i)));
  const toIx = (names: unknown) =>
    Array.isArray(names) && names.every((n) => typeof n === "string" && nameIx.has(n) && !dupNames.has(n)) ? names.map((n) => nameIx.get(n)!) : null;
  const blank = {} as Record<Table, Row>;
  const rows = {} as Record<Table, Row[]>;
  for (const t of TABLES) {
    const dt = der[t] ?? {};
    const b: Row = {};
    for (const row of data[t] as unknown as Row[]) for (const [k, v] of Object.entries(row)) if (!(k in b) && !(k in dt) && isBlank(v)) b[k] = v;
    blank[t] = b;
    rows[t] = (data[t] as unknown as Row[]).map((row) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(row)) {
        if (k in dt ? JSON.stringify(dt[k](row)) === JSON.stringify(v) : k in b && sameBlank(v, b[k])) continue;
        const ix = k === "relPics" ? toIx(v) : null;
        if (ix) out[IX] = ix;
        else out[k] = v;
      }
      return out;
    });
  }
  const rest: Row = { ...data };
  for (const t of TABLES) delete rest[t];
  return { ...(rest as Omit<CardData, Table>), blank, rows };
}

export function unpackCard(p: PackedCard): CardData {
  const { blank, rows, ...rest } = p;
  const data = { ...rest } as unknown as CardData;
  for (const t of TABLES)
    (data as unknown as Record<Table, Row[]>)[t] = rows[t].map((row) => {
      const out: Row = {};
      // fresh arrays per row: the card engine mutates rows in place
      for (const [k, v] of Object.entries(blank[t])) out[k] = Array.isArray(v) ? [] : v;
      Object.assign(out, row);
      if (IX in out) {
        out.relPics = (out[IX] as number[]).map((i) => data.pics[i]?.name ?? "");
        delete out[IX];
      }
      return out;
    });
  // Derived fields only read non-derived ones, so they can be filled in any order.
  const der = derivers(data);
  for (const t of TABLES)
    for (const row of data[t] as unknown as Row[]) for (const [k, fn] of Object.entries(der[t] ?? {})) if (!(k in row)) row[k] = fn(row);
  return data;
}
