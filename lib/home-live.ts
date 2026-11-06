import "server-only";
import { cache } from "react";
import { arr, bool, links, listRecords, num, str, withFallback } from "@/lib/airtable.server";
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
} as const;

const recordUrl = (table: string, id: string) => `${AIRTABLE}/${table}/${id}`;

/* "External" holds outside contacts, not a team, so it isn't shown as a department. */
const HIDDEN_DEPARTMENTS = new Set(["External"]);
/* Airtable names that the client's page calls something else. */
const DEPT_ALIASES: Record<string, string> = { "PR & Media": "Media" };
/* ANT Request statuses that still need work ("In the Qeue" is spelled that way in the base). */
const OPEN_ANT = new Set(["In the Qeue", "In Progress", "Pending", "Not Started"]);
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
  const [deptRecs, annRecs, antRecs, memberRecs, picsRecs, goalRecs, toolRecs, docRecs, promptRecs, profDevRecs, impactRecs] = await Promise.all([
    listRecords(T.departments, {
      fields: ["Department Name", "Department Overview", "Department Head(s)", "Team Members", "P.I.C.S 2", "Tool Registry & Access Log"],
    }),
    listRecords(T.announcements, {
      fields: ["Title", "Body", "Type", "Target Page", "Department", "Status", "Publish Date", "Expires", "Pinned"],
    }),
    listRecords(T.antRequests, { fields: ["Status", "Related Department"] }),
    listRecords(T.teamMembers, { fields: ["Name"] }),
    listRecords(T.pics, { fields: ["Active"] }),
    listRecords(T.goals, { fields: ["Goal", "Goal Type", "Goal Progress", "Active"] }),
    listRecords(T.tools, { fields: ["Tool Name", "Description", "Related Department", "Tool URL", "Tool Logo", "Infrastructure Layer"] }),
    listRecords(T.employeeResources, { fields: ["Title", "Category", "Description", "File", "Link", "Related Department(s)", "Last Updated"] }),
    listRecords(T.prompts, { fields: ["Status"] }),
    listRecords(T.profDev, { fields: ["Status"] }),
    listRecords(T.socialImpact),
  ]);
  const now = Date.now();

  const memberName = new Map(memberRecs.map((r) => [r.id, str(r.fields["Name"])]));
  const deptName = new Map(deptRecs.map((r) => [r.id, str(r.fields["Department Name"])]));
  const displayDept = (id: string) => {
    const n = deptName.get(id) ?? "";
    return DEPT_ALIASES[n] ?? n;
  };
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
      const logo = (r.fields["Tool Logo"] as { url?: string; thumbnails?: { large?: { url?: string } } }[] | undefined)?.[0];
      return {
        id: r.id,
        name,
        ...brandMark(name),
        logo: logo?.thumbnails?.large?.url ?? logo?.url,
        url: str(r.fields["Tool URL"]) || undefined,
        desc: str(r.fields["Description"]) || undefined,
        layers: arr(r.fields["Infrastructure Layer"]),
        departments: [...(toolDepts.get(r.id) ?? [])]
          .filter((d) => !HIDDEN_DEPARTMENTS.has(deptName.get(d) ?? ""))
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
    .filter((r) => str(r.fields["Department Name"]) && !HIDDEN_DEPARTMENTS.has(str(r.fields["Department Name"])))
    .map((r) => {
      const name = displayDept(r.id);
      const known = DEPARTMENTS.find((d) => d.name === name);
      const deptTools = tools.filter((t) => toolDepts.get(t.id!)?.has(r.id)).map((t) => t.name);
      return {
        id: r.id,
        name,
        color: known?.color ?? hashColor(name),
        // The Overview field is empty in the base today, so the client's wording is the fallback.
        desc: str(r.fields["Department Overview"]) || known?.desc || "",
        tools: deptTools,
        target: name === "Social Impact" ? { soon: "Social Impact" } : { href: recordUrl(T.departments, r.id), external: true },
        heads: links(r.fields["Department Head(s)"]).map((id) => memberName.get(id) ?? "").filter(Boolean),
        members: links(r.fields["Team Members"]).length,
        activePics: links(r.fields["P.I.C.S 2"]).filter((id) => activePics.has(id)).length,
        openAnt: openAnt.filter((a) => links(a.fields["Related Department"]).includes(r.id)).length,
      };
    })
    .sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name));

  /* ---- North Star goals (Goals, Goal Type = North Star) */
  const northStar = goalRecs
    .filter((r) => str(r.fields["Goal Type"]) === "North Star" && r.fields["Active"] !== false)
    .map((r) => ({
      title: str(r.fields["Goal"]),
      progress: Math.max(0, Math.min(100, Math.round((num(r.fields["Goal Progress"]) ?? 0) * 100))),
    }));
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
      const href = str(f["Link"]) || file;
      return {
        id: r.id,
        title: str(f["Title"]),
        category: str(f["Category"]) || "Resource",
        desc: str(f["Description"]),
        departments: links(f["Related Department(s)"]).map(displayDept).filter(Boolean),
        target: href ? { href, external: true } : { href: recordUrl(T.employeeResources, r.id), external: true },
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
  });

  return {
    kpis,
    northStar,
    updates,
    navCards: NAV_CARDS,
    faqs: FAQS,
    tools,
    departments,
    resources,
    resourcesLink: RESOURCES_LINK,
    docs,
    subDashboards: SUB_DASHBOARDS,
  };
}

/** Home Command data (live, or the snapshot with the reason). One load per request; table reads cached 60s. */
export const loadHome = cache(() => withFallback(loadLive, homeSnapshot));
