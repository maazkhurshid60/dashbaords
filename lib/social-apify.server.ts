import "server-only";

import { AirtableError, createRecord, getSchema, listRecords, type Fields, type TableSchema } from "./airtable.server";
import { SI_DASHBOARD, SI_TABLES as T } from "./social-types";

/*
 * The Social Impact dashboard runs a configured Apify Task, rather than an
 * arbitrary Actor. This keeps approved sources and search input in Apify and
 * out of the browser and repository.
 *
 * Required server environment variables:
 *   APIFY_TOKEN                 scoped token: read Task, run Actor, read Dataset
 *   APIFY_TASK_ID               Apify Task id (or owner~task-name)
 *
 * Optional server environment variables:
 *   APIFY_TASK_INPUT_JSON       JSON object merged over the Task's saved input
 *   APIFY_MAX_ITEMS             imported dataset rows per run; default 50, max 50
 *   APIFY_MAX_TOTAL_CHARGE_USD  per-run Apify safety cap; default 2, max 25
 *   APIFY_WAIT_SECONDS          Apify wait time per request; default 15, max 50
 *
 * Apify output differs per Actor. The mapper accepts common grant field names
 * and writes only fields that exist in the live Airtable schema. It never
 * creates a select option through Airtable typecasting.
 */

const APIFY_API = "https://api.apify.com/v2";
const SCRAPER_WRITE_FIELDS = [
  "Opportunity Title",
  "Funder Name Raw",
  "Source",
  "Source URL",
  "Date Scraped",
  "Deadline",
  "Deadline Type",
  "Award Amount Min",
  "Award Amount Max",
  "Eligibility Summary",
  "Focus Area Tags",
  "Geographic Eligibility",
  "Requires Match Funding",
  "Fit Rationale",
  "Triage Status",
  "Notes",
] as const;

type SchemaField = TableSchema["fields"][number];
type JsonObject = Record<string, unknown>;

type ApifyRun = {
  id: string;
  status: string;
  statusMessage?: string;
  defaultDatasetId?: string;
};

export type ScraperReadiness = {
  configured: boolean;
  missing: string[];
  message: string;
};

