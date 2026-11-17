// Content of the client's VCG_Home_Command.html (Home Command). lib/home-live.ts reads the
// live versions from Airtable; this file is the snapshot fallback (homeSnapshot()) and holds
// the parts that are navigation/help text rather than data (nav cards, FAQ, sub-dashboards).

export const AIRTABLE = "https://airtable.com/appLH1D7ME6mU1zgE";
const page = (id: string) => `${AIRTABLE}/${id}/edit`;

/* Internal routes this app provides; "soon" = page not handed over yet. */
export type Target = { href: string; external?: boolean } | { soon: string };

export interface Kpi {
  value: string;
  label: string;
  target: Target;
  /** True when no Airtable table holds this number, so it stays the client's snapshot value. */
  snapshot?: boolean;
}
export interface Update {
  dept: string;
  text: string;
  when: string;
  title?: string;
  pinned?: boolean;
}
export interface Tool {
  id?: string;
  /** Tool Library fields that are empty and need fixing in Airtable. */
  missing?: string[];
  name: string;
  glyph: string;
  color: string;
  logo?: string;
  url?: string;
  desc?: string;
  layers?: string[];
  /** Departments that use the tool. */
  departments: string[];
}
export interface Department {
  id?: string;
  name: string;
  color: string;
  desc: string;
  tools: string[];
  target: Target;
  heads?: string[];
  members?: number;
  activePics?: number;
  openAnt?: number;
  /** In-app Department Wiki content (interim until the client's UAT mockup lands). */
  wiki?: DeptWiki;
}
/** A Team Members record as placed in a department hierarchy. */
export interface WikiPerson {
  id: string;
  name: string;
  role?: string;
  head: boolean;
  /** Team Members › Reports To (record ids). */
  reportsTo: string[];
}
export interface DeptWiki {
  recordUrl: string;
  budget?: number | null;
  divisions: string[];
  heads: string[];
  members: string[];
  /** Heads + team members with their Reports To links, for the hierarchy chart. */
  people: WikiPerson[];
  orgCharts: { thumb: string; full: string; name: string }[];
  resources: { title: string; href?: string; category?: string }[];
  /** Dashboard keys (lib/home-wiki DASHBOARDS). */
  dashboards: string[];
  ants: { library: number; quickAssists: number; requests: number; prompts: number };
  goals: { id: string; title: string }[];
  pics: string[];
  work: { label: string; count: number }[];
  profDev: number;
}
/** One Airtable › Departments column and where it surfaces in the wiki (DEPT-4). */
export interface FieldMapRow {
  name: string;
  type: string;
  placement: string;
  note?: string;
}
/** Goals table record, linked records resolved to names. */
export interface Goal {
  id: string;
  title: string;
  url: string;
  type: string;
  active: boolean;
  departments: string[];
  owners: string[];
  description: string;
  progress: number | null;
  score: number | null;
  quarter: string;
  month: string;
  year: string;
  start: string;
  end: string;
  targetMonthly: number | null;
  targetQuarterly: number | null;
  targetAnnual: number | null;
  pics: string[];
  roadmap: string[];
  reports: string[];
  tasks: string[];
  okrs: string;
  metrics: string[];
  masterPlans: string[];
  profDev: string[];
  /** Obvious data problems to correct in Airtable. */
  issues: string[];
}
export interface Resource {
  name: string;
  target?: Target;
  /** Live count line, e.g. "46 active prompts". */
  detail?: string;
}
export interface ResourceDoc {
  id: string;
  title: string;
  category: string;
  desc: string;
  departments: string[];
  target?: Target;
  updated?: string;
}
export interface HomeData {
  kpis: Kpi[];
  northStar: { id?: string; title: string; progress: number }[];
  /** Every active goal (Goals › Active). */
  goals: Goal[];
  /** Department name → Department Color. */
  deptColors: Record<string, string>;
  updates: Update[];
  navCards: typeof NAV_CARDS;
  faqs: typeof FAQS;
  tools: Tool[];
  departments: Department[];
  resources: Resource[];
  resourcesLink: string;
  docs: ResourceDoc[];
  subDashboards: typeof SUB_DASHBOARDS;
  /** Every Departments column from the live schema (empty on the snapshot). */
  fieldMap?: FieldMapRow[];
  /** Team Members has a writable "Reports To" field, so hierarchy edits can be saved. */
  hierarchyWritable?: boolean;
}

