import "server-only";
import { airtableConfigured, arr, bool, getSchema, links, listRecords, num, str, type AtRecord, type TableSchema } from "./airtable.server";
import { AT, COMMS_NEW_ITEMS, NEW_ITEMS } from "./product-data";
import type {
  Account, Announcement, Attachment, BacklogItem, Feature, Feedback, Finding, Gate, GtmLaunch, HealthRow, Named, PagePerf, Persona, Pics,
  PicsRow, ChecklistItem, Release, RevenueRow, SpendRow, Ticket,
} from "./product-types";

/* Server-side loaders for GET /api/product/data and GET /api/comms/data (and the pages'
   first render). They read Airtable by field ID (stable across renames) and return exactly
   the payload the suite's loadLive()/merge expects:
     { ok, data: { <dataset key>: rows in the same shape as buildSample() }, syncedAt, warnings, missing }
   A key that is absent from `data` is emptied by merge (live mode never shows sample rows). */

export interface LivePayload {
  ok: boolean;
  data?: Record<string, unknown>;
  syncedAt: string;
  warnings: string[];
  missing: string[];
  error?: string;
}

/* ---------------------------------------------------------------- field IDs read here
   (AT in product-data.ts covers what the UI writes; these are the extra read-only columns) */
export const T = {
  features: AT.features.id!, feedback: AT.feedback.id!, personas: AT.personas.id!, accounts: AT.accounts.id!, releases: AT.releases.id!,
  backlog: AT.backlog.id!, health: AT.health.id!, revenue: AT.revenue.id!, spend: AT.spend.id!, gtm: AT.gtm.id!, gates: AT.gates.id!,
  pics: AT.pics.id!, registry: AT.registry.id!, checklist: AT.checklist.id!, pagePerf: AT.pagePerf.id!, pages: AT.pages.id!,
  comms: AT.comms.id!, roadmaps: AT.roadmaps.id!, announcements: AT.announcements.id!,
  channels: "tblkriQMXE8DULOFT", team: "tbl35kTjgPye2KTQ0", ants: "tbldfHdLTG8FEIY1f", depts: "tblC2JxYOcofjMbFm", antRequests: "tbl9GARyj0MjQXV6e",
} as const;
/** AT's field map + extra read-only ids (keeps AT's string index so both kinds of key type-check) */
const ext = <E extends Record<string, string>>(base: Record<string, string> | undefined, extra: E) => ({ ...base, ...extra }) as Record<string, string> & E;
export const F = {
  gates: ext(AT.gates.f, { owner: "fldr3fvvPxVRdlYFf" }),
  channels: { name: "fldUA87o9LQld1UFo", cac: "fldbVABdA6TNvX9XJ" },
  pics: { name: "fldsujoG3gfpqE6vm", type: "fldexMQgfdpKDmWMF", stage: "fld4RzSQZB9T37lRi", start: "fldlFSSl63AoaIxRf", end: "fldkb1akaHvHJuq3a", depts: "fldaw8x5clfPjSzdG", hierarchy: "fldUwIfCUdFs50I4w", parent: "fldnFKu1opYq7XxEn" },
  roadmaps: ext(AT.roadmaps.f, { phase: "fldhJzEOVmjN3OPMw", start: "fld5yMQxENB5ycKWR", due: "fldZDzM9FM6Peqo9a" }),
  checklist: ext(AT.checklist.f, { num: "fldScpbt8Wq01i6Qc", type: "fldmV66OHFncsWLSd", owners: "fldzx8pYIWD7aHUQD", pics: "flddJfG5oupSdgjij" }),
  registry: {
    asset: "fldU1vOWqIdUW3hQI", type: "fldxoqGiwdWBvbeU7", sync: "fldni3Kym2nBzd5Pv", health: "fldfHFgmg98rVueNo", swept: "fldCkMNh5xpxc7aWS", page: "fld0QInwE34JE11ar",
    env: "fldg2zQmwAu2kSAlF", notes: "fldjihLSQSfA8D4DQ", fix: "fldop9mM500hhOU37", antReqs: "fldauiFZ64BZoKnDn", tags: "fldvWGcbW8XnPn326",
  },
  antRequests: {
    title: "fldlEJ9uf7gSJGcgy", desc: "fldwnpEcBuDFuVj7b", ant: "fld4vapbslxnd23Ct", registry: "fld6PBARaieWhKqsL", origin: "fldMz20Z3mBqSPzIo", status: "fld3jFJ0WY7X9HVqV", location: "fldT5jnjppTriIUxe",
  },
  team: { name: "fld08qhL0Fq78SPjm", active: "fldh1Zdv9TmlrP5dC" },
  ants: { name: "fld1vCaYTOU03ENoe" },
  depts: { name: "fldTKeTziMG0KSBAz" },
  pages: { name: "fldbfWRynoGNWOm3v" },
  pagePerf: { name: "fldFluISDVjoEADcy", page: "fld5E6Jqtw3A7Suvb", views: "fld2X4EkvEzYjfk05", conv: "fldtqbIZml4NVpuLs", bounce: "fldCySxO4fVIPdWse", time: "fldoCjv9dPK78GYcP" },
  comms: ext(AT.comms.f, {
    subject: "fldP3jaZtgQOoHbAq", date: "fldGdvUX9Bj70BMpp", category: "fldz0c9IVO832SHh4", channel: "fldHNLnrWN0Adh2my", from: "fld75FkR9tu4lifK9",
    to: "fldJKrH23eNQmWEiI", thread: "fldQ7TXMYt4p8ReRW", body: "fld3ziyHtdB8AG1pc", attachments: "fldMgF75V9pw9Adzm", attSummary: "fldXtwNhtgWv6nDD0",
    draftLink: "fldwjq1RJE08GkMHq", rt: "fldhMzoqYSwCjj8UQ", reopened: "fldPwGdnXtAcef24o", direction: "fldBmzLVhpTzUYoPJ",
  }),
  announcements: ext(AT.announcements.f, { dept: "fldESZVZ5FP8SSArR", by: "fldtMBmzTKx9xeqS9", files: "fldpyyrnTA0Gb75Oy" }),
} as const;

