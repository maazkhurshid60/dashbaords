/* Department Wiki reference data from the client's UAT mockup (VCG-Intranet-UAT-Mockup.html,
   Oct 31 2026): ClickUp Resource Hub pages, intranet dashboards, and the Airtable › Departments
   field map (wiki placement + notes). Live data comes from lib/home-live.ts. Client-safe. */

/** ClickUp Resource Hub doc (all team resources are released from ClickUp). */
export const CLICKUP_HUB = "https://app.clickup.com/90171001067/docs/2kz9rj7b-977/";
export const cu = (page = "") => CLICKUP_HUB + page;

/** Resource Hub › Team Hierarchies › <DEPT>. Other departments link the parent folder ("Page needed"). */
export const HIER_PAGES: Record<string, string> = { Executive: "2kz9rj7b-1457", Success: "2kz9rj7b-1417", Operations: "2kz9rj7b-1437" };
export const HIER_PARENT = "2kz9rj7b-1397";
/** Resource Hub › Manuals › Team Hierarchy & P.I.C.S Team Deployment (company-wide). */
export const HIER_MANUAL = "2kz9rj7b-36257";
/** Resource Hub › SOPs › Department SOPs. */
export const DEPT_SOPS = "2kz9rj7b-3737";
/** Resource Hub › Manuals › Workforce Operations Compliance › HR Masters. */
export const HR_MASTERS = "2kz9rj7b-19117";

export type ResStatus = "linked" | "verify" | "missing";
export interface ResPage {
  cat: string;
  page: string;
  where: string;
  status: ResStatus;
}
const HRM = "Resource Hub › Manuals › Workforce Operations Compliance › HR Masters";
const DSOP = "Resource Hub › SOPs › Department SOPs";
/** Employee Resources title → ClickUp source page. verify = best-match page, confirm or create the exact page. */
export const RES_PAGES: Record<string, ResPage> = {
  "Success Team & Staffing SOP": { cat: "SOP", page: "2kz9rj7b-3997", where: `${DSOP} › Success`, status: "linked" },
  "Confidentiality & Proprietary Info Agreement (C-PIA)": { cat: "NDA", page: HR_MASTERS, where: HRM, status: "verify" },
  "Data Processing Addendum (DPA)": { cat: "NDA", page: HR_MASTERS, where: HRM, status: "verify" },
  "Intelligence Security Protocol (ISP)": { cat: "NDA", page: HR_MASTERS, where: HRM, status: "verify" },
  "Master Intellectual Property Assignment Agreement (IPA)": { cat: "NDA", page: HR_MASTERS, where: HRM, status: "verify" },
  "Work-Product Acknowledgment": { cat: "NDA", page: HR_MASTERS, where: HRM, status: "verify" },
  "Fabrication Department SOP — highlighted/selected": { cat: "SOP", page: DEPT_SOPS, where: DSOP, status: "missing" },
  "Product Development Department SOP": { cat: "SOP", page: DEPT_SOPS, where: DSOP, status: "missing" },
  "Media & Content Department SOP": { cat: "SOP", page: DEPT_SOPS, where: DSOP, status: "missing" },
  "Community Department SOP": { cat: "SOP", page: DEPT_SOPS, where: DSOP, status: "missing" },
};

/** Team Resources tiles (TR-2) → ClickUp Resource Hub page. */
export const RESOURCE_TILE_PAGES: Record<string, string> = {
  SOPs: cu(DEPT_SOPS),
  "Policies & Procedures": cu(HR_MASTERS),
  Manuals: cu(HIER_MANUAL),
  "Resource Hub": cu(),
};