export const KPIS: Kpi[] = [
  { value: "8", label: "Departments", target: { href: "/departments" } },
  { value: "5", label: "Open ANT Requests", target: { soon: "ANT Connector" } },
  { value: "10", label: "Greater Good Goals Tracked", target: { soon: "Social Impact" }, snapshot: true },
  { value: "38%", label: "Avg. North Star Progress", target: { href: "#north-star" } },
];

export const NORTH_STAR = [
  { title: "Launch the ACRYLICS MVP", progress: 0 },
  { title: "Establish All Internal Company Frameworks & Tools", progress: 75 },
];

export const UPDATES: Update[] = [
  { dept: "Product", text: "ACRYLICS MVP hit 60% completion — on track for launch.", when: "2 hours ago" },
  { dept: "PR & Media", text: "TechCrunch feature published — positive sentiment.", when: "3 days ago" },
  { dept: "Executive", text: "Q3 board deck approved and published to Briefs Hub.", when: "1 week ago" },
];

export const NAV_CARDS: { title: string; target: Target; highlight?: boolean; sub?: string }[] = [
  { title: "Departments", target: { href: "/departments" } },
  { title: "Tools", target: { href: "/tools" } },
  { title: "Team Resources", target: { href: "/resources" } },
  { title: "Operations", sub: "P.I.C.S & Reports", target: { href: "/pics" } },
  { title: "Productivity", sub: "Meetings, schedules, checklists, reports", target: { href: "/productivity" } },
  { title: "Product", sub: "acrylics.world performance", target: { href: "/product" } },
  { title: "Communications", sub: "Inbox & updates", target: { href: "/communications" } },
  { title: "ANT Connector", sub: "Soon", target: { soon: "ANT Connector" } },
  { title: "Marketing & Sales", sub: "Soon", target: { soon: "Marketing & Sales" } },
  { title: "Social Impact", sub: "Soon", target: { soon: "Social Impact" } },
  { title: "Briefs Hub", sub: "Soon", target: { soon: "Briefs Hub" } },
];

export const FAQS = [
  {
    q: "Where do I find my department's SOPs and Playbooks?",
    a: "Click your department on the Departments page to open its Department Wiki — Related Team Resources lists its SOPs and Playbooks.",
  },
  {
    q: "How do I submit an ANT Request?",
    a: "Open ANT Connector from the sidebar and type your request into the search bar, or launch one of the Quick Assist prompts from the Prompt Library — both open a chat with your message ready to send.",
  },
  {
    q: "Where is the Social Impact / Grant Scraper dashboard?",
    a: "Click Social Impact in the sidebar (or the Social Impact block above, once it ships) to open the Nail Networks, Grant Scrapers, Opportunity Pipeline, and Application Builder views.",
  },
  {
    q: "How do I get to a specific Airtable dashboard?",
    a: "Use the Intranet Navigation blocks above, or the sidebar. The Open Airtable button in the right-hand panel opens the full base.",
  },
  {
    q: "What tools does my department use?",
    a: "Open Departments — each department card lists its Related Tools, and Tools shows the full company-wide tool stack.",
  },
];

/* Tool brand marks (glyph + brand color) as given in the client file. */
export const TOOLS = [
  { name: "Canva", glyph: "C", color: "#00C4CC" },
  { name: "Airtable", glyph: "▦", color: "#FCB400" },
  { name: "Claude", glyph: "✳", color: "#DA7756" },
  { name: "ClickUp", glyph: "✓", color: "#7B68EE" },
  { name: "Gamma", glyph: "Γ", color: "#1B1B1F" },
  { name: "Figma", glyph: "F", color: "#A259FF" },
  { name: "Loom", glyph: "▶", color: "#625DF5" },
  { name: "Scribe", glyph: "S", color: "#FF5A75" },
];