type R = AtRecord;
const get = (r: R, id: string) => r.fields[id];
const s = (r: R, id: string) => str(get(r, id)).trim();
const d10 = (v: unknown) => (v ? String(v).slice(0, 10) : "");
const nameMap = (rows: R[], fid: string) => new Map(rows.map((r) => [r.id, s(r, fid)]));
const namesOf = (m: Map<string, string>, v: unknown) => links(v).map((id) => m.get(id) || "").filter(Boolean);
/** aiText fields come back as {state, value}; everything else as plain values. */
const aiText = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? String((v as { value?: unknown }).value ?? "") : str(v));
const list = (table: string, fields: Record<string, string>) => listRecords(table, { byFieldId: true, fields: Object.values(fields) });

/* ---------------------------------------------------------------- sync gate
   Each NEW_ITEMS key is "Table", "Table.Field" or "Table.Field: Choice"; it's missing when the
   live schema doesn't have it. Field ids in AT that no longer exist are reported as warnings. */
export function missingFrom(schema: TableSchema[], items: string[]) {
  return items.filter((key) => {
    const dot = key.indexOf(".");
    const tName = dot < 0 ? key : key.slice(0, dot);
    const t = schema.find((x) => x.name === tName);
    if (!t) return true;
    if (dot < 0) return false;
    const [fName, choice] = key.slice(dot + 1).split(": ");
    const f = t.fields.find((x) => x.name === fName);
    if (!f) return true;
    return !!choice && !(f.options?.choices || []).some((c) => c.name === choice);
  });
}
function schemaWarnings(schema: TableSchema[]) {
  const out: string[] = [];
  for (const [key, t] of Object.entries(AT)) {
    if (!t.id) continue;
    const st = schema.find((x) => x.id === t.id);
    if (!st) {
      out.push(`Airtable table ${t.name} (${t.id}) not found`);
      continue;
    }
    for (const [k, fid] of Object.entries(t.f || {}))
      if (!st.fields.some((f) => f.id === fid)) out.push(`${t.name}: field "${key}.${k}" (${fid}) not found`);
  }
  return out;
}
/* ---------------------------------------------------------------- select options
   Every select the UI writes gets its choices from the live schema (data.options), so the pages
   never offer a value Airtable doesn't have. Keys are "<AT key>.<field key>". */
