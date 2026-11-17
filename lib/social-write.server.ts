import "server-only";
import { NextResponse } from "next/server";
import { AirtableError, createRecord, getSchema, updateRecord, type Fields } from "./airtable.server";
import { SI_DASHBOARD, SI_TABLES as T } from "./social-types";

/* Writes for /api/social/*. Each write has an explicit allow-list of Airtable field names, select
   values are resolved to existing choices (typecast=false, so no new options are ever created), and
   every write is logged to the Dashboard Sync Queue with {dashboard:"Social Impact", area:<view>}. */

export const SI_ALLOW = {
  /** Grant Applications — Opportunity Pipeline drag/move + status in the card drawer. */
  application: ["Stage"],
  /** Grant Application Sections — Application Builder save. */
  section: ["Draft Response", "Status", "Answers Used"],
  /** Answer Library — "Save to Answer Library". */
  answer: ["Answer Title", "Answer Body", "Grant Application Sections"],
} as const;

const AREAS = ["Overview", "Nail Networks", "Grant Scrapers", "Opportunity Pipeline", "Application Builder"];

export const bad = (msg: string) => new AirtableError(msg, 400);
const isRecId = (v: unknown): v is string => typeof v === "string" && /^rec[A-Za-z0-9]{14}$/.test(v);
const text = (v: unknown, max = 100000) => (typeof v === "string" ? v.slice(0, max) : "");
const audit = (area: unknown) => ({ dashboard: SI_DASHBOARD, area: typeof area === "string" && AREAS.includes(area) ? area : "Social Impact" });

async function choice(tableId: string, field: string, value: unknown): Promise<string> {
  if (typeof value !== "string") throw bad(`${field} must be a string`);
  const fld = (await getSchema()).find((t) => t.id === tableId)?.fields.find((f) => f.name === field);
  const hit = fld?.options?.choices?.find((c) => c.name === value);
  if (!hit) throw bad(`"${value}" is not an option for ${field} in Airtable`);
  return hit.name;
}

export async function readJson<B>(req: Request): Promise<B> {
  try {
    return (await req.json()) as B;
  } catch {
    throw bad("Request body must be JSON");
  }
}

export async function handle(fn: () => Promise<unknown>) {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    const status = e instanceof AirtableError ? e.status : 500;
    if (status >= 500) console.error("[api/social]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
}

/** Move a Grant Application to another Stage. */
export async function setApplicationStage(id: string, stage: unknown, area: unknown) {
  if (!isRecId(id)) throw bad("Bad record id");
  const fields: Fields = { Stage: await choice(T.applications, "Stage", stage) };
  const r = await updateRecord(T.applications, id, fields, SI_ALLOW.application, false, audit(area));
  return { ok: true, id: r.id, stage: r.fields["Stage"] };
}

/** Save a Grant Application Section (draft answer, status, answers used). */
export async function saveSection(id: string, patch: { draft?: unknown; status?: unknown; answersUsed?: unknown }, area: unknown) {
  if (!isRecId(id)) throw bad("Bad record id");
  const fields: Fields = {};
  if (patch.draft !== undefined) fields["Draft Response"] = text(patch.draft);
  if (patch.status !== undefined) fields["Status"] = await choice(T.sections, "Status", patch.status);
  if (patch.answersUsed !== undefined) {
    if (!Array.isArray(patch.answersUsed) || !patch.answersUsed.every(isRecId)) throw bad("answersUsed must be record ids");
    fields["Answers Used"] = patch.answersUsed;
  }
  if (!Object.keys(fields).length) throw bad("Nothing to save");
  const r = await updateRecord(T.sections, id, fields, SI_ALLOW.section, false, audit(area));
  return { ok: true, id: r.id };
}

/** Save a section answer as a new Answer Library entry (unapproved, linked to the section). */
export async function saveAnswer(b: { title?: unknown; body?: unknown; sectionId?: unknown }, area: unknown) {
  const title = text(b.title, 200).trim();
  const body = text(b.body).trim();
  if (!title || !body) throw bad("Title and answer text are required");
  const fields: Fields = { "Answer Title": title, "Answer Body": body };
  if (b.sectionId !== undefined) {
    if (!isRecId(b.sectionId)) throw bad("Bad section id");
    fields["Grant Application Sections"] = [b.sectionId];
  }
  const r = await createRecord(T.answers, fields, SI_ALLOW.answer, false, audit(area));
  return { ok: true, id: r.id };
}