export type DashStatus = "live" | "airtable" | "soon" | "phase3";
export const DASHBOARDS: Record<string, { n: string; u?: string; s: DashStatus; d: string }> = {
  pics: { n: "P.I.C.S Operations", u: "/pics", s: "live", d: "Projects, initiatives, campaigns, sprints" },
  prod: { n: "Productivity Center", u: "/productivity", s: "live", d: "Tasks, meetings pipeline, checklists" },
  product: { n: "Product Dashboard", u: "/product", s: "live", d: "Performance, customers, roadmap, launch" },
  comms: { n: "Communications Dashboard", u: "/communications", s: "live", d: "Inbox, insights, updates" },
  goals: { n: "Goals Dashboard", s: "airtable", d: "North Star Goals progress" },
  perf: { n: "Performance & Risks", s: "airtable", d: "Metrics, risks, status reports" },
  briefs: { n: "Briefs Hub", s: "soon", d: "Brief intake and review" },
  dam: { n: "DAM", s: "airtable", d: "Asset library and requests" },
  media: { n: "Media Dashboard", s: "airtable", d: "Press coverage and sentiment" },
  team: { n: "Team Directory", s: "airtable", d: "People, roles, availability" },
  si: { n: "Social Impact Dashboard", u: "/social-impact", s: "live", d: "Grants, programs, SDG scorecard" },
  mkt: { n: "Marketing & Sales Dashboard", s: "soon", d: "Pipeline, campaigns, funnels" },
  research: { n: "Market Research & Strategy", s: "airtable", d: "BMC, SWOT, PESTLE, competitors" },
  fin: { n: "Finance Dashboard", s: "soon", d: "P&L, ledger, AP/AR, payroll" },
  legal: { n: "Contracts Register", s: "soon", d: "Contracts & legal agreements" },
  profdev: { n: "Professional Development", s: "phase3", d: "Learning paths, training logs" },
};

/** Per-department dashboards from the mockup; the live loader adds any implied by linked records. */
export const DEPT_DASH: Record<string, string[]> = {
  Executive: ["goals", "pics", "perf", "research"],
  Success: ["prod", "pics", "comms", "team"],
  Operations: ["pics", "prod", "perf", "team"],
  Product: ["product", "pics", "research"],
  "Marketing & Sales": ["mkt", "research", "comms", "pics"],
  Creative: ["dam", "briefs", "pics"],
  "PR & Media": ["media", "comms", "dam"],
  "Social Impact": ["si", "pics"],
  Finance: ["fin", "pics"],
  "Legal & Compliance": ["legal", "pics"],
  HR: ["team", "profdev"],
  "Production/Fabrication": ["dam", "pics"],
  External: [],
};

/** Departments column → dashboard key, when the department has linked records / the box is ticked. */
export const FIELD_DASH: [string, string][] = [
  ["P.I.C.S 2", "pics"],
  ["Has DAM", "dam"],
  ["Has Briefs Hub", "briefs"],
  ["Communications", "comms"],
  ["Product Backlog & Sprints", "product"],
  ["Infra & R&D Spend", "product"],
  ["Performance Metrics", "perf"],
  ...["Research Hub", "Business Model Canvas", "SWOT Analysis", "PESTLE Analysis", "Competitor Insights", "Consumer Insight by Audience Segment", "Business Plan"].map(
    (f) => [f, "research"] as [string, string],
  ),
  ["Partnership Pipeline", "mkt"],
  ["Cold Outreach Pipeline", "mkt"],
  ["Social Impact & SDG Alignment", "si"],
  ["Grant Applications", "si"],
  ...["Chart of Accounts", "General Ledger", "Accounts Payable", "Payroll & Compensation", "Universal P&L & Budget", "Budgets"].map((f) => [f, "fin"] as [string, string]),
  ["Contracts & Legal Agreement Register", "legal"],
];

