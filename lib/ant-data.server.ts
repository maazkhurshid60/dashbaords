import "server-only";
import { arr, bool, createRecord, updateRecord, links, listRecords, num, str, withFallback, type AtRecord } from "./airtable.server";
import { ANT_TABLES as T, type Ant, type AntData, type AntOption, type AntRequest, type AntRequestDetail, type ChatMsg, type Prompt, type QuickAssist } from "./ant-types";

/* ANT Connector — Airtable reads/writes (server only). Field names verified against the live
   schema of base appLH1D7ME6mU1zgE (note Airtable's own spellings: "Trigges & Workflows",
   "In the Qeue"). */

const AUDIT = (area: string) => ({ dashboard: "ANT Connector", area });
export const isRecId = (v: unknown): v is string => typeof v === "string" && /^rec[A-Za-z0-9]{14}$/.test(v);

/** aiText fields come back as {state, value}; only a generated value is usable. */
const aiText = (v: unknown) => (v && typeof v === "object" && "value" in v ? str((v as { value?: unknown }).value) : str(v));

const ANT_FIELDS = [
  "ANT Name",
  "Overview",
  "Related Department(s)",
  "Functions",
  "Expected Outputs",
  "Trigges & Workflows",
  "Active",
  "ANT BRAIN",
  "Brain Reference URL(s)",
  "ANT Hierarchy",
  "Related Quick Assists",
  "Prompt Library",
];

async function departmentNames() {
  const rows = await listRecords(T.departments, { fields: ["Department Name"] });
  return new Map(rows.map((r) => [r.id, str(r.fields["Department Name"])]));
}
const names = (ids: unknown, m: Map<string, string>) => links(ids).map((id) => m.get(id) || "").filter(Boolean);

function toAnt(r: AtRecord, d: Map<string, string>): Ant {
  const f = r.fields;
  return {
    id: r.id,
    name: str(f["ANT Name"]).trim(),
    hierarchy: str(f["ANT Hierarchy"]),
    active: bool(f.Active),
    overview: aiText(f.Overview),
    departments: names(f["Related Department(s)"], d),
    functions: str(f.Functions),
    outputs: str(f["Expected Outputs"]),
    triggers: str(f["Trigges & Workflows"]),
    brainChars: str(f["ANT BRAIN"]).trim().length,
    brainUrls: str(f["Brain Reference URL(s)"]),
    quickAssistIds: links(f["Related Quick Assists"]),
    promptIds: links(f["Prompt Library"]),
  };
}

const SNIPPET = 220;
function toRequest(r: AtRecord, d: Map<string, string>): AntRequest {
  const f = r.fields;
  return {
    id: r.id,
    num: num(f["ANT Request ID"]),
    title: str(f["Request Title"]).trim(),
    snippet: str(f["Request Description"]).slice(0, SNIPPET),
    location: str(f["Request Location"]),
    status: str(f.Status),
    priority: str(f.Priority),
    due: str(f["Due Date"]),
    queueType: str(f["Queue Type"]),
    origin: str(f["Request Origin"]),
    submitted: str(f["Date Submitted"]) || r.createdTime,
    completed: str(f["Date Completed"]),
    departments: names(f["Related Department"], d),
    antIds: links(f["Related ANT"]),
    quickAssistIds: links(f["Related Quick Assist"]),
  };
}

const REQUEST_LIST_FIELDS = [
  "Request Title",
  "Request Description",
  "Request Location",
  "ANT Request ID",
  "Related Department",
  "Related ANT",
  "Related Quick Assist",
  "Status",
  "Date Submitted",
  "Date Completed",
  "Request Origin",
  "Queue Type",
  "Priority",
  "Due Date",
];