export type ScraperImport = {
  received: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export type ScraperRunResult = {
  ok: boolean;
  runId: string;
  status: string;
  message: string;
  import?: ScraperImport;
};

export class GrantScraperError extends Error {
  constructor(
    message: string,
    readonly status: number = 500,
  ) {
    super(message);
  }
}

const oneLine = (v: unknown, max = 2_000) =>
  (typeof v === "string" ? v : v == null ? "" : String(v)).replace(/\s+/g, " ").trim().slice(0, max);
const object = (v: unknown): JsonObject => (v && typeof v === "object" && !Array.isArray(v) ? (v as JsonObject) : {});

const clampInt = (raw: string | undefined, fallback: number, min: number, max: number) => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

const clampNumber = (raw: string | undefined, fallback: number, min: number, max: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

function taskId() {
  const id = oneLine(process.env.APIFY_TASK_ID, 200);
  return /^[A-Za-z0-9_~-]{3,200}$/.test(id) ? id : "";
}

function taskInput(): JsonObject {
  const raw = process.env.APIFY_TASK_INPUT_JSON?.trim();
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as JsonObject;
  } catch {
    throw new GrantScraperError("APIFY_TASK_INPUT_JSON must be a JSON object", 500);
  }
}

export function scraperReadiness(): ScraperReadiness {
  const missing = [!process.env.APIFY_TOKEN && "APIFY_TOKEN", !taskId() && "APIFY_TASK_ID"].filter((v): v is string => !!v);
  return {
    configured: missing.length === 0,
    missing,
    message: missing.length ? `Grant scraper is not connected yet (${missing.join(" and ")} required).` : "Grant scraper is ready.",
  };
}

function requireConfiguration() {
  const state = scraperReadiness();
  if (!state.configured) throw new GrantScraperError(state.message, 503);
  return { token: process.env.APIFY_TOKEN!, task: taskId() };
}

async function apify<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = requireConfiguration();
  let res: Response;
  try {
    res = await fetch(`${APIFY_API}/${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new GrantScraperError("Could not reach Apify. Please try again.", 502);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: unknown }; message?: unknown } | null;
    const detail = oneLine(body?.error?.message ?? body?.message, 300);
    const status = res.status === 429 ? 429 : res.status >= 400 && res.status < 500 ? 400 : 502;
    throw new GrantScraperError(`Apify ${res.status}${detail ? `: ${detail}` : ""}`, status);
  }
  return (await res.json()) as T;
}

function runFrom(v: unknown): ApifyRun {
  const envelope = object(v);
  const data = object(envelope.data || v);
  const id = oneLine(data.id, 100);
  const status = oneLine(data.status, 100).toUpperCase();
  if (!id || !status) throw new GrantScraperError("Apify returned an invalid run response", 502);
  return { id, status, statusMessage: oneLine(data.statusMessage, 300), defaultDatasetId: oneLine(data.defaultDatasetId, 100) };
}

const working = (status: string) => status === "READY" || status === "RUNNING";
const succeeded = (status: string) => status === "SUCCEEDED";
const validRunId = (id: string) => /^[A-Za-z0-9_-]{8,100}$/.test(id);

function pick(row: JsonObject, names: string[]) {
  const values = new Map(Object.entries(row).map(([k, v]) => [k.replace(/[^a-z0-9]/gi, "").toLowerCase(), v]));
  for (const name of names) {
    const value = values.get(name.replace(/[^a-z0-9]/gi, "").toLowerCase());
    if (value != null && value !== "") return value;
  }
  return undefined;
}

function stringList(v: unknown): string[] {
  const source = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[;,|]/) : [v];
  return [...new Set(source.map((x) => oneLine(x, 120)).filter(Boolean))];
}

function dateValue(v: unknown): string | undefined {
  const raw = oneLine(v, 100);
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString().slice(0, 10);
}

function numberValue(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const raw = oneLine(v, 100).replace(/[$,]/g, "");
  const match = raw.match(/-?\d+(?:\.\d+)?\s*([kKmM])?/);
  if (!match) return undefined;
  const multiplier = match[1]?.toLowerCase() === "k" ? 1_000 : match[1]?.toLowerCase() === "m" ? 1_000_000 : 1;
  const result = Number(match[0].replace(/[kKmM\s]/g, "")) * multiplier;
  return Number.isFinite(result) ? result : undefined;
}

function amountRange(v: unknown): [number | undefined, number | undefined] {
  if (typeof v === "number") return [v, v];
  const raw = oneLine(v, 300).replace(/[$,]/g, "");
  const values = [...raw.matchAll(/-?\d+(?:\.\d+)?\s*([kKmM])?/g)]
    .map((m) => numberValue(m[0]))
    .filter((n): n is number => n !== undefined);
  return values.length > 1 ? [Math.min(...values), Math.max(...values)] : values.length ? [values[0], values[0]] : [undefined, undefined];
}

function boolValue(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  const raw = oneLine(v, 30).toLowerCase();
  if (["true", "yes", "required", "1"].includes(raw)) return true;
  if (["false", "no", "none", "0"].includes(raw)) return false;
  return undefined;
}

function canonicalUrl(v: unknown): string {
  const raw = oneLine(v, 2_000);
  if (!raw) return "";
  try {
    const u = new URL(raw);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) => u.searchParams.delete(key));
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    u.pathname = u.pathname.replace(/\/$/, "");
    return u.toString();
  } catch {
    return raw.toLowerCase().replace(/\/$/, "");
  }
}

const canonicalText = (v: unknown) => oneLine(v, 500).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const titleFunderKey = (title: unknown, funder: unknown) => {
  const t = canonicalText(title);
  const f = canonicalText(funder);
  return t && f ? `${t}|${f}` : "";
};

function fieldMap(schema: TableSchema[]): Map<string, SchemaField> {
  const table = schema.find((t) => t.id === T.scraper);
  if (!table) throw new AirtableError("Grants Scraper Database table is missing from Airtable", 500);
  return new Map(table.fields.map((f) => [f.name, f]));
}

const readonlyFieldTypes = new Set(["autoNumber", "barcode", "button", "count", "createdBy", "createdTime", "externalSyncSource", "formula", "lastModifiedBy", "lastModifiedTime", "lookup", "multipleLookupValues", "rollup"]);
const writable = (field: SchemaField | undefined): field is SchemaField => !!field && !readonlyFieldTypes.has(field.type);

function assertImportSchema(defs: Map<string, SchemaField>) {
  if (!writable(defs.get("Opportunity Title"))) throw new AirtableError('"Opportunity Title" is not writable in Grants Scraper Database', 500);
  const triage = defs.get("Triage Status");
  if (!writable(triage)) throw new AirtableError('"Triage Status" is not writable in Grants Scraper Database', 500);
  if (triage.type === "singleSelect" && !triage.options?.choices?.some((choice) => choice.name === "New"))
    throw new AirtableError('"Triage Status" needs a "New" option before grant imports can run', 500);
}

function selectChoice(field: SchemaField | undefined, value: string): string | undefined {
  if (!writable(field) || !value) return undefined;
  if (field.type !== "singleSelect") return value;
  return field.options?.choices?.find((choice) => choice.name.toLowerCase() === value.toLowerCase())?.name;
}

function putText(fields: Fields, defs: Map<string, SchemaField>, name: string, value: unknown, max = 5_000) {
  const text = oneLine(value, max);
  const field = defs.get(name);
  const selected = selectChoice(field, text);
  if (selected !== undefined) fields[name] = selected;
}

function putDate(fields: Fields, defs: Map<string, SchemaField>, name: string, value: unknown) {
  const date = dateValue(value);
  if (date && writable(defs.get(name))) fields[name] = date;
}

function putNumber(fields: Fields, defs: Map<string, SchemaField>, name: string, value: unknown) {
  const n = numberValue(value);
  if (n !== undefined && writable(defs.get(name))) fields[name] = n;
}

function putBoolean(fields: Fields, defs: Map<string, SchemaField>, name: string, value: unknown) {
  const b = boolValue(value);
  if (b !== undefined && writable(defs.get(name))) fields[name] = b;
}

function putTags(fields: Fields, defs: Map<string, SchemaField>, name: string, value: unknown) {
  const field = defs.get(name);
  const tags = stringList(value);
  if (!writable(field) || !tags.length) return;
  if (field.type === "multipleSelects") {
    const choices = field.options?.choices ?? [];
    const selected = tags
      .map((tag) => choices.find((choice) => choice.name.toLowerCase() === tag.toLowerCase())?.name)
      .filter((tag): tag is string => !!tag);
    if (selected.length) fields[name] = selected;
    return;
  }
  fields[name] = tags.join(", ");
}

function recordFields(row: JsonObject, defs: Map<string, SchemaField>): Fields | null {
  const title = pick(row, ["opportunityTitle", "grantTitle", "title", "opportunityName", "name"]);
  const titleText = oneLine(title, 500);
  if (!titleText) return null;

  const funder = pick(row, ["funderName", "funder", "grantmaker", "organization", "provider", "sponsor"]);
  const sourceUrl = pick(row, ["sourceUrl", "sourceURL", "opportunityUrl", "grantUrl", "detailUrl", "url", "link"]);
  const amount = pick(row, ["awardAmount", "fundingAmount", "grantAmount", "award", "amount"]);
  const [amountLow, amountHigh] = amountRange(amount);
  const explicitLow = pick(row, ["awardAmountMin", "amountMin", "minimumAward", "minAward", "fundingMin"]);
  const explicitHigh = pick(row, ["awardAmountMax", "amountMax", "maximumAward", "maxAward", "fundingMax"]);
  const fields: Fields = {};

  putText(fields, defs, "Opportunity Title", titleText, 500);
  putText(fields, defs, "Funder Name Raw", funder, 500);
  putText(fields, defs, "Source", pick(row, ["source", "sourceName", "publisher", "website", "platform"]), 300);
  putText(fields, defs, "Source URL", sourceUrl, 2_000);
  putDate(fields, defs, "Date Scraped", new Date().toISOString().slice(0, 10));
  putDate(fields, defs, "Deadline", pick(row, ["deadline", "applicationDeadline", "dueDate", "closeDate", "endDate"]));
  putText(fields, defs, "Deadline Type", pick(row, ["deadlineType", "deadlineStatus"]), 100);
  putNumber(fields, defs, "Award Amount Min", explicitLow ?? amountLow);
  putNumber(fields, defs, "Award Amount Max", explicitHigh ?? amountHigh);
  putText(fields, defs, "Eligibility Summary", pick(row, ["eligibilitySummary", "eligibility", "requirements", "description"]), 10_000);
  putTags(fields, defs, "Focus Area Tags", pick(row, ["focusAreaTags", "focusAreas", "focus", "categories", "category", "tags"]));
  putText(fields, defs, "Geographic Eligibility", pick(row, ["geographicEligibility", "geography", "geographicScope", "eligibleLocations", "location"]), 1_000);
  putBoolean(fields, defs, "Requires Match Funding", pick(row, ["requiresMatchFunding", "matchFundingRequired", "requiresMatch"]));
  putText(fields, defs, "Fit Rationale", pick(row, ["fitRationale", "rationale"]), 5_000);
  putText(fields, defs, "Triage Status", "New", 30);
  putText(fields, defs, "Notes", pick(row, ["notes", "summary", "excerpt"]), 10_000);
  return fields;
}

async function importDataset(datasetId: string, runId: string): Promise<ScraperImport> {
  const limit = clampInt(process.env.APIFY_MAX_ITEMS, 50, 1, 50);
  const items = await apify<unknown[]>(`datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&limit=${limit}`);
  if (!Array.isArray(items)) throw new GrantScraperError("Apify returned an invalid dataset", 502);

  const [schema, existing] = await Promise.all([
    getSchema(),
    listRecords(T.scraper, { fields: ["Opportunity Title", "Funder Name Raw", "Source URL"] }),
  ]);
  const defs = fieldMap(schema);
  assertImportSchema(defs);
  const urls = new Set(existing.map((r) => canonicalUrl(r.fields["Source URL"])).filter(Boolean));
  const titleFunders = new Set(existing.map((r) => titleFunderKey(r.fields["Opportunity Title"], r.fields["Funder Name Raw"])).filter(Boolean));
  const result: ScraperImport = { received: items.length, imported: 0, duplicates: 0, skipped: 0, failed: 0, errors: [] };
  const audit = { dashboard: SI_DASHBOARD, area: "Grant Scrapers", batchId: `apify-${runId}` };

  for (const raw of items) {
    const fields = recordFields(object(raw), defs);
    if (!fields) {
      result.skipped++;
      continue;
    }
    const url = canonicalUrl(fields["Source URL"]);
    const titleFunder = titleFunderKey(fields["Opportunity Title"], fields["Funder Name Raw"]);
    if ((url && urls.has(url)) || (titleFunder && titleFunders.has(titleFunder))) {
      result.duplicates++;
      continue;
    }
    try {
      await createRecord(T.scraper, fields, SCRAPER_WRITE_FIELDS, false, audit);
      result.imported++;
      if (url) urls.add(url);
      if (titleFunder) titleFunders.add(titleFunder);
    } catch (e) {
      result.failed++;
      if (result.errors.length < 5) result.errors.push(e instanceof Error ? oneLine(e.message, 300) : "Could not import a grant");
    }
  }
  return result;
}

function messageFor(run: ApifyRun) {
  if (working(run.status)) return run.status === "READY" ? "Apify accepted the grant scrape and is waiting to start." : "Apify is searching for grant opportunities.";
  if (succeeded(run.status)) return "Grant scrape completed and results were imported.";
  return run.statusMessage || `Apify run ended with status ${run.status}.`;
}

async function resultFor(run: ApifyRun): Promise<ScraperRunResult> {
  if (!succeeded(run.status)) return { ok: working(run.status), runId: run.id, status: run.status, message: messageFor(run) };
  if (!run.defaultDatasetId) throw new GrantScraperError("Apify finished without a result dataset", 502);
  const imported = await importDataset(run.defaultDatasetId, run.id);
  return {
    ok: true,
    runId: run.id,
    status: run.status,
    message: [
      `Imported ${imported.imported} grant${imported.imported === 1 ? "" : "s"}`,
      `${imported.duplicates} duplicate${imported.duplicates === 1 ? "" : "s"} skipped`,
      ...(imported.skipped ? [`${imported.skipped} row${imported.skipped === 1 ? "" : "s"} missing a title`] : []),
      ...(imported.failed ? [`${imported.failed} row${imported.failed === 1 ? "" : "s"} failed`] : []),
    ].join("; ") + ".",
    import: imported,
  };
}

/** Starts the configured Apify Task. The route caller polls checkGrantScrape() while it runs. */
export async function startGrantScrape(): Promise<ScraperRunResult> {
  const { task } = requireConfiguration();
  const params = new URLSearchParams({
    waitForFinish: String(clampInt(process.env.APIFY_WAIT_SECONDS, 15, 0, 50)),
    maxItems: String(clampInt(process.env.APIFY_MAX_ITEMS, 50, 1, 50)),
    maxTotalChargeUsd: String(clampNumber(process.env.APIFY_MAX_TOTAL_CHARGE_USD, 2, 0.01, 25)),
  });
  const response = await apify<unknown>(`actor-tasks/${encodeURIComponent(task)}/runs?${params}`, {
    method: "POST",
    body: JSON.stringify(taskInput()),
  });
  return resultFor(runFrom(response));
}

/** Reads a previous run, waiting briefly for completion before returning its status/import. */
export async function checkGrantScrape(runId: string): Promise<ScraperRunResult> {
  if (!validRunId(runId)) throw new GrantScraperError("Invalid grant scraper run id", 400);
  const wait = clampInt(process.env.APIFY_WAIT_SECONDS, 15, 0, 50);
  const response = await apify<unknown>(`actor-runs/${encodeURIComponent(runId)}?waitForFinish=${wait}`);
  return resultFor(runFrom(response));
}