/** Airtable › Departments column → [wiki placement, note]. Columns not listed here show as "Not mapped yet". */
export const FIELD_MAP: Record<string, [string, string?]> = {
  "Department Name": ["Card + Wiki header"],
  "Department Overview": ["Card + Wiki header", "Empty on all records — populate (card copy is hard-coded today)"],
  Divisions: ["Wiki header chips"],
  "Annual Budget": ["Wiki header stat"],
  "Department Color": ["Card + Wiki colour bar"],
  "Dept. Org Chart": ["Hierarchy › chart/images", "Only Executive has an image"],
  "Department Head(s)": ["Hierarchy › top level + card"],
  "Team Members": ["Hierarchy › team level + card count"],
  "Team Skills and Interests": ["Hierarchy › member detail"],
  "Upwork Labor Planning": ["Hierarchy › open / contract roles"],
  Contacts: ["Hierarchy › external contacts"],
  "Department Goals": ["Goals & Work"],
  "P.I.C.S 2": ["Goals & Work › active P.I.C.S", "Primary P.I.C.S link"],
  "Related P.I.C.S": ["Goals & Work", "Legacy text — duplicate of P.I.C.S 2? confirm/retire"],
  "P.I.C.S": ["Goals & Work", "Legacy text — duplicate of P.I.C.S 2? confirm/retire"],
  "P.I.C.S Roadmaps": ["Goals & Work"],
  "Master Plans": ["Goals & Work"],
  "Master Plans 2": ["Goals & Work", "Duplicate — confirm/retire"],
  Briefs: ["Goals & Work + Briefs Hub dashboard"],
  "Briefs copy": ["—", "Duplicate — confirm/retire"],
  "Related Meetings": ["Goals & Work"],
  "Related Status Reports": ["Goals & Work"],
  "Performance Metrics": ["Goals & Work + Performance & Risks dashboard"],
  "Performance Reports": ["Goals & Work"],
  Announcements: ["Goals & Work"],
  "Has Briefs Hub": ["Related Dashboards (show Briefs Hub)", "Drives dashboard visibility"],
  "Has DAM": ["Related Dashboards (show DAM)", "Drives dashboard visibility"],
  "Bespoke Brief Flow": ["Related Dashboards (Briefs Hub variant)"],
  "Asset Workflows": ["Related Dashboards › DAM"],
  Communications: ["Related Dashboards › Communications"],
  "Product Backlog & Sprints": ["Related Dashboards › Product"],
  "Infra & R&D Spend": ["Related Dashboards › Product"],
  ...Object.fromEntries(
    [
      "Research Hub", "Business Model Canvas", "SWOT Analysis", "PESTLE Analysis", "Competitor Insights", "Consumer Insight by Audience Segment",
      "Feature Analysis & Related Research", "Business Plan", "Strategy Items", "Strategy Shares", "Strategy Focus Statements", "Strategy Templates",
    ].map((f) => [f, ["Related Dashboards › Market Research & Strategy"]]),
  ),
  "Partnership Pipeline": ["Related Dashboards › Marketing & Sales"],
  "Cold Outreach Pipeline": ["Related Dashboards › Marketing & Sales"],
  "Social Impact & SDG Alignment": ["Related Dashboards › Social Impact"],
  "Grant Applications": ["Related Dashboards › Social Impact"],
  "Programming Master": ["Related Dashboards › Social Impact"],
  ...Object.fromEntries(
    ["Chart of Accounts", "General Ledger", "Accounts Payable", "Payroll & Compensation", "Expense Reimbursement Requests", "Universal P&L & Budget", "Budgets", "M&A & Deal Pipeline"].map(
      (f) => [f, ["Related Dashboards › Finance"]],
    ),
  ),
  "Tax & Compliance Filings": ["Related Dashboards › Finance / Legal"],
  "Contracts & Legal Agreement Register": ["Related Dashboards › Contracts Register"],
  "Tool Registry & Access Log": ["Related Tools (source of truth)", "Card tool chips read from this field"],
  "Tools Library": ["Related Tools", "Legacy text — confirm/retire"],
  "IT & Systems Registry": ["Related Tools"],
  "ANT Library": ["Related Tools › ANTs"],
  "ANT Quick Assists": ["Related Tools › ANTs"],
  "ANT Requests": ["Related Tools › ANTs"],
  "Prompt Library": ["Related Tools › ANTs"],
  "Employee Resources": ["Related Team Resources (link → ClickUp)", "Populate the Employee Resources “Link” field with the ClickUp page URL"],
  "Employee Resources 2": ["Related Team Resources", "Legacy text — confirm/retire"],
  "Brand Guidelines": ["Related Team Resources"],
  "Team Workflows & Strategic Frameworks": ["Related Team Resources"],
  "Team Workflows & Strategic Frameworks 2": ["Related Team Resources", "Duplicate — confirm/retire"],
  "Onboarding Modules & Training Logs": ["Related Team Resources"],
  "Professional Development": ["Phase 3 placeholder", "Phase 3 dashboard — do not build in Phase 1"],
};

/** "Analytics Engineer (BANT)" / "ANT" → ANT role (drawn dashed). */
export const isAnt = (name: string) => /\([^)]*ANT\)|^ANT$/.test(name);
