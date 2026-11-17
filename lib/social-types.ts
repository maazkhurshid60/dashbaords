/* Shared (client + server) types and constants for the Social Impact dashboard (/social-impact).
   Field names in comments are the Airtable field names in the VCG Intranet base. */

export const SI_TABLES = {
  scraper: "tblt5etJ4crXln5cN", // Grants Scraper Database
  funders: "tblJvVX2SOJ7IwCPM", // Funders & Grantmakers
  applications: "tblNhzS8NBjrIkZ6M", // Grant Applications
  sections: "tblYyOun8j250DZHB", // Grant Application Sections
  answers: "tblV5EYUTiIFqha3R", // Answer Library
  programmes: "tblJh08iutbk5lTt3", // Programming Master
  sessions: "tblBxcbV8ADRuNIuR", // Program Sessions and Cohorts
  donors: "tblKmnTVD8chxaP37", // Sponsors and Donors
  gifts: "tblM97JwFeb92SsMY", // Gifts and Contributions Ledger
  outcomes: "tblZmpltA9oaLGewC", // Impact Outcomes
  reports: "tblNZKEDqiiQwqfHB", // Grant Reports & Compliance
  sdg: "tblIKKYzdHyYYE63T", // Social Impact & SDG Alignment
  pics: "tblbiIHxN97iyltFY", // P.I.C.S
  opportunities: "tblATuQGfo9YIzMzv", // Opportunities
} as const;

export const SI_VIEWS = ["Overview", "Nail Networks", "Grant Scrapers", "Opportunity Pipeline", "Application Builder"] as const;
export type SiView = (typeof SI_VIEWS)[number];

/** VCG's Greater Good Goals: the 10 UN SDGs VCG has adopted (official SDG colours). */
export const GGG: { n: number; name: string; color: string }[] = [
  { n: 1, name: "No Poverty", color: "#E5243B" },
  { n: 3, name: "Good Health and Well-being", color: "#4C9F38" },
  { n: 4, name: "Quality Education", color: "#C5192D" },
  { n: 8, name: "Decent Work and Economic Growth", color: "#A21942" },
  { n: 9, name: "Industry, Innovation and Infrastructure", color: "#FD6925" },
  { n: 10, name: "Reduced Inequalities", color: "#DD1367" },
  { n: 11, name: "Sustainable Cities and Communities", color: "#FD9D24" },
  { n: 12, name: "Responsible Consumption and Production", color: "#BF8B2E" },
  { n: 16, name: "Peace, Justice and Strong Institutions", color: "#00689D" },
  { n: 17, name: "Partnerships for the Goals", color: "#19486A" },
];

export interface ScraperRow {
  id: string;
  title: string;
  funderRaw: string;
  funder: string; // Matched Funder name(s)
  source: string;
  sourceUrl: string;
  dateScraped: string;
  deadline: string;
  deadlineType: string;
  min: number | null;
  max: number | null;
  eligibility: string;
  focus: string[];
  geo: string;
  requiresMatch: boolean;
  fit: number | null;
  rationale: string;
  triage: string;
  rejection: string;
  promotedApp: string[]; // Grant Applications ids
  notes: string;
}

export interface Funder {
  id: string;
  name: string;
  type: string;
  website: string;
  focus: string[];
  scope: string[];
  low: number | null;
  high: number | null;
  cycle: string;
  relationship: string;
  owner: string;
  intelligence: string;
  apps: number;
}

export interface Application {
  id: string;
  name: string;
  funder: string;
  stage: string;
  zone: string;
  requested: number | null;
  awarded: number | null;
  probability: number | null; // 0..1
  weighted: number | null;
  deadline: string;
  loiDue: string;
  daysToDeadline: number | null;
  sectionsComplete: number | null;
  sectionsTotal: number | null;
  completion: number | null; // 0..1
  owner: string;
  portalUrl: string;
  restriction: string;
  notes: string;
  sectionIds: string[];
}

export interface Section {
  id: string;
  title: string;
  appId: string;
  prompt: string;
  order: number | null;
  type: string;
  required: boolean;
  wordLimit: number | null;
  charLimit: number | null;
  status: string;
  draft: string;
  answersUsed: string[];
}

export interface Answer {
  id: string;
  title: string;
  body: string;
  category: string;
  approved: boolean;
  timesUsed: number | null;
}

export interface Programme {
  id: string;
  name: string;
  type: string;
  status: string;
  start: string;
  end: string;
  enrolled: number | null;
  capacity: number | null;
  socialImpact: boolean;
}

export interface SdgRow {
  id: string;
  sdg: string;
  number: number | null;
  application: string;
  program: string;
  status: string;
  outcomes: number;
}

export interface NnOpportunity {
  id: string;
  name: string;
  stage: string;
  value: number | null;
  probability: number | null;
  nextStep: string;
  nextStepDate: string;
  closeDate: string;
  daysInStage: number | null;
}

export interface NailNetworks {
  id: string;
  name: string;
  tag: string;
  stage: string;
  type: string;
  start: string;
  end: string;
  overview: string;
  checklistCount: number;
  taskCount: number;
  opportunities: NnOpportunity[];
}

export interface SocialData {
  scraper: ScraperRow[];
  funders: Funder[];
  applications: Application[];
  sections: Section[];
  answers: Answer[];
  programmes: Programme[];
  sdg: SdgRow[];
  nail: NailNetworks | null;
  counts: { sessions: number; donors: number; gifts: number; giftsTotal: number; outcomes: number; reportsOpen: number; reports: number };
  /** Existing select choices (from the base schema) used by the write controls. */
  choices: { appStage: string[]; sectionStatus: string[] };
}

export const EMPTY_SOCIAL: SocialData = {
  scraper: [],
  funders: [],
  applications: [],
  sections: [],
  answers: [],
  programmes: [],
  sdg: [],
  nail: null,
  counts: { sessions: 0, donors: 0, gifts: 0, giftsTotal: 0, outcomes: 0, reportsOpen: 0, reports: 0 },
  choices: { appStage: [], sectionStatus: [] },
};

/** Audit areas sent with each write (logged to Dashboard Sync Queue as Tab / Area). */
export const SI_DASHBOARD = "Social Impact";