export const OPTION_FIELDS: Record<string, [tableId: string, fieldId: string]> = {
  "features.status": [AT.features.id!, AT.features.f!.status],
  "gates.status": [AT.gates.id!, AT.gates.f!.status],
  "checklist.status": [AT.checklist.id!, AT.checklist.f!.status],
  "roadmaps.type": [AT.roadmaps.id!, AT.roadmaps.f!.type],
  "roadmaps.status": [AT.roadmaps.id!, AT.roadmaps.f!.status],
  "feedback.source": [AT.feedback.id!, AT.feedback.f!.source],
  "feedback.sentiment": [AT.feedback.id!, AT.feedback.f!.sentiment],
  "comms.status": [AT.comms.id!, AT.comms.f!.status],
  "comms.intent": [AT.comms.id!, AT.comms.f!.intent],
  "comms.channel": [AT.comms.id!, "fldHNLnrWN0Adh2my"],
  "announcements.type": [AT.announcements.id!, AT.announcements.f!.type],
  "announcements.page": [AT.announcements.id!, AT.announcements.f!.page],
  "announcements.status": [AT.announcements.id!, AT.announcements.f!.status],
};
export function optionsFrom(schema: TableSchema[], keys: string[]) {
  const out: Record<string, string[]> = {};
  for (const k of keys) {
    const [tid, fid] = OPTION_FIELDS[k];
    const choices = schema.find((t) => t.id === tid)?.fields.find((f) => f.id === fid)?.options?.choices;
    if (choices?.length) out[k] = choices.map((c) => c.name);
  }
  return out;
}
const PRODUCT_OPTIONS = ["features.status", "gates.status", "checklist.status", "roadmaps.type", "roadmaps.status", "feedback.source", "feedback.sentiment"];
const COMMS_OPTIONS = ["comms.status", "comms.intent", "comms.channel", "announcements.type", "announcements.page", "announcements.status"];

const describe = (m: string) => (m.includes(".") ? `${m.replace(".", " › ")} (field not in Airtable yet)` : `${m} (table not in Airtable yet)`);

