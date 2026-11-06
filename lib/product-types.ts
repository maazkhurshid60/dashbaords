/* Types for the Product + Communications dashboards (ported from
   VCG_Product_Dashboard.html / VCG_Communications_Dashboard.html). */

export interface Persona {
  id: string;
  name: string;
  full?: string;
  price: number;
  fee?: number;
  priceLabel: string;
  color: string;
  hex: string;
  seg: string;
  missing?: boolean;
  summary: string;
  objectives: string;
  pains: string;
}

export interface Feature {
  id: string;
  name: string;
  area: string;
  status: string;
  roadmap: string;
  quarter: string;
  start: string;
  end: string;
  personas: string[];
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  objective: string;
  votes: number;
  core: string;
  portal: boolean;
  pics?: string | null;
}

export interface Theme {
  id: string;
  name: string;
  feature: string | null;
  w: number;
}

export interface Feedback {
  id: string;
  fid: string;
  summary: string;
  source: string;
  account: string;
  persona: string;
  sentiment: string;
  importance: string;
  theme: string | null;
  feature: string | null;
  date: string;
  status: string;
  notified?: boolean;
}

export interface Account {
  id: string;
  ref: string;
  tier: string;
  status: string;
  stage: string;
  signup: string;
  churn: string | null;
  mrr: number;
  ltv: number;
  nps: number | null;
  geo: string;
  lat: number;
  lng: number;
  used: string[];
  channel: string;
}

export interface Adoption {
  feature: string;
  weekly: number[];
}
export interface Cohort {
  week: string;
  size: number;
  row: number[];
}
export interface RevenueRow {
  month: string;
  projected: number;
  actual: number | null;
}
export interface SpendRow {
  tool: string;
  vendor: string;
  cost: number;
  category: string;
  status: string;
  renewal: string | null;
  real: boolean;
}
export interface Sprint {
  name: string;
  start: string;
  end: string;
  committed: number;
  completed: number | null;
  cycle: number | null;
  state: string;
}
export interface BacklogItem {
  id: string;
  title: string;
  product: string;
  feature: string | null;
  epic: string;
  points: number;
  eng: string;
  blocked: boolean;
}
export interface Deployment {
  id: string;
  state: string;
  target: string;
  branch: string;
  commit: string;
  message: string;
  createdAt: string;
  buildSec: number;
  url: string;
  current: boolean;
}
export interface UptimeDay {
  date: string;
  pct: number | null;
}
export interface PagePerf {
  page: string;
  views: number;
  conv: number;
  bounce: number;
  time: number;
  lcp: number;
  status: string;
}
export interface HealthRow {
  comp: string;
  owner: string;
  sev: string;
  uptime: number | null;
  sec: string;
  debt: string;
}
export interface KeyResult {
  n: string;
  c: number;
  t: number;
  u: string;
  inv?: boolean;
}
export interface Objective {
  id: string;
  name: string;
  owner: string;
  krs: KeyResult[];
}
export interface Gate {
  id?: string;
  pics?: string;
  name: string;
  owner: string;
  status: string;
  evidence: string;
}
export interface GtmLaunch {
  pics?: string;
  name: string;
  date: string;
  status: string;
  personas: string[];
  assets: string[];
  sample: boolean;
}
export interface Experiment {
  name: string;
  feature: string | null;
  status: string;
  metric: string;
  control: number | null;
  variant: number | null;
  users: number;
}
export interface Release {
  version: string;
  date: string;
  env: string;
  status: string;
  features: string[];
  notes: string;
}
export interface PicsRow {
  label: string;
  type: string;
  date: string;
  phase: string;
  status: string;
}
export interface ChecklistItem {
  id: string;
  item: string;
  due: string | null;
  status: string;
  type: string;
  notes: string;
  roadmap?: string;
  owners: string[];
  num?: number;
}
export interface Pics {
  id: string;
  type: string;
  name: string;
  stage: string;
  start: string;
  end: string;
  parentId: string | null;
  tagged?: boolean;
  sample?: boolean;
  rows: PicsRow[];
  checklist: ChecklistItem[];
}
export interface Finding {
  id: string;
  asset: string;
  type: string;
  health: string;
  page: string;
  env: string;
  sync: string;
  swept: string;
  tags: string[];
  fix: string;
  notes: string;
  antReqs: { id: string; title: string; ant: string }[];
  task: { id: string; name: string; assignee: string } | null;
  sev: string;
  status: string;
  assignee: string;
}
export interface Sweep {
  lastRun: string | null;
  findings: Finding[];
}
export interface Named {
  id: string;
  name: string;
}
export interface Site {
  url: string;
  status: string;
  http: number | null;
  ms: number | null;
  checkedAt: string | null;
  ssl: string | null;
  deployments: Deployment[];
  uptime: UptimeDay[];
  vitals: { lcp: number | null; inp: number | null; cls: number | null } | null;
  errorRate: number | null;
  live?: boolean;
}

export interface ProductData {
  mode: "sample" | "live";
  pics: Pics[];
  channels: { name: string; cac: number }[];
  sweep: Sweep | null;
  ants: Named[];
  team: Named[];
  syncedAt: string | null;
  personas: Persona[];
  areas: string[];
  features: Feature[];
  themes: Theme[];
  feedback: Feedback[];
  accounts: Account[];
  weeks: string[];
  adoption: Adoption[];
  wau: number[];
  cohorts: Cohort[];
  revenue: RevenueRow[];
  spend: SpendRow[];
  sprints: Sprint[];
  backlog: BacklogItem[];
  site: Site;
  pagePerf: PagePerf[];
  sitemapTotal: number | null;
  health: HealthRow[];
  objectives: Objective[];
  gates: Gate[];
  gtm: GtmLaunch[];
  experiments: Experiment[];
  releases: Release[];
  warnings?: string[];
  missing?: string[];
  /** live mode: select choices from the Airtable schema, keyed "<AT key>.<field key>" (e.g. "comms.status") */
  options?: Record<string, string[]> | null;
}

/* ---------------- Communications ---------------- */

export interface Attachment {
  name: string;
  size: number | null;
  url: string | null;
  thumb?: string;
}

export interface Ticket {
  id: string;
  ex?: boolean;
  from: string;
  subject: string;
  date: string;
  status: string;
  intent: string;
  needs: boolean;
  channel: string;
  dir: string;
  to: string;
  body: string;
  notes: string;
  draft: string;
  assignee: string;
  rt: number | null;
  reopened: boolean;
  logged: string;
  thread?: string;
  attachments?: Attachment[];
  attSummary?: string;
  votes?: number;
  draftLink?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  page: string;
  dept: string;
  type: string;
  to: string[];
  status: string;
  date: string;
  expires: string;
  pinned: boolean;
  by: string;
  files?: string[];
}

export interface CommsExtra {
  tickets: Ticket[];
  announcements: Announcement[];
  depts: Named[];
  me: string;
  meRole: string;
}

/** Everything a page of the suite can hold. Comms fields only exist on /communications. */
export type SuiteData = ProductData & Partial<CommsExtra>;
export type CommsData = ProductData & CommsExtra;
