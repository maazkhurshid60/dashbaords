import "server-only";
import { AirtableError, createRecord, getSchema, listRecords, str, updateRecord, type Fields } from "./airtable.server";
import { AT } from "./product-data";
import { F, T } from "./product-live.server";

/* POST /api/product/write (shared by /product and /communications).
     {table, recordId, fields}    update one record
     {table, create: true, fields} create one record
     {action: 'dismissFix' | 'assignFix' | 'prantSweep', …}
   `table` is the Airtable table id the page sends (AT[key].id) or the name "Announcements".
   Field keys may be field ids or the names the original pages used; each is mapped to a field id
   and checked against the allow-list below — anything else is refused before Airtable sees it. */

export class WriteError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

interface TableRule {
  key: string;
  id: string;
  /** field ids the UI may change on an existing record */
  update: string[];
  /** field ids the UI may set on a new record (empty = creating is not allowed) */
  create: string[];
  /** names the original pages send → field id */
  alias?: Record<string, string>;
  /** value conversions for fields whose UI shape differs from Airtable's */
  convert?: Record<string, (v: unknown) => unknown>;
  /** false = never invent new select options (values must already exist) */
  typecast?: boolean;
}

const fb = AT.feedback.f!, cm = F.comms, an = F.announcements, rm = AT.roadmaps.f!, cl = AT.checklist.f!;
const day = (v: unknown) => (v ? String(v).slice(0, 10) : null);

export const RULES: TableRule[] = [
  { key: "features", id: T.features, update: [AT.features.f!.status], create: [] },
  {
    key: "feedback", id: T.feedback, update: [fb.feature],
    create: [fb.summary, fb.account, fb.source, fb.sentiment, fb.date, fb.feature],
  },
  { key: "gates", id: T.gates, update: [AT.gates.f!.status], create: [] },
  { key: "checklist", id: T.checklist, update: [cl.status, cl.due, cl.notes], create: [], convert: { [cl.due]: day } },
  { key: "registry", id: T.registry, update: [F.registry.notes], create: [] },
  { key: "roadmaps", id: T.roadmaps, update: [], create: [rm.title, rm.pics, rm.type, rm.status, rm.notes] },
  {
    key: "comms", id: T.comms, update: [cm.status, cm.intent, cm.draft, cm.needs, cm.gen, cm.deploy, cm.assignee],
    /* "Notify customers" (only shown once User Feedback & Insights.Customer Notified exists) */
    create: [cm.subject, cm.body, cm.gen], alias: { Subject: cm.subject, Body: cm.body, "Generate Draft": cm.gen },
  },
  {
    key: "announcements", id: T.announcements,
    update: [an.title, an.body, an.page, an.type, an.audience, an.pinned, an.date, an.status, an.expires],
    create: [an.title, an.body, an.page, an.type, an.audience, an.pinned, an.date, an.status, an.expires],
    /* Communications › Updates still sends the names from the original page */
    alias: { Title: an.title, Message: an.body, Page: an.page, Type: an.type, "Send To": an.audience, Pinned: an.pinned, "Publish At": an.date, Status: an.status, "Expires On": an.expires },
    convert: { [an.audience]: (v) => (Array.isArray(v) ? v.join(", ") : v), [an.date]: day, [an.expires]: day },
    typecast: false,
  },
];
const ruleFor = (table: unknown) => {
  const t = String(table ?? "");
  return RULES.find((r) => r.id === t || r.key === t || AT[r.key]?.name === t);
};

/** Maps the sent keys to field ids, applies the allow-list, converts values and checks select options. */
async function prepare(rule: TableRule, fields: unknown, allowed: string[]): Promise<Fields> {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new WriteError("fields must be an object");
  const schema = (await getSchema()).find((t) => t.id === rule.id);
  if (!schema) throw new WriteError(`${AT[rule.key]?.name || rule.key} isn't in Airtable`, 404);
  const out: Fields = {};
  const refused: string[] = [];
  for (const [k, v] of Object.entries(fields as Fields)) {
    const id = rule.alias?.[k] || (schema.fields.find((f) => f.id === k || f.name === k)?.id ?? "");
    if (!id || !allowed.includes(id)) {
      refused.push(id ? `“${schema.fields.find((f) => f.id === id)?.name}”` : `“${k}” (not in Airtable yet)`);
      continue;
    }
    const val = rule.convert?.[id] ? rule.convert[id](v) : v;
    const def = schema.fields.find((f) => f.id === id);
    if (def?.options?.choices && val != null && val !== "") {
      const vals = Array.isArray(val) ? val : [val];
      const bad = vals.filter((x) => !def.options!.choices!.some((c) => c.name === x));
      if (bad.length) throw new WriteError(`“${bad.join(", ")}” isn't an option of ${def.name} in Airtable`);
    }
    if ((def?.type === "multipleRecordLinks") && !(Array.isArray(val) && val.every((x) => typeof x === "string" && /^rec[A-Za-z0-9]{14}$/.test(x))))
      throw new WriteError(`${def.name} needs Airtable record ids`);
    out[id] = val;
  }
  if (refused.length) throw new WriteError(`Can't save ${refused.join(", ")} on ${schema.name} from this dashboard`, 403);
  if (!Object.keys(out).length) throw new WriteError("Nothing to save");
  return out;
}

