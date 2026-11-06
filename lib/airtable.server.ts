import "server-only";
import { revalidateTag } from "next/cache";

/* Server-side Airtable client for the VCG Intranet base. The token lives in .env.local
   (AIRTABLE_TOKEN) and never reaches the browser: only server components and route
   handlers import this file.

   Reads are cached for REVALIDATE_S seconds per table (tag "at:<tableId>"), so opening
   several dashboards doesn't hit Airtable's 5 requests/second limit. Every write
   invalidates that table's tag, so the next read is fresh. */

export const BASE_ID = process.env.AIRTABLE_BASE_ID || "appLH1D7ME6mU1zgE";
const API = "https://api.airtable.com/v0";
const REVALIDATE_S = 60;
const MAX_CONCURRENT = 4;

export type Fields = Record<string, unknown>;
export interface AtRecord<F extends Fields = Fields> {
  id: string;
  createdTime: string;
  fields: F;
}

export class AirtableError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const airtableConfigured = () => !!process.env.AIRTABLE_TOKEN;

/* A small semaphore: at most MAX_CONCURRENT requests in flight per server process. */
let active = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function call(url: string, init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {}) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new AirtableError("AIRTABLE_TOKEN is not set", 500);
  for (let attempt = 0; ; attempt++) {
    const res = await slot(() =>
      fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
      }),
    );
    // Airtable asks clients to back off ~30s on 429; a short retry is enough for our bursts.
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AirtableError(`Airtable ${res.status}: ${body.slice(0, 300)}`, res.status);
    }
    return res.json();
  }
}

export const tableTag = (tableId: string) => `at:${tableId}`;

export interface ListOptions {
  /** Field names (or IDs) to return; omit for all fields. */
  fields?: string[];
  filterByFormula?: string;
  view?: string;
  sort?: { field: string; direction?: "asc" | "desc" }[];
  /** Key fields by field ID instead of name (stable across renames). */
  byFieldId?: boolean;
  maxRecords?: number;
}

/** Every record of a table (follows pagination), cached for a minute. */
export async function listRecords<F extends Fields = Fields>(tableId: string, opts: ListOptions = {}): Promise<AtRecord<F>[]> {
  const out: AtRecord<F>[] = [];
  let offset: string | undefined;
  do {
    const p = new URLSearchParams({ pageSize: "100" });
    opts.fields?.forEach((f) => p.append("fields[]", f));
    if (opts.filterByFormula) p.set("filterByFormula", opts.filterByFormula);
    if (opts.view) p.set("view", opts.view);
    if (opts.maxRecords) p.set("maxRecords", String(opts.maxRecords));
    if (opts.byFieldId) p.set("returnFieldsByFieldId", "true");
    opts.sort?.forEach((s, i) => {
      p.set(`sort[${i}][field]`, s.field);
      p.set(`sort[${i}][direction]`, s.direction || "asc");
    });
    if (offset) p.set("offset", offset);
    const page = (await call(`${API}/${BASE_ID}/${tableId}?${p}`, {
      next: { revalidate: REVALIDATE_S, tags: [tableTag(tableId)] },
    })) as { records: AtRecord<F>[]; offset?: string };
    out.push(...page.records);
    offset = page.offset;
  } while (offset);
  return out;
}

export interface TableSchema {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: { id: string; name: string; type: string; options?: { choices?: { id: string; name: string }[] } }[];
}

/** Table and field definitions of the base (field names, types, select choices). */
export async function getSchema(): Promise<TableSchema[]> {
  const r = (await call(`${API}/meta/bases/${BASE_ID}/tables`, {
    next: { revalidate: 600, tags: ["at:schema"] },
  })) as { tables: TableSchema[] };
  return r.tables;
}

/* ---------------------------------------------------------------- writes
   Every write names the fields its caller is allowed to change (by name); anything else is
   refused before it reaches Airtable. Each route handler passes its own allow-list. */
export type Allow = readonly string[] | "*";

function guard(tableId: string, fields: Fields, allowed: Allow) {
  if (allowed === "*") return;
  const bad = Object.keys(fields).filter((k) => !allowed.includes(k));
  if (bad.length) throw new AirtableError(`Fields not writable on ${tableId}: ${bad.join(", ")}`, 403);
}

/** Update one record (PATCH: only the given fields change). */
export async function updateRecord(tableId: string, recordId: string, fields: Fields, allowed: Allow, typecast = true) {
  guard(tableId, fields, allowed);
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) throw new AirtableError(`Bad record id ${recordId}`, 400);
  const r = (await call(`${API}/${BASE_ID}/${tableId}/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields, typecast }),
    cache: "no-store",
  })) as AtRecord;
  revalidateTag(tableTag(tableId), { expire: 0 });
  return r;
}

/** Create one record. */
export async function createRecord(tableId: string, fields: Fields, allowed: Allow, typecast = true) {
  guard(tableId, fields, allowed);
  const r = (await call(`${API}/${BASE_ID}/${tableId}`, {
    method: "POST",
    body: JSON.stringify({ fields, typecast }),
    cache: "no-store",
  })) as AtRecord;
  revalidateTag(tableTag(tableId), { expire: 0 });
  return r;
}

/* ---------------------------------------------------------------- field helpers */
export const str = (v: unknown): string =>
  v == null ? "" : Array.isArray(v) ? v.map(str).filter(Boolean).join(", ") : typeof v === "object" ? String((v as { name?: string }).name ?? "") : String(v);
export const num = (v: unknown): number | null => {
  const x = Array.isArray(v) ? v[0] : v;
  const n = typeof x === "number" ? x : parseFloat(String(x ?? ""));
  return Number.isFinite(n) ? n : null;
};
export const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : v == null || v === "" ? [] : [str(v)]);
export const bool = (v: unknown) => v === true || v === "true" || v === 1;
/** Linked-record IDs of a link field. */
export const links = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.startsWith("rec")) : []);

/** Wraps a loader so a failed Airtable read falls back to the bundled snapshot instead of breaking the page. */
export async function withFallback<T>(load: () => Promise<T>, fallback: () => T): Promise<{ data: T; live: boolean; syncedAt: string; error?: string }> {
  if (!airtableConfigured()) return { data: fallback(), live: false, syncedAt: new Date().toISOString(), error: "AIRTABLE_TOKEN not set" };
  try {
    return { data: await load(), live: true, syncedAt: new Date().toISOString() };
  } catch (e) {
    console.error("[airtable]", e);
    return { data: fallback(), live: false, syncedAt: new Date().toISOString(), error: e instanceof Error ? e.message : String(e) };
  }
}
