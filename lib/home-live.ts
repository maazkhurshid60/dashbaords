import "server-only";
import { cache } from "react";
import { arr, bool, getSchema, links, listRecords, num, str, withFallback } from "@/lib/airtable.server";
import { DEPT_DASH, FIELD_DASH, FIELD_MAP, RESOURCE_TILE_PAGES } from "@/lib/home-wiki";
import {
  AIRTABLE,
  DEPARTMENTS,
  FAQS,
  KPIS,
  NAV_CARDS,
  RESOURCES,
  RESOURCES_LINK,
  SUB_DASHBOARDS,
  TOOLS,
  homeSnapshot,
  type Department,
  type Goal,
  type HomeData,
  type Kpi,
  type Resource,
  type ResourceDoc,
  type Tool,
  type Update,
} from "@/lib/home-data";

/* Home Command, read live from the VCG Intranet base. Each section maps onto the table that
   actually holds it; nav cards, FAQ and sub-dashboard links are navigation/help text and stay
   in lib/home-data.ts. Every table read goes through listRecords (60s fetch cache), and
   loadHome() is wrapped in React cache() so the page renders from one load per request. */

const T = {
  departments: "tblC2JxYOcofjMbFm",
  announcements: "tblsFJrIbGx7qNJEx",
  antRequests: "tbl9GARyj0MjQXV6e",
  teamMembers: "tbl35kTjgPye2KTQ0",
  pics: "tblbiIHxN97iyltFY",
  goals: "tblcSUspCdafrVNUs",
  tools: "tblN0EaLqeuMO0ZHr",
  employeeResources: "tbliNj1nQxrrYR3Vt",
  prompts: "tbl0wslF9EKF86ivf",
  profDev: "tblhfMMEKlY1BKqLc",
  socialImpact: "tblIKKYzdHyYYE63T",
  roadmaps: "tblTo1C185aBEIshk",
  reports: "tblRxHSe5HyDPLTZR",
  tasks: "tblyOuPIvgifN4OOQ",
  metrics: "tbldU3DivAgPK5R5O",
  masterPlans: "tbl0UFVYkjJrsQDT5",
} as const;

const recordUrl = (table: string, id: string) => `${AIRTABLE}/${table}/${id}`;

/* ANT Request statuses that still need work ("In the Qeue" is spelled that way in the base). */
const OPEN_ANT = new Set(["In the Qeue", "In Progress", "Pending", "Not Started"]);
const MONTH_Q: Record<string, string> = {
  January: "Q1", February: "Q1", March: "Q1", April: "Q2", May: "Q2", June: "Q2",
  July: "Q3", August: "Q3", September: "Q3", October: "Q4", November: "Q4", December: "Q4",
};
const UNNAMED = "Unnamed record";
const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const PALETTE = ["#3C6CFF", "#6A4EB0", "#4EA958", "#D9A400", "#E14545", "#22232F", "#00A3A3", "#C2410C"];

function hashColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Brand mark for a tool: the client's glyph/colour when known ("Canva (MCP)" → Canva), else its initial. */
function brandMark(name: string) {
  const base = name.replace(/\s*\(.*\)\s*$/, "").trim();
  const known = TOOLS.find((t) => t.name.toLowerCase() === base.toLowerCase());
  return known ? { glyph: known.glyph, color: known.color } : { glyph: base.charAt(0).toUpperCase() || "?", color: hashColor(base) };
}