async function recordOf(table: string, id: string, fields: string[]) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new WriteError("Not an Airtable record id");
  const [r] = await listRecords(table, { byFieldId: true, fields, filterByFormula: `RECORD_ID()='${id}'` });
  if (!r) throw new WriteError("Record not found", 404);
  return r;
}

export interface WriteBody {
  table?: string;
  recordId?: string;
  create?: boolean;
  fields?: unknown;
  action?: string;
  registryId?: string;
  notes?: string;
  assignee?: { kind?: string; id?: string };
}

export async function handleWrite(b: WriteBody): Promise<{ ok: true; id?: string }> {
  if (b.action) return handleAction(b);
  const rule = ruleFor(b.table);
  if (!rule) throw new WriteError(`This dashboard can't write to table ${String(b.table ?? "(none)")}`, 403);
  if (b.create) {
    if (!rule.create.length) throw new WriteError(`Creating ${AT[rule.key]?.name} records isn't allowed from this dashboard`, 403);
    const rec = await createRecord(rule.id, await prepare(rule, b.fields, rule.create), rule.create, rule.typecast ?? true);
    return { ok: true, id: rec.id };
  }
  if (!rule.update.length) throw new WriteError(`Editing ${AT[rule.key]?.name} records isn't allowed from this dashboard`, 403);
  const id = String(b.recordId ?? "");
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new WriteError("This row isn't an Airtable record (example data) — nothing to save");
  const rec = await updateRecord(rule.id, id, await prepare(rule, b.fields, rule.update), rule.update, rule.typecast ?? true);
  return { ok: true, id: rec.id };
}

const REG = F.registry, AR = F.antRequests;

async function handleAction(b: WriteBody): Promise<{ ok: true; id?: string }> {
  switch (b.action) {
    case "prantSweep":
      throw new WriteError("PRANT sweeps can't be started from the dashboard yet — no sweep runner is connected. Ask PRANT directly (ANT Requests) for now.", 501);
    case "dismissFix": {
      /* Dismiss = tag the IT & Systems Registry row "Out of Scope" (keeps its other tags) */
      const r = await recordOf(T.registry, String(b.registryId ?? ""), [REG.tags]);
      const tags = Array.isArray(r.fields[REG.tags]) ? (r.fields[REG.tags] as string[]) : [];
      if (!tags.includes("Out of Scope")) await updateRecord(T.registry, r.id, { [REG.tags]: [...tags, "Out of Scope"] }, [REG.tags], false);
      return { ok: true, id: r.id };
    }
    case "assignFix": {
      const kind = b.assignee?.kind, aid = String(b.assignee?.id ?? "");
      if (kind !== "ant")
        throw new WriteError("Assigning a fix to a person needs the IT & Systems Registry › Fix Task field, which isn't in Airtable yet. Pick an ANT instead.", 501);
      if (!/^rec[A-Za-z0-9]{14}$/.test(aid)) throw new WriteError("Pick an ANT from the ANT Library");
      const r = await recordOf(T.registry, String(b.registryId ?? ""), [REG.asset, REG.fix, REG.notes]);
      const notes = typeof b.notes === "string" ? b.notes.slice(0, 5000) : str(r.fields[REG.notes]);
      if (notes !== str(r.fields[REG.notes])) await updateRecord(T.registry, r.id, { [REG.notes]: notes }, [REG.notes], false);
      const asset = str(r.fields[REG.asset]) || "registry item";
      const desc = [str(r.fields[REG.fix]) && `Fix needed: ${str(r.fields[REG.fix])}`, notes && `Notes: ${notes}`, "Logged from the Product Dashboard (PRANT sweep finding)."]
        .filter(Boolean)
        .join("\n\n");
      const fields = {
        [AR.title]: `Fix: ${asset}`, [AR.desc]: desc, [AR.ant]: [aid], [AR.registry]: [r.id], [AR.origin]: "User", [AR.status]: "Not Started", [AR.location]: "Hub",
      };
      const req = await createRecord(T.antRequests, fields, Object.keys(fields), false);
      return { ok: true, id: req.id };
    }
    default:
      throw new WriteError(`Unknown action ${String(b.action)}`);
  }
}

/** Route-handler wrapper: JSON body in, {ok:false, error} with a matching status out. */
export async function respond(fn: () => Promise<object>) {
  try {
    return Response.json(await fn());
  } catch (e) {
    const status = e instanceof WriteError || e instanceof AirtableError ? (e.status >= 400 && e.status < 600 ? e.status : 502) : 500;
    if (status >= 500 && status !== 501) console.error("[product api]", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status });
  }
}

/** Optional shared key: when VCG_API_KEY is set, write routes require the x-vcg-key header the pages already send. */
export function checkKey(req: Request) {
  const key = process.env.VCG_API_KEY;
  if (key && req.headers.get("x-vcg-key") !== key) throw new WriteError("Missing or wrong x-vcg-key", 401);
}