export const DEPARTMENTS: Department[] = [
  {
    name: "Executive",
    color: "#22232F",
    desc: "Sets company direction, owns the North Star Goals, and signs off on major decisions across ACRYLICS and Nail Networks.",
    tools: ["ClickUp", "Airtable", "Claude"],
    target: { href: AIRTABLE, external: true },
  },
  {
    name: "Success",
    color: "#6A4EB0",
    desc: "Owns client and community relationships — onboarding, retention, and day-to-day support across VCG programs.",
    tools: ["Airtable", "ClickUp", "Loom"],
    target: { href: AIRTABLE, external: true },
  },
  {
    name: "Operations",
    color: "#D9A400",
    desc: "Runs the internal systems and processes that keep VCG functioning — SOPs, tooling, and workflow admin.",
    tools: ["Airtable", "ClickUp", "Scribe"],
    target: { href: AIRTABLE, external: true },
  },
  {
    name: "Product",
    color: "#4EA958",
    desc: "Builds and ships the ACRYLICS platform — roadmap, feature specs, and engineering coordination.",
    tools: ["Figma", "ClickUp", "Claude"],
    target: { href: AIRTABLE, external: true },
  },
  {
    name: "Marketing & Sales",
    color: "#FF3636",
    desc: "Drives go-to-market strategy, campaigns, partnerships, and revenue pipeline for VCG and ACRYLICS.",
    tools: ["Canva", "Gamma", "Airtable"],
    target: { href: AIRTABLE, external: true },
  },
  {
    name: "Creative",
    color: "#E14545",
    desc: "Produces brand, campaign, and product visuals — from social graphics to gallery and showcase assets.",
    tools: ["Canva", "Figma"],
    target: { href: AIRTABLE, external: true },
  },
  {
    name: "PR & Media",
    color: "#2f6fe0",
    desc: "Handles PR, press, and external communications — pitching outlets and tracking coverage and sentiment.",
    tools: ["Loom", "Scribe", "Gamma"],
    target: { href: AIRTABLE, external: true },
  },
  {
    name: "Social Impact",
    color: "#D5B0FF",
    desc: "Runs Nail Networks and the Greater Good Goals scorecard — grants, fiscal sponsorship, and community programming.",
    tools: ["Airtable", "Claude", "Canva"],
    target: { soon: "Social Impact" },
  },
];

export const RESOURCES: Resource[] = [
  { name: "Prompt Library", target: { soon: "ANT Connector" } },
  { name: "Tool Library", target: { href: AIRTABLE, external: true } },
  { name: "Professional Development", detail: "Phase 3" },
  { name: "Policies & Procedures", target: { href: "https://app.clickup.com/90171001067/docs/2kz9rj7b-977/2kz9rj7b-19117", external: true } },
  { name: "SOPs", target: { href: "https://app.clickup.com/90171001067/docs/2kz9rj7b-977/2kz9rj7b-3737", external: true } },
  { name: "Manuals", target: { href: "https://app.clickup.com/90171001067/docs/2kz9rj7b-977/2kz9rj7b-36257", external: true } },
  { name: "Resource Hub", target: { href: "https://app.clickup.com/90171001067/docs/2kz9rj7b-977/", external: true } },
  { name: "Productivity Assistant", target: { soon: "ANT Connector" } },
];
export const RESOURCES_LINK = page("pagukWisqqmdSogxj");

export const SUB_DASHBOARDS: { name: string; target: Target }[] = [
  { name: "Productivity", target: { href: page("pag1dPo8G6uOCNcYZ"), external: true } },
  { name: "B&M", target: { href: page("pagfmlaGR2CzEqf0D"), external: true } },
  { name: "DAM", target: { href: page("pagMxv5crO45B18dk"), external: true } },
  { name: "RDS", target: { href: page("pagipzeK7jHwSVCyR"), external: true } },
];

/** The whole page as the client's snapshot (used when Airtable can't be read). */
export function homeSnapshot(): HomeData {
  return {
    kpis: KPIS,
    northStar: NORTH_STAR,
    goals: [],
    deptColors: Object.fromEntries(DEPARTMENTS.map((d) => [d.name, d.color])),
    updates: UPDATES,
    navCards: NAV_CARDS,
    faqs: FAQS,
    tools: TOOLS.map((t) => ({ ...t, departments: DEPARTMENTS.filter((d) => d.tools.includes(t.name)).map((d) => d.name) })),
    departments: DEPARTMENTS,
    resources: RESOURCES,
    resourcesLink: RESOURCES_LINK,
    docs: [],
    subDashboards: SUB_DASHBOARDS,
  };
}