const DAY = 86_400_000;
function ago(iso: string, now: number) {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function loadLive(): Promise<HomeData> {
  const nameMap = async (table: string, field: string) =>
    new Map((await listRecords(table, { fields: [field] })).map((r) => [r.id, str(r.fields[field]).trim()]));
  const [deptRecs, annRecs, antRecs, memberRecs, picsRecs, goalRecs, toolRecs, docRecs, promptRecs, profDevRecs, impactRecs, roadmapName, reportName, taskName, metricName, planName] = await Promise.all([
    listRecords(T.departments, {
      fields: [
        "Department Name", "Department Overview", "Department Color", "Department Head(s)", "Team Members", "P.I.C.S 2",
        "Tool Registry & Access Log", "Dept. Org Chart", "Annual Budget", "Department Goals", "Employee Resources", "Professional Development",
        "Divisions", "ANT Library", "ANT Quick Assists", "ANT Requests", "Prompt Library", "Related Meetings", "Related Status Reports",
        "Master Plans", "Briefs", "Announcements", "P.I.C.S Roadmaps", ...new Set(FIELD_DASH.map(([f]) => f)),
      ],
    }),
    listRecords(T.announcements, {
      fields: ["Title", "Body", "Type", "Target Page", "Department", "Status", "Publish Date", "Expires", "Pinned"],
    }),
    listRecords(T.antRequests, { fields: ["Status", "Related Department"] }),
    listRecords(T.teamMembers, { fields: ["Name", "Role", "Reports To"] }),
    listRecords(T.pics, { fields: ["P.I.C.S Name", "Active"] }),
    listRecords(T.goals, {
      fields: [
        "Goal", "Goal Type", "Active", "Goal Department", "Goal Owner", "Description", "Goal Progress", "Goal Score", "Quarter", "Month", "Year",
        "Start Date", "End Date", "Monetary Target (Monthly)", "Monetary Target (Quarterly)", "Monetary Target (Annual)", "Related P.I.C.S",
        "Roadmap Blocks", "Related Status Reports", "Tasks Planning", "Company OKRs", "Performance Metrics", "Master Plans", "Professional Development",
      ],
    }),
    listRecords(T.tools, { fields: ["Tool Name", "Description", "Product Description", "Related Department", "Tool URL", "Tool Logo", "Infrastructure Layer"] }),
    listRecords(T.employeeResources, { fields: ["Title", "Category", "Description", "File", "Link", "Related Department(s)", "Last Updated"] }),
    listRecords(T.prompts, { fields: ["Status"] }),
    listRecords(T.profDev, { fields: ["Development Initiative", "Status"] }),
    listRecords(T.socialImpact),
    nameMap(T.roadmaps, "P.I.C.S Roadmap Phase Title"),
    nameMap(T.reports, "Report Title"),
    nameMap(T.tasks, "Task"),
    nameMap(T.metrics, "Metric / Asset Name"),
    nameMap(T.masterPlans, "Plan Name"),
  ]);
  const schema = await getSchema().catch(() => []);
  const deptSchema = schema.find((t) => t.id === T.departments);
  const memberSchema = schema.find((t) => t.id === T.teamMembers);
  const memberRec = new Map(memberRecs.map((r) => [r.id, r]));
  type Att = { url?: string; filename?: string; thumbnails?: { large?: { url?: string } } };
  const now = Date.now();
  const picsName = new Map(picsRecs.map((r) => [r.id, str(r.fields["P.I.C.S Name"]).trim()]));
  const profDevName = new Map(profDevRecs.map((r) => [r.id, str(r.fields["Development Initiative"]).trim()]));

  const memberName = new Map(memberRecs.map((r) => [r.id, str(r.fields["Name"]).trim()]));
  const deptName = new Map(deptRecs.map((r) => [r.id, str(r.fields["Department Name"]).trim()]));
  const displayDept = (id: string) => deptName.get(id) ?? "";
  const deptColor = (name: string) => {
    const rec = deptRecs.find((r) => str(r.fields["Department Name"]).trim() === name);
    const c = str(rec?.fields["Department Color"]).trim();
    return HEX.test(c) ? c : (DEPARTMENTS.find((d) => d.name === name)?.color ?? hashColor(name));
  };
  const deptColors = Object.fromEntries([...deptName.values()].filter(Boolean).map((n) => [n, deptColor(n)]));
  const names = (v: unknown, m: Map<string, string>) => links(v).map((id) => m.get(id) || UNNAMED);
  const activePics = new Set(picsRecs.filter((r) => bool(r.fields["Active"])).map((r) => r.id));
  const openAnt = antRecs.filter((r) => OPEN_ANT.has(str(r.fields["Status"])));

  /* ---- tools (Tool Library) */
  const toolDepts = new Map<string, Set<string>>(); // tool id → dept ids
  const addToolDept = (toolId: string, deptId: string) => {
    if (!toolDepts.has(toolId)) toolDepts.set(toolId, new Set());
    toolDepts.get(toolId)!.add(deptId);
  };
  for (const t of toolRecs) for (const d of links(t.fields["Related Department"])) addToolDept(t.id, d);
  for (const d of deptRecs) for (const t of links(d.fields["Tool Registry & Access Log"])) addToolDept(t, d.id);

  const tools: Tool[] = toolRecs
    .filter((r) => str(r.fields["Tool Name"]))
    .map((r) => {
      const name = str(r.fields["Tool Name"]).trim();
      const desc = str(r.fields["Product Description"]).trim() || str(r.fields["Description"]).trim();
      const url = str(r.fields["Tool URL"]).trim();
      const logo = (r.fields["Tool Logo"] as { url?: string; thumbnails?: { large?: { url?: string } } }[] | undefined)?.[0];
      return {
        id: r.id,
        name,
        ...brandMark(name),
        logo: logo?.thumbnails?.large?.url ?? logo?.url,
        url: url || undefined,
        desc: desc || undefined,
        missing: [!url && "Tool URL", !logo && "Tool Logo", !desc && "Product Description"].filter((x): x is string => !!x),
        layers: arr(r.fields["Infrastructure Layer"]),
        departments: [...(toolDepts.get(r.id) ?? [])]
          .map(displayDept)
          .filter(Boolean)
          .sort(),
      };
    })
    .sort((a, b) => b.departments.length - a.departments.length || a.name.localeCompare(b.name));

  /* ---- departments */
  const order = (n: string) => {
    const i = DEPARTMENTS.findIndex((d) => d.name === n);
    return i < 0 ? DEPARTMENTS.length : i;
  };
  const departments: Department[] = deptRecs
    .filter((r) => str(r.fields["Department Name"]))
    .map((r) => {
      const name = displayDept(r.id);
      const known = DEPARTMENTS.find((d) => d.name === name);
      const deptTools = tools.filter((t) => toolDepts.get(t.id!)?.has(r.id)).map((t) => t.name);
      return {
        id: r.id,
        name,
        color: deptColor(name),
        // The Overview field is empty in the base today, so the client's wording is the fallback.
        desc: str(r.fields["Department Overview"]) || known?.desc || "",
        tools: deptTools,
        target: { href: recordUrl(T.departments, r.id), external: true },
        heads: links(r.fields["Department Head(s)"]).map((id) => memberName.get(id) ?? "").filter(Boolean),
        members: links(r.fields["Team Members"]).length,
        activePics: links(r.fields["P.I.C.S 2"]).filter((id) => activePics.has(id)).length,
        openAnt: openAnt.filter((a) => links(a.fields["Related Department"]).includes(r.id)).length,
        wiki: {
          recordUrl: recordUrl(T.departments, r.id),
          budget: num(r.fields["Annual Budget"]),
          heads: names(r.fields["Department Head(s)"], memberName),
          members: names(r.fields["Team Members"], memberName),
          divisions: arr(r.fields["Divisions"]),
          people: (() => {
            const headIds = links(r.fields["Department Head(s)"]);
            const ids = [...new Set([...headIds, ...links(r.fields["Team Members"])])];
            return ids.map((id) => {
              const m = memberRec.get(id);
              return {
                id,
                name: memberName.get(id) || UNNAMED,
                role: arr(m?.fields["Role"]).join(", ") || undefined,
                head: headIds.includes(id),
                reportsTo: links(m?.fields["Reports To"]),
              };
            });
          })(),
          orgCharts: ((r.fields["Dept. Org Chart"] as Att[] | undefined) ?? [])
            .filter((a) => a.url)
            .map((a) => ({ thumb: a.thumbnails?.large?.url ?? a.url!, full: a.url!, name: a.filename ?? "Org chart" })),
          resources: docRecs
            .filter((d) => links(d.fields["Related Department(s)"]).includes(r.id) || links(r.fields["Employee Resources"]).includes(d.id))
            .map((d) => ({ title: str(d.fields["Title"]).trim() || UNNAMED, href: str(d.fields["Link"]).trim() || undefined, category: str(d.fields["Category"]) || undefined })),
          dashboards: [
            ...new Set([
              ...(DEPT_DASH[name] ?? []),
              ...FIELD_DASH.filter(([f]) => (Array.isArray(r.fields[f]) ? links(r.fields[f]).length > 0 : bool(r.fields[f]))).map(([, k]) => k),
              ...(links(r.fields["Professional Development"]).length ? ["profdev"] : []),
            ]),
          ],
          ants: {
            library: links(r.fields["ANT Library"]).length,
            quickAssists: links(r.fields["ANT Quick Assists"]).length,
            requests: links(r.fields["ANT Requests"]).length,
            prompts: links(r.fields["Prompt Library"]).length,
          },
          work: (["Related Meetings", "Related Status Reports", "Performance Metrics", "Master Plans", "Briefs", "Announcements", "P.I.C.S Roadmaps"] as const).map((f) => ({
            label: f,
            count: links(r.fields[f]).length,
          })),
          goals: links(r.fields["Department Goals"]).map((id) => ({ id, title: str(goalRecs.find((g) => g.id === id)?.fields["Goal"]).trim() || UNNAMED })),
          pics: links(r.fields["P.I.C.S 2"]).filter((id) => activePics.has(id)).map((id) => picsName.get(id) || UNNAMED),
          profDev: links(r.fields["Professional Development"]).length,
        },
      };
    })
    .sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name));

  /* ---- goals (Goals table, linked records resolved to names) */
  const pct = (v: unknown) => {
    const n = num(v);
    if (n == null) return null;
    return Math.max(0, Math.min(100, Math.round(n <= 1 ? n * 100 : n)));
  };
  const goals: Goal[] = goalRecs
    .filter((r) => str(r.fields["Goal"]).trim())
    .map((r) => {
      const f = r.fields;
      const g: Goal = {
        id: r.id,
        title: str(f["Goal"]).trim(),
        url: recordUrl(T.goals, r.id),
        type: str(f["Goal Type"]),
        active: bool(f["Active"]),
        departments: names(f["Goal Department"], deptName),
        owners: names(f["Goal Owner"], memberName),
        description: str(f["Description"]).trim(),
        progress: pct(f["Goal Progress"]),
        score: num(f["Goal Score"]),
        quarter: str(f["Quarter"]),
        month: str(f["Month"]),
        year: str(f["Year"]),
        start: str(f["Start Date"]),
        end: str(f["End Date"]),
        targetMonthly: num(f["Monetary Target (Monthly)"]),
        targetQuarterly: num(f["Monetary Target (Quarterly)"]),
        targetAnnual: num(f["Monetary Target (Annual)"]),
        pics: names(f["Related P.I.C.S"], picsName),
        roadmap: names(f["Roadmap Blocks"], roadmapName),
        reports: names(f["Related Status Reports"], reportName),
        tasks: names(f["Tasks Planning"], taskName),
        okrs: str(f["Company OKRs"]).trim(),
        metrics: names(f["Performance Metrics"], metricName),
        masterPlans: names(f["Master Plans"], planName),
        profDev: names(f["Professional Development"], profDevName),
        issues: [],
      };
      g.issues = goalIssues(g);
      return g;
    });
  const northStar = goals
    .filter((g) => g.type === "North Star" && g.active)
    .map((g) => ({ id: g.id, title: g.title, progress: g.progress ?? 0 }));
  const avgNorthStar = northStar.length ? Math.round(northStar.reduce((s, g) => s + g.progress, 0) / northStar.length) : null;

  /* ---- KPIs */
  const kpis: Kpi[] = KPIS.map((k) => {
    switch (k.label) {
      case "Departments":
        return { ...k, value: String(departments.length) };
      case "Open ANT Requests":
        return { ...k, value: String(openAnt.length) };
      case "Avg. North Star Progress":
        return avgNorthStar == null ? { ...k, snapshot: true } : { ...k, value: `${avgNorthStar}%` };
      case "Greater Good Goals Tracked":
        // The Greater Good scorecard lives in "Social Impact & SDG Alignment"; count its non-empty rows.
        return { ...k, snapshot: false, value: String(impactRecs.filter((r) => Object.keys(r.fields).length > 0).length) };
      default:
        return k;
    }
  });

  /* ---- company updates (Announcements: Published, live today, aimed at Home or everywhere) */
  const today = new Date(now).toISOString().slice(0, 10);
  const updates: Update[] = annRecs
    .filter((r) => {
      const f = r.fields;
      const target = str(f["Target Page"]);
      const publish = str(f["Publish Date"]);
      const expires = str(f["Expires"]);
      return (
        str(f["Status"]) === "Published" &&
        (str(f["Title"]) || str(f["Body"])) &&
        (!target || target === "Home") &&
        (!publish || publish <= today) &&
        (!expires || expires >= today)
      );
    })
    .sort((a, b) => Number(bool(b.fields["Pinned"])) - Number(bool(a.fields["Pinned"])) || str(b.fields["Publish Date"] || b.createdTime).localeCompare(str(a.fields["Publish Date"] || a.createdTime)))
    .slice(0, 8)
    .map((r) => {
      const f = r.fields;
      const title = str(f["Title"]);
      const body = str(f["Body"]);
      return {
        dept: links(f["Department"]).map(displayDept).filter(Boolean).join(", ") || str(f["Type"]) || "VCG",
        title: title || undefined,
        text: title && body ? `${title} — ${body}` : title || body,
        when: ago(str(f["Publish Date"]) || r.createdTime, now),
        pinned: bool(f["Pinned"]),
      };
    });

  /* ---- team resources: client's tiles + live counts; documents from Employee Resources */
  const docs: ResourceDoc[] = docRecs
    .filter((r) => str(r.fields["Title"]))
    .map((r) => {
      const f = r.fields;
      const file = (f["File"] as { url?: string }[] | undefined)?.[0]?.url;
      const href = str(f["Link"]).trim() || file;
      return {
        id: r.id,
        title: str(f["Title"]),
        category: str(f["Category"]) || "Resource",
        desc: str(f["Description"]),
        departments: links(f["Related Department(s)"]).map(displayDept).filter(Boolean),
        target: href ? { href, external: true } : undefined,
        updated: str(f["Last Updated"]) || undefined,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
  const docCount = (cats: string[]) => docs.filter((d) => cats.includes(d.category)).length;
  const activePrompts = promptRecs.filter((r) => str(r.fields["Status"]) === "Active").length;
  const resources: Resource[] = RESOURCES.map((r) => {
    switch (r.name) {
      case "Prompt Library":
        return { ...r, detail: plural(activePrompts, "active prompt") };
      case "Tool Library":
        return { ...r, detail: plural(tools.length, "tool") };
      case "Professional Development":
        return { ...r, detail: plural(profDevRecs.length, "initiative") };
      case "Policies & Procedures":
        return { ...r, detail: plural(docCount(["Policy & Procedure", "NDA", "Contract"]), "document") };
      case "SOPs":
        return { ...r, detail: plural(docCount(["SOP"]), "SOP") };
      default:
        return r;
    }
  }).map((r) => {
    // TR-2: tiles go to the ClickUp Resource Hub page stored in Employee Resources › Link.
    if (r.name === "Professional Development") return { ...r, target: undefined, detail: "Phase 3" };
    const key = r.name.toLowerCase();
    const rec = docRecs.find((d) => str(d.fields["Link"]).trim() && [str(d.fields["Title"]), str(d.fields["Category"])].some((v) => v.trim().toLowerCase() === key));
    if (rec) return { ...r, target: { href: str(rec.fields["Link"]).trim(), external: true } };
    const hub = RESOURCE_TILE_PAGES[r.name];
    if (hub) return { ...r, target: { href: hub, external: true } };
    return r.target && "soon" in r.target ? r : { ...r, target: undefined };
  });

  return {
    kpis,
    northStar,
    goals: goals.filter((g) => g.active),
    deptColors,
    updates,
    navCards: NAV_CARDS,
    faqs: FAQS,
    tools,
    departments,
    resources,
    resourcesLink: RESOURCES_LINK,
    docs,
    subDashboards: SUB_DASHBOARDS,
    fieldMap: (deptSchema?.fields ?? []).map((f) => {
      const m = FIELD_MAP[f.name];
      return { name: f.name, type: f.type, placement: m?.[0] ?? "Not mapped yet", note: m ? m[1] : "New column — decide where it surfaces in the wiki" };
    }),
    hierarchyWritable: !!memberSchema?.fields.some((f) => f.name === "Reports To" && f.type === "multipleRecordLinks"),
  };
}

/** Obvious data problems on a goal, shown as the orange "Data to correct" note. */
function goalIssues(g: Goal): string[] {
  const out: string[] = [];
  if (!g.description) out.push("Description is empty");
  const zero = (
    [
      ["Monthly", g.targetMonthly],
      ["Quarterly", g.targetQuarterly],
      ["Annual", g.targetAnnual],
    ] as const
  ).filter(([, v]) => v === 0);
  if (zero.length) out.push(`Monetary Target (${zero.map(([k]) => k).join(", ")}) is $0`);
  if (g.score != null && g.progress != null && Math.abs(g.score - g.progress) >= 20)
    out.push(`Goal Score (${g.score}) doesn't match Goal Progress (${g.progress}%)`);
  if (g.quarter && g.month && MONTH_Q[g.month] && MONTH_Q[g.month] !== g.quarter) out.push(`Quarter ${g.quarter} doesn't match Month ${g.month}`);
  if (g.quarter && g.end) {
    const q = `Q${Math.ceil(Number(g.end.slice(5, 7)) / 3)}`;
    if (q !== g.quarter) out.push(`Quarter ${g.quarter} doesn't match End Date ${g.end}`);
  }
  const unnamed = (
    [
      ["Department", g.departments],
      ["Owner", g.owners],
      ["Related P.I.C.S", g.pics],
      ["Roadmap Blocks", g.roadmap],
      ["Related Status Reports", g.reports],
      ["Tasks Planning", g.tasks],
      ["Performance Metrics", g.metrics],
      ["Master Plans", g.masterPlans],
      ["Professional Development", g.profDev],
    ] as const
  ).filter(([, v]) => v.includes(UNNAMED));
  if (unnamed.length) out.push(`Unnamed linked records in ${unnamed.map(([k]) => k).join(", ")}`);
  return out;
}

/** Home Command data (live, or the snapshot with the reason). One load per request; table reads cached 60s. */
export const loadHome = cache(() => withFallback(loadLive, homeSnapshot));