async function loadAll(): Promise<AntData> {
  const d = await departmentNames();
  const [ants, qas, prompts, reqs] = await Promise.all([
    listRecords(T.library, { fields: ANT_FIELDS }),
    listRecords(T.quickAssists, {
      fields: ["Quick Assist Title", "Assigned Ant", "Related Department", "Trigger Type", "Request Preset", "Active", "Related Table(s)", "Prompt Library"],
    }),
    listRecords(T.prompts, {
      fields: ["Prompt Name", "Prompt Template", "Prompt Type", "Related ANT", "Omni-Ready", "Description", "Status", "Output Format", "Related Department(s)"],
    }),
    listRecords(T.requests, { fields: REQUEST_LIST_FIELDS, sort: [{ field: "Date Submitted", direction: "desc" }] }),
  ]);
  return {
    ants: ants.map((r) => toAnt(r, d)).filter((a) => a.name).sort((a, b) => a.name.localeCompare(b.name)),
    quickAssists: qas
      .map(
        (r): QuickAssist => ({
          id: r.id,
          title: str(r.fields["Quick Assist Title"]).trim(),
          antIds: links(r.fields["Assigned Ant"]),
          departments: names(r.fields["Related Department"], d),
          trigger: str(r.fields["Trigger Type"]),
          preset: str(r.fields["Request Preset"]),
          active: bool(r.fields.Active),
          tables: arr(r.fields["Related Table(s)"]),
          promptIds: links(r.fields["Prompt Library"]),
        }),
      )
      .filter((q) => q.title)
      .sort((a, b) => a.title.localeCompare(b.title)),
    prompts: prompts
      .map(
        (r): Prompt => ({
          id: r.id,
          name: str(r.fields["Prompt Name"]).trim(),
          template: str(r.fields["Prompt Template"]),
          type: str(r.fields["Prompt Type"]),
          antIds: links(r.fields["Related ANT"]),
          omniReady: bool(r.fields["Omni-Ready"]),
          description: str(r.fields.Description),
          status: str(r.fields.Status),
          outputFormat: str(r.fields["Output Format"]),
          departments: names(r.fields["Related Department(s)"], d),
        }),
      )
      .filter((p) => p.name || p.template)
      .sort((a, b) => a.name.localeCompare(b.name)),
    requests: reqs.map((r) => toRequest(r, d)),
    departments: [...d].map(([id, name]) => ({ id, name })).filter((x) => x.name).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

const EMPTY: AntData = { ants: [], quickAssists: [], prompts: [], requests: [], departments: [] };
/** Everything the /ant page needs. No example data: an Airtable failure shows an empty, flagged page. */
export const loadAntData = () => withFallback(loadAll, () => EMPTY);

/** ANTs for the chat widget picker (active first). */
export async function loadAntOptions(): Promise<AntOption[]> {
  const rows = await listRecords(T.library, { fields: ["ANT Name", "ANT Hierarchy", "Active"] });
  return rows
    .filter((r) => str(r.fields["ANT Name"]).trim() && bool(r.fields.Active))
    .map((r) => ({ id: r.id, name: str(r.fields["ANT Name"]).trim(), hierarchy: str(r.fields["ANT Hierarchy"]) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One request with its long fields (description, output, transcript). */
export async function loadRequestDetail(id: string): Promise<AntRequestDetail | null> {
  const [d, rows] = await Promise.all([
    departmentNames(),
    listRecords(T.requests, {
      filterByFormula: `RECORD_ID()='${id}'`,
      fields: [...REQUEST_LIST_FIELDS, "Output Summary", "Request Transcript", "Output URL", "Output URL(s)"],
    }),
  ]);
  const r = rows[0];
  if (!r) return null;
  return {
    ...toRequest(r, d),
    description: str(r.fields["Request Description"]),
    output: str(r.fields["Output Summary"]),
    transcript: str(r.fields["Request Transcript"]),
    outputUrls: [str(r.fields["Output URL"]), str(r.fields["Output URL(s)"])].filter(Boolean).join("\n"),
  };
}

/* ---------------------------------------------------------------- system prompt */
const BRAIN_MAX = 24_000;
const SECTION_MAX = 4_000;

/** Readable name of the dashboard a pathname belongs to. */
export function pageLabel(path: string) {
  const p = path.split(/[?#]/)[0];
  const map: [string, string][] = [
    ["/pics", "P.I.C.S Operations (projects, initiatives, campaigns, sprints and their reports)"],
    ["/productivity", "Productivity Center (meetings, weekly schedules, tasks, checklists)"],
    ["/product", "Product dashboard (acrylics.world features, backlog, feedback, releases)"],
    ["/communications", "Communications (inbox and updates)"],
    ["/departments", "Departments wiki"],
    ["/tools", "Tools library"],
    ["/resources", "Team Resources"],
    ["/ant", "ANT Connector (ANT directory, quick assists, prompt library, ANT requests)"],
  ];
  if (p === "/" || p === "") return "Home Command (intranet home)";
  return map.find(([k]) => p === k || p.startsWith(k + "/"))?.[1] || p.slice(0, 80);
}

const DEFAULT_ANT = [
  "You are the VCG Intranet assistant — the general orchestrator ANT for Vision Creative Group (VCG).",
  "VCG runs its operations through an Airtable-backed intranet: P.I.C.S (Projects, Initiatives, Campaigns, Sprints), Productivity (meetings, tasks, schedules), Product, Communications, Departments and the ANT Connector.",
  "ANTs are VCG's AI agents: Orchestrators route work, Master ANTs own a department, Command ANTs do specialised roles. When a request clearly belongs to a specialist ANT, say which one and suggest the user picks it in the ANT selector or files an ANT Request.",
].join("\n");

const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "\n…(truncated)" : s);

/** System prompt for the chat: the chosen ANT's brain + functions + outputs, or the default orchestrator, plus page context. */
export async function buildSystemPrompt(antId: string | undefined, context?: { page?: string; recordId?: string }) {
  let antName = "VCG Intranet assistant";
  const parts: string[] = [];
  if (antId && isRecId(antId)) {
    const rows = await listRecords(T.library, { fields: ANT_FIELDS, filterByFormula: `RECORD_ID()='${antId}'` });
    const r = rows[0];
    if (r) {
      const f = r.fields;
      antName = str(f["ANT Name"]).trim() || antName;
      const brain = str(f["ANT BRAIN"]).trim();
      parts.push(
        `You are ${antName}, a VCG ANT (${str(f["ANT Hierarchy"]) || "ANT"}) working inside Vision Creative Group's intranet.`,
        aiText(f.Overview) && `## Overview\n${cap(aiText(f.Overview), SECTION_MAX)}`,
        brain ? `## Your brain (operating instructions)\n${cap(brain, BRAIN_MAX)}` : "",
        str(f.Functions) && `## Functions\n${cap(str(f.Functions), SECTION_MAX)}`,
        str(f["Expected Outputs"]) && `## Expected outputs\n${cap(str(f["Expected Outputs"]), SECTION_MAX)}`,
        str(f["Trigges & Workflows"]) && `## Triggers & workflows\n${cap(str(f["Trigges & Workflows"]), SECTION_MAX)}`,
      );
    }
  }
  if (!parts.length) parts.push(DEFAULT_ANT);
  parts.push(
    "## How to answer",
    "Be concise and practical: short paragraphs or bullet lists. You cannot read or change Airtable from this chat — work only from what the user tells you and say when you need more information. Never invent record data, numbers or names.",
  );
  if (context?.page) {
    parts.push(`## Context\nThe user is on the ${pageLabel(context.page)} page${isRecId(context.recordId) ? ` (record ${context.recordId})` : ""}.`);
  }
  return { system: parts.filter(Boolean).join("\n\n"), antName };
}

/* ---------------------------------------------------------------- writes */
const WRITABLE = [
  "Request Title",
  "Request Description",
  "Request Transcript",
  "Request Location",
  "Status",
  "Request Origin",
  "Related ANT",
  "Related Department",
  "Related Quick Assist",
  "Priority",
  "Due Date",
  "Queue Type",
] as const;

export async function createAntRequest(fields: Record<string, unknown>, area: string) {
  const r = await createRecord(T.requests, fields, WRITABLE, false, AUDIT(area));
  return r.id;
}

export const transcriptText = (msgs: ChatMsg[], antName: string) =>
  msgs.map((m) => `${m.role === "user" ? "User" : antName}:\n${m.content.trim()}`).join("\n\n---\n\n");

/* ---------------------------------------------------------------- run (Airtable → Claude → Airtable)
   Loads an ANT Request, builds the prompt from its Related ANT's brain + Related Quick Assist's
   Request Preset + Request Description, calls Claude, writes Output Summary + Status "Completed"
   + Date Completed back. Used by POST /api/ant/run. */
export const RUNNABLE = ["Not Started", "Pending", "In the Qeue"];

export async function runAntRequest(id: string, call: (system: string, msgs: ChatMsg[]) => Promise<{ reply: string }>) {
  const rows = await listRecords(T.requests, {
    filterByFormula: `RECORD_ID()='${id}'`,
    fields: ["Request Title", "Request Description", "Related ANT", "Related Quick Assist", "Status"],
  });
  const r = rows[0];
  if (!r) throw new Error("ANT Request not found");
  const status = str(r.fields.Status);
  if (status && !RUNNABLE.includes(status)) throw new Error(`Request is ${status}; only ${RUNNABLE.join(", ")} can be run`);
  const antId = links(r.fields["Related ANT"])[0];
  const qaId = links(r.fields["Related Quick Assist"])[0];
  let preset = "";
  if (qaId) {
    const qa = await listRecords(T.quickAssists, { filterByFormula: `RECORD_ID()='${qaId}'`, fields: ["Quick Assist Title", "Request Preset"] });
    if (qa[0]) preset = `Quick Assist: ${str(qa[0].fields["Quick Assist Title"])}\n${str(qa[0].fields["Request Preset"])}`;
  }
  const { system } = await buildSystemPrompt(antId);
  const body = [
    `ANT Request: ${str(r.fields["Request Title"]) || "(untitled)"}`,
    preset && cap(preset, SECTION_MAX),
    str(r.fields["Request Description"]) && `Request description:\n${cap(str(r.fields["Request Description"]), 20_000)}`,
    "Produce the requested output. Start with a one-paragraph summary.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const { reply } = await call(system, [{ role: "user", content: body }]);
  await updateRecord(
    T.requests,
    id,
    { "Output Summary": reply.slice(0, 95_000), Status: "Completed", "Date Completed": new Date().toISOString() },
    ["Output Summary", "Status", "Date Completed"],
    false,
    AUDIT("Run request"),
  );
  return reply;
}