/** Runs every section loader; a failing section is reported in warnings and left out (merge empties it). */
async function sections(loaders: Record<string, () => Promise<unknown>>, warnings: string[]) {
  const data: Record<string, unknown> = {};
  await Promise.all(
    Object.entries(loaders).map(async ([k, fn]) => {
      try {
        data[k] = await fn();
      } catch (e) {
        warnings.push(`Couldn't read ${k}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),
  );
  return data;
}

/* ---------------------------------------------------------------- shared reads */
const loadTeam = async () => {
  const rows = await list(T.team, F.team);
  const all = nameMap(rows, F.team.name);
  const active: Named[] = rows.filter((r) => bool(get(r, F.team.active))).map((r) => ({ id: r.id, name: s(r, F.team.name) })).sort((a, b) => a.name.localeCompare(b.name));
  return { all, active };
};
const loadAnts = async () => {
  const rows = await list(T.ants, F.ants);
  const all = nameMap(rows, F.ants.name);
  /* the ANT roster = coded ANTs (PRANT, DEVANT, OPANT…), not the Command-ANT job titles */
  const coded: Named[] = rows.map((r) => ({ id: r.id, name: s(r, F.ants.name) })).filter((a) => /^[A-Z]{2,}ANT$/.test(a.name)).sort((a, b) => a.name.localeCompare(b.name));
  return { all, coded };
};
const loadDepts = async () => (await list(T.depts, F.depts)).map((r) => ({ id: r.id, name: s(r, F.depts.name) })).filter((d) => d.name);

/* ---------------------------------------------------------------- P.I.C.S (+ Roadmaps, Checklist) */
async function loadPics(productDeptId: string | undefined, team: Map<string, string>): Promise<Pics[]> {
  const [pRows, rRows, cRows] = await Promise.all([list(T.pics, F.pics), list(T.roadmaps, F.roadmaps), list(T.checklist, F.checklist)]);
  const pics: Pics[] = pRows.map((r) => {
    const hier = s(r, F.pics.hierarchy);
    return {
      id: r.id, type: s(r, F.pics.type) || "Project", name: s(r, F.pics.name), stage: s(r, F.pics.stage), start: d10(get(r, F.pics.start)), end: d10(get(r, F.pics.end)),
      /* "Related Parent/Child/Subchild" on a Child/Sub-child points at its parent */
      parentId: hier && hier !== "Parent" ? links(get(r, F.pics.parent))[0] || null : null,
      tagged: !productDeptId || links(get(r, F.pics.depts)).includes(productDeptId), rows: [], checklist: [],
    };
  });
  const byId = new Map(pics.map((p) => [p.id, p]));
  const depth = (id: string) => {
    let n = 0;
    for (let p = byId.get(id); p?.parentId && n < 10; p = byId.get(p.parentId)) n++;
    return n;
  };
  /* a row linked to a parent and its child belongs to the most specific one (no double counting) */
  const home = (v: unknown) => links(v).filter((id) => byId.has(id)).sort((a, b) => depth(b) - depth(a))[0];
  const roadTitle = new Map<string, string>();
  for (const r of rRows) {
    const label = s(r, F.roadmaps.title);
    roadTitle.set(r.id, label);
    const p = home(get(r, F.roadmaps.pics));
    if (!p) continue;
    const row: PicsRow = {
      label, type: s(r, F.roadmaps.type), date: d10(get(r, F.roadmaps.due) || get(r, F.roadmaps.start)), phase: s(r, F.roadmaps.phase), status: s(r, F.roadmaps.status) || "Not Started",
    };
    byId.get(p)!.rows.push(row);
  }
  for (const r of cRows) {
    const p = home(get(r, F.checklist.pics));
    if (!p) continue;
    const c: ChecklistItem = {
      id: r.id, item: s(r, F.checklist.item), due: d10(get(r, F.checklist.due)) || null, status: s(r, F.checklist.status) || "Not Started",
      type: s(r, F.checklist.type) || "Deliverable", notes: s(r, F.checklist.notes), roadmap: links(get(r, F.checklist.roadmap)).map((id) => roadTitle.get(id) || "").filter(Boolean).join(", "),
      owners: namesOf(team, get(r, F.checklist.owners)), num: num(get(r, F.checklist.num)) ?? undefined,
    };
    byId.get(p)!.checklist.push(c);
  }
  for (const p of pics) {
    p.rows.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    p.checklist.sort((a, b) => (a.num ?? 999) - (b.num ?? 999) || (a.due || "").localeCompare(b.due || ""));
  }
  return pics;
}

/* ---------------------------------------------------------------- IT & Systems Registry → PRANT sweep findings */
async function loadSweep(ants: Map<string, string>, pageNames: Map<string, string>) {
  const rows = await list(T.registry, F.registry);
  const reqIds = rows.flatMap((r) => links(get(r, F.registry.antReqs)));
  const reqs = new Map<string, { title: string; ant: string }>();
  if (reqIds.length) {
    const formula = `OR(${[...new Set(reqIds)].slice(0, 80).map((id) => `RECORD_ID()='${id}'`).join(",")})`;
    const rr = await listRecords(T.antRequests, { byFieldId: true, fields: [F.antRequests.title, F.antRequests.ant], filterByFormula: formula });
    rr.forEach((r) => reqs.set(r.id, { title: s(r, F.antRequests.title), ant: namesOf(ants, get(r, F.antRequests.ant))[0] || "" }));
  }
  const sev = (h: string) => (h === "Broken" ? "High" : ["Small Kinks", "Incomplete"].includes(h) ? "Medium" : "Low");
  let lastRun: string | null = null;
  const findings: Finding[] = rows.map((r) => {
    const health = s(r, F.registry.health);
    const tags = arr(get(r, F.registry.tags));
    const swept = str(get(r, F.registry.swept));
    if (swept && (!lastRun || swept > lastRun)) lastRun = swept;
    const antReqs = links(get(r, F.registry.antReqs)).map((id) => ({ id, ...(reqs.get(id) || { title: "ANT Request", ant: "" }) }));
    return {
      id: r.id, asset: s(r, F.registry.asset) || "(unnamed asset)", type: s(r, F.registry.type), health, page: namesOf(pageNames, get(r, F.registry.page)).join(", "),
      env: s(r, F.registry.env), sync: s(r, F.registry.sync), swept: d10(swept), tags, fix: s(r, F.registry.fix), notes: s(r, F.registry.notes), antReqs, task: null,
      sev: sev(health), status: tags.includes("Out of Scope") ? "Dismissed" : antReqs.length ? "Assigned" : "To do", assignee: antReqs[0]?.ant || "",
    };
  });
  return { lastRun, findings };
}

/* ---------------------------------------------------------------- Product */
const ROAD_COL: Record<string, string> = { Live: "Now", QA: "Now", "In Development": "Now", "In Discovery": "Next" };

export async function loadProductPayload(): Promise<LivePayload> {
  const syncedAt = new Date().toISOString();
  if (!airtableConfigured()) return { ok: false, error: "AIRTABLE_TOKEN not set", syncedAt, warnings: [], missing: NEW_ITEMS };
  let schema: TableSchema[];
  try {
    schema = await getSchema();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), syncedAt, warnings: [], missing: NEW_ITEMS };
  }
  const missing = missingFrom(schema, NEW_ITEMS);
  const warnings = [...missing.map(describe), ...schemaWarnings(schema)];

  /* lookups shared by several sections */
  const [team, ants, depts, personaRows, featureRows, pageRows] = await Promise.all([
    loadTeam(), loadAnts(), loadDepts(), list(T.personas, AT.personas.f!), list(T.features, AT.features.f!), list(T.pages, F.pages),
  ]);
  const P = AT.personas.f!, FF = AT.features.f!;
  const personaName = nameMap(personaRows, P.name);
  const pageNames = nameMap(pageRows, F.pages.name);
  const productDept = depts.find((d) => d.name === "Product")?.id;
  /** Pricing Tier says "Enterprise", the persona is "ACRYLICS Trends (B2B Enterprise)" */
  const tierName = (t: string) => (!t ? "" : [...personaName.values()].find((n) => n === t) || [...personaName.values()].find((n) => n.includes(t)) || t);

  const data = await sections(
    {
      async personas() {
        return personaRows
          .filter((r) => s(r, P.name))
          .map((r): Partial<Persona> => ({ id: r.id, name: s(r, P.name), summary: s(r, P.summary), objectives: s(r, P.objectives), pains: s(r, P.pains) }));
      },
      async pics() {
        return loadPics(productDept, team.all);
      },
      async features() {
        /* Product Features has no P.I.C.S link: a feature belongs to the sprint its backlog items sit in */
        const bl = await list(T.backlog, AT.backlog.f!);
        const picsOf = new Map<string, string>();
        bl.forEach((b) => links(get(b, AT.backlog.f!.feature)).forEach((fid) => !picsOf.has(fid) && links(get(b, AT.backlog.f!.sprint))[0] && picsOf.set(fid, links(get(b, AT.backlog.f!.sprint))[0])));
        return featureRows.map((r): Feature => {
          const status = s(r, FF.status) || "Backlog";
          return {
            id: r.id, name: s(r, FF.name) || "(unnamed feature)", area: "", status, roadmap: ROAD_COL[status] || "Later", quarter: "", start: "", end: "",
            personas: namesOf(personaName, get(r, FF.personas)), reach: 0, impact: 0, confidence: 0, effort: 1, objective: "", votes: 0, core: s(r, FF.core),
            portal: false, pics: picsOf.get(r.id) || null,
          };
        });
      },
      async areas() {
        return [];
      },
      async feedback() {
        const B = AT.feedback.f!;
        const rows = await list(T.feedback, B);
        return rows
          .map((r): Feedback => {
            const sentiment = s(r, B.sentiment) || "Medium";
            return {
              id: r.id, fid: s(r, B.fid) || r.id.slice(-6), summary: s(r, B.summary), source: s(r, B.source), account: s(r, B.account) || "—", persona: "Unassigned", sentiment,
              importance: sentiment === "Critical" ? "Critical" : sentiment === "High" ? "Important" : "Nice to have", theme: null,
              feature: links(get(r, B.feature))[0] || null, date: d10(get(r, B.date)) || d10(r.createdTime), status: "Unprocessed", notified: false,
            };
          })
          .sort((a, b) => b.date.localeCompare(a.date));
      },
      async accounts() {
        const A = AT.accounts.f!;
        const rows = await list(T.accounts, A);
        return rows.map((r): Account => {
          const ltv = num(get(r, A.ltv)) || 0;
          return {
            id: r.id, ref: s(r, A.ref) || r.id.slice(-6), tier: tierName(s(r, A.tier)), status: s(r, A.status), stage: "", signup: d10(get(r, A.signup)) || d10(r.createdTime),
            churn: d10(get(r, A.churn)) || null, mrr: 0, ltv, nps: null, geo: "", lat: 0, lng: 0, used: [], channel: "",
          };
        });
      },
      async revenue() {
        const V = AT.revenue.f!;
        const rows = await list(T.revenue, V);
        const m = new Map<string, RevenueRow>();
        rows.forEach((r) => {
          const month = d10(get(r, V.period)).slice(0, 7);
          if (!month) return;
          const row = m.get(month) || { month, projected: 0, actual: null };
          row.projected += num(get(r, V.projected)) || 0;
          const a = num(get(r, V.actual));
          if (a != null) row.actual = (row.actual || 0) + a;
          m.set(month, row);
        });
        return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
      },
      async channels() {
        return (await list(T.channels, F.channels)).filter((r) => s(r, F.channels.name)).map((r) => ({ name: s(r, F.channels.name), cac: num(get(r, F.channels.cac)) || 0 }));
      },
      async spend() {
        const X = AT.spend.f!;
        return (await list(T.spend, X)).map(
          (r): SpendRow => ({
            tool: s(r, X.tool), vendor: s(r, X.vendor), cost: num(get(r, X.cost)) || 0, category: s(r, X.category), status: s(r, X.status), renewal: d10(get(r, X.renewal)) || null, real: true,
          }),
        );
      },
      async backlog() {
        const Bk = AT.backlog.f!;
        return (await list(T.backlog, Bk)).map(
          (r): BacklogItem => ({
            id: r.id, title: s(r, Bk.title) || "(untitled)", product: s(r, Bk.product), feature: links(get(r, Bk.feature))[0] || null, epic: s(r, Bk.epic),
            points: num(get(r, Bk.points)) || 0, eng: s(r, Bk.eng), blocked: links(get(r, Bk.blockers)).length > 0,
          }),
        );
      },
      async health() {
        const H = AT.health.f!;
        return (await list(T.health, H)).map(
          (r): HealthRow => ({ comp: s(r, H.comp) || "(unnamed component)", owner: s(r, H.owner), sev: s(r, H.sev), uptime: num(get(r, H.uptime)), sec: s(r, H.sec), debt: s(r, H.debt) }),
        );
      },
      async gates() {
        const G = F.gates;
        return (await list(T.gates, G)).map(
          (r): Gate => ({ id: r.id, name: s(r, G.name) || "(unnamed check)", owner: namesOf(ants.all, get(r, G.owner)).join(", "), status: s(r, G.status) || "Not Started", evidence: s(r, G.evidence) || s(r, G.desc) }),
        );
      },
      async gtm() {
        const G = AT.gtm.f!;
        return (await list(T.gtm, G)).map(
          (r): GtmLaunch => ({ name: s(r, G.name), date: d10(get(r, G.date)), status: s(r, G.status), personas: namesOf(personaName, get(r, G.personas)), assets: arr(get(r, G.assets)), sample: false }),
        );
      },
      async releases() {
        const Rl = AT.releases.f!;
        return (await list(T.releases, Rl))
          .map((r): Release => ({ version: s(r, Rl.version) || "(no version)", date: d10(get(r, Rl.date)), env: s(r, Rl.env), status: s(r, Rl.status), features: links(get(r, Rl.features)), notes: s(r, Rl.notes) }))
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      },
      async pagePerf() {
        const G = F.pagePerf;
        return (await list(T.pagePerf, G))
          .map((r): PagePerf => ({
            page: namesOf(pageNames, get(r, G.page))[0] || s(r, G.name), views: num(get(r, G.views)) || 0, conv: num(get(r, G.conv)) || 0, bounce: num(get(r, G.bounce)) || 0,
            time: num(get(r, G.time)) || 0, lcp: 0, status: "",
          }))
          .filter((p) => p.page && p.views > 0);
      },
      async sweep() {
        return loadSweep(ants.all, pageNames);
      },
      async sitemapTotal() {
        return pageRows.length;
      },
      async ants() {
        return ants.coded;
      },
      async team() {
        return team.active;
      },
      async options() {
        return optionsFrom(schema, PRODUCT_OPTIONS);
      },
      /* Goals / Objectives, sprint velocity, cohorts, experiments, adoption, themes: no Airtable source
         the dashboard reads yet — left out so live mode shows them empty instead of example rows. */
    },
    warnings,
  );
  return { ok: true, data, syncedAt, warnings, missing };
}

/* ---------------------------------------------------------------- Communications */
const BODY_MAX = 8000;

export async function loadCommsPayload(): Promise<LivePayload> {
  const syncedAt = new Date().toISOString();
  if (!airtableConfigured()) return { ok: false, error: "AIRTABLE_TOKEN not set", syncedAt, warnings: [], missing: COMMS_NEW_ITEMS };
  let schema: TableSchema[];
  try {
    schema = await getSchema();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), syncedAt, warnings: [], missing: COMMS_NEW_ITEMS };
  }
  const missing = missingFrom(schema, COMMS_NEW_ITEMS);
  const warnings = missing.map(describe);
  const [team, deptList] = await Promise.all([loadTeam(), loadDepts()]);
  const deptName = new Map(deptList.map((d) => [d.id, d.name]));
  const C = F.comms;
  const data = await sections(
    {
      async tickets() {
        const rows = await list(T.comms, C);
        return rows
          .map((r): Ticket => {
            const body = s(r, C.body);
            const att = Array.isArray(get(r, C.attachments)) ? (get(r, C.attachments) as { filename?: string; size?: number; url?: string; thumbnails?: { small?: { url?: string } } }[]) : [];
            const attachments: Attachment[] = att.map((a) => ({ name: a.filename || "attachment", size: a.size ?? null, url: a.url || null, thumb: a.thumbnails?.small?.url }));
            const t: Ticket = {
              id: r.id, from: s(r, C.from), subject: s(r, C.subject) || "(no subject)", date: str(get(r, C.date)) || r.createdTime, status: s(r, C.status) || "New",
              intent: s(r, C.intent), needs: bool(get(r, C.needs)), channel: s(r, C.channel) || "Email", dir: s(r, C.direction) || s(r, C.category) || "Incoming",
              to: s(r, C.to), body: body.length > BODY_MAX ? body.slice(0, BODY_MAX) + "…" : body, notes: s(r, C.notes), draft: s(r, C.draft),
              assignee: namesOf(team.all, get(r, C.assignee))[0] || "", rt: num(get(r, C.rt)), reopened: bool(get(r, C.reopened)), logged: r.createdTime,
            };
            const thread = s(r, C.thread);
            if (thread) t.thread = thread;
            if (attachments.length) t.attachments = attachments;
            const sum = aiText(get(r, C.attSummary)).trim();
            if (sum) t.attSummary = sum;
            const link = s(r, C.draftLink);
            if (link) t.draftLink = link;
            return t;
          })
          .sort((a, b) => b.date.localeCompare(a.date));
      },
      async team() {
        return team.active;
      },
      async depts() {
        return deptList;
      },
      async options() {
        return optionsFrom(schema, COMMS_OPTIONS);
      },
      async announcements() {
        if (missing.includes("Announcements")) return [];
        const A = F.announcements;
        const rows = await list(T.announcements, A);
        return rows
          .map((r): Announcement => {
            const files = Array.isArray(get(r, A.files)) ? (get(r, A.files) as { filename?: string }[]).map((f) => f.filename || "file") : [];
            return {
              id: r.id, title: s(r, A.title) || "(untitled)", body: s(r, A.body), page: s(r, A.page) || "Home", dept: links(get(r, A.dept)).map((id) => deptName.get(id) || "").filter(Boolean)[0] || "",
              type: s(r, A.type) || "Announcement", to: s(r, A.audience).split(/\s*,\s*/).filter(Boolean), status: s(r, A.status) || "Draft",
              date: d10(get(r, A.date)) || r.createdTime, expires: d10(get(r, A.expires)), pinned: bool(get(r, A.pinned)), by: namesOf(team.all, get(r, A.by))[0] || "", files,
            };
          })
          .sort((a, b) => b.date.localeCompare(a.date));
      },
    },
    warnings,
  );
  return { ok: true, data, syncedAt, warnings, missing };
}
