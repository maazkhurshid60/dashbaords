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
  northStar: { title: string; progress: number }[];
  updates: Update[];
  navCards: typeof NAV_CARDS;
  faqs: typeof FAQS;
  tools: Tool[];
  departments: Department[];
  resources: Resource[];
  resourcesLink: string;
  docs: ResourceDoc[];
  subDashboards: typeof SUB_DASHBOARDS;
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
  { dept: "Media", text: "TechCrunch feature published — positive sentiment.", when: "3 days ago" },
  { dept: "Executive", text: "Q3 board deck approved and published to Briefs Hub.", when: "1 week ago" },
];

export const NAV_CARDS: { title: string; target: Target; highlight?: boolean }[] = [
  { title: "Briefs Hub", target: { href: page("pagukWisqqmdSogxj"), external: true } },
  { title: "DAM", target: { href: page("pagMxv5crO45B18dk"), external: true } },
  { title: "Performance & Risks", target: { href: AIRTABLE, external: true } },
  { title: "Product Dashboard", target: { href: "/product" } },
  { title: "Media Dashboard", target: { href: AIRTABLE, external: true } },
  { title: "ANT Requests", target: { soon: "ANT Connector" } },
  { title: "Goals Dashboard", target: { href: AIRTABLE, external: true } },
  { title: "Team Directory", target: { href: AIRTABLE, external: true } },
  { title: "Social Impact Dashboard", target: { soon: "Social Impact" }, highlight: true },
];

export const FAQS = [
  {
    q: "Where do I find my department's SOPs and Playbooks?",
    a: 'Click your department on the Departments tab, then use its Related Tools / "Open →" link to jump to that department\'s Airtable interface — SOPs and Playbooks are documented in ClickUp and linked from there.',
  },
  {
    q: "How do I submit an ANT Request?",
    a: "Open ANT Connector from the sidebar and type your request into the search bar, or launch one of the Quick Assist prompts from the Prompt Library — both open a chat with your message ready to send.",
  },
  {
    q: "Where is the Social Impact / Grant Scraper dashboard?",
    a: "Click Social Impact in the sidebar (or the Social Impact Dashboard card above) to open the Nail Networks, Grant Scrapers, Opportunity Pipeline, and Application Builder views.",
  },
  {
    q: "How do I get to a specific Airtable dashboard?",
    a: "Use the Intranet Navigation cards above — each opens the matching Airtable interface page directly. The Airtable Intranet link at the bottom of the sidebar opens the full base.",
  },
  {
    q: "What tools does my department use?",
    a: "Open the Departments tab — each department card lists its Related Tools, and the Tools tab shows the full company-wide tool stack.",
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
    name: "Media",
    color: "#3C6CFF",
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
  { name: "Professional Development" },
  { name: "Policies & Procedures" },
  { name: "SOPs" },
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
