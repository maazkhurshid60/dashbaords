/* Communications CRM — record shapes shared by the server loader (lib/crm-live.ts), the write
   routes (app/api/comms/**) and the client (components/crm/**). Every field maps 1:1 to an
   Airtable column; see CRM_TABLES / the data map PDF for the names. */

export type Id = string;

export interface Member {
  id: Id;
  name: string;
  email: string;
  roles: string[];
  intranetRole: string; // Team Members › Intranet Role (Admin | Team member)
  slackId: string;
  active: boolean;
}

export interface Msg {
  id: Id;
  subject: string;
  date: string; // Email Date (falls back to createdTime)
  status: string;
  channel: string;
  direction: string;
  from: string;
  to: string;
  body: string;
  draft: string;
  needs: boolean;
  intent: string;
  assigneeIds: Id[];
  contactIds: Id[];
  oppIds: Id[];
  sourceIds: Id[];
  campaignIds: Id[];
  chatIds: Id[];
  taskIds: Id[];
  sentFrom: string;
  outboundCampaign: string;
  aiSummary: string;
  snoozedUntil: string;
  answeredByAI: boolean;
  replyVisibility: string;
  threadUrl: string;
  reopened: boolean;
  notes: string;
}

export interface Contact {
  id: Id;
  name: string;
  org: string;
  title: string;
  relationship: string;
  email: string;
  phone: string;
  location: string;
  lastContacted: string;
  notes: string;
  companyIds: Id[];
  stage: string;
  score: number | null;
  ownerIds: Id[];
  source: string;
  tags: string[];
  followedByIds: Id[];
  created: string;
  msgCount: number | null;
  lastMessageAt: string;
  openTasks: number | null;
  contractorStatus: string;
  engagement: string;
  teamMemberIds: Id[];
  deptIds: Id[];
  oppIds: Id[];
  picsIds: Id[];
  firstLandingIds: Id[];
  categories: string[];
  social: string;
  website: string;
  duplicateOfIds: Id[];
}

export interface Company {
  id: Id;
  name: string;
  website: string;
  industry: string;
  size: string;
  city: string;
  tier: string;
  notes: string;
  ownerIds: Id[];
  created: string;
  contactIds: Id[];
  oppIds: Id[];
  openPipeline: number | null;
  won: number | null;
}

export interface Opp {
  id: Id;
  name: string;
  pipeline: string;
  stageId: Id;
  stage: string;
  stageType: string;
  probability: number | null;
  value: number | null;
  closeDate: string;
  nextStep: string;
  nextStepDate: string;
  lostReason: string;
  plan: string;
  contactIds: Id[];
  companyIds: Id[];
  ownerIds: Id[];
  followedByIds: Id[];
  picsIds: Id[];
  msgIds: Id[];
  campaignIds: Id[];
  created: string;
  stageChangedAt: string;
  daysInStage: number | null;
  stale: boolean;
}

export interface Stage {
  id: Id;
  name: string;
  type: string;
  order: number;
  probability: number;
  guidance: string;
}

export interface Pipeline {
  id: Id;
  name: string;
  order: number;
  active: boolean;
  description: string;
}

export interface Activity {
  id: Id;
  subject: string;
  type: string;
  body: string;
  date: string;
  source: string;
  contactIds: Id[];
  oppIds: Id[];
  ownerIds: Id[];
  msgIds: Id[];
}

export interface Task {
  id: Id;
  task: string;
  assigneeIds: Id[];
  due: string;
  priority: string;
  status: string;
  completed: boolean;
  picsTag: string;
  picsIds: Id[];
  contactIds: Id[];
  oppIds: Id[];
  msgIds: Id[];
}

export interface Announcement {
  id: Id;
  title: string;
  body: string;
  type: string;
  page: string;
  status: string;
  publishDate: string;
  expires: string;
  pinned: boolean;
  postedByIds: Id[];
  publishTo: string[];
  slackChannel: string;
  slackSentAt: string;
  emailSentAt: string;
  likes: number | null;
  oppIds: Id[];
  contactIds: Id[];
  created: string;
}

export interface Source {
  id: Id;
  name: string;
  type: string;
  address: string;
  website: string;
  platform: string;
  status: string;
  ownerIds: Id[];
  replyFrom: string;
  slackChannel: string;
  intranetAlerts: boolean;
  aiDrafts: boolean;
  aiAutoReply: boolean;
  replyWindow: number | null;
  syncMethod: string;
  lastSynced: string;
  notes: string;
}

export interface Campaign {
  id: Id;
  name: string;
  channel: string;
  status: string;
  senderIds: Id[];
  ownerIds: Id[];
  list: string;
  started: string;
  prospects: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  steps: string;
  notes: string;
  lastSynced: string;
}

export interface CampaignEvent {
  id: Id;
  event: string;
  type: string;
  campaignIds: Id[];
  email: string;
  contactIds: Id[];
  step: number | null;
  at: string;
  msgIds: Id[];
}

export interface ChatSession {
  id: Id;
  sessionId: string;
  visitor: string;
  visitorEmail: string;
  online: boolean;
  status: string;
  handedOffAt: string;
  handoffReason: string;
  referrer: string;
  utm: string;
  device: string;
  city: string;
  visits: number | null;
  timeOnSite: number | null;
  signedIn: string;
  startedAt: string;
  msgIds: Id[];
  contactIds: Id[];
  landingIds: Id[];
  chatStartIds: Id[];
}

export interface ChatMessage {
  id: Id;
  senderType: string;
  senderName: string;
  text: string;
  sentAt: string;
  via: string;
  sessionIds: Id[];
}

export interface PageView {
  id: Id;
  name: string;
  url: string;
  step: number | null;
  seconds: number | null;
  at: string;
  sessionIds: Id[];
}

export interface SavedView {
  id: Id;
  name: string;
  object: string;
  stages: string[];
  locations: string;
  months: string;
  sources: string[];
  tiers: string[];
  industries: string[];
  pipelines: string[];
  stageTypes: string[];
  closeMonths: string;
  shared: boolean;
  ownerIds: Id[];
}

export interface NotifRule {
  id: Id;
  inbox: string;
  intranet: boolean;
  slack: boolean;
  slackChannel: string;
  email: boolean;
  events: string[];
  quietHours: string;
  ownerIds: Id[];
}

export interface Alert {
  id: Id;
  alert: string;
  type: string;
  slackChannel: string;
  sentAt: string;
  msgIds: Id[];
  readByIds: Id[];
}

export interface Answer {
  id: Id;
  title: string;
  body: string;
  category: string;
  approved: boolean;
}

export interface CrmData {
  live: boolean;
  syncedAt: string;
  errors: string[];
  members: Member[];
  msgs: Msg[];
  contacts: Contact[];
  companies: Company[];
  opps: Opp[];
  stages: Stage[];
  pipelines: Pipeline[];
  activities: Activity[];
  tasks: Task[];
  announcements: Announcement[];
  sources: Source[];
  campaigns: Campaign[];
  campaignEvents: CampaignEvent[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
  pageViews: PageView[];
  views: SavedView[];
  rules: NotifRule[];
  alerts: Alert[];
  answers: Answer[];
  /** id → display name for linked tables we only show by name (Departments, P.I.C.S, Site pages). */
  names: Record<Id, string>;
  /** "Table.Field" → select choices from the Airtable schema. */
  options: Record<string, string[]>;
}

/** Collections that writes can return a fresh record for. */
export type Kind =
  | "msgs"
  | "contacts"
  | "companies"
  | "opps"
  | "pipelines"
  | "activities"
  | "tasks"
  | "announcements"
  | "sources"
  | "campaigns"
  | "chatSessions"
  | "chatMessages"
  | "views"
  | "rules"
  | "answers";

export interface WriteResult {
  ok: boolean;
  error?: string;
  /** Records created/updated, already mapped to the client shapes. */
  records?: { kind: Kind; record: { id: Id } }[];
  /** Removed record ids. */
  removed?: { kind: Kind; id: Id }[];
  /** External services the action would also use but which have no keys yet. */
  notConnected?: string[];
}

export const emptyCrm = (errors: string[] = []): CrmData => ({
  live: false,
  syncedAt: new Date().toISOString(),
  errors,
  members: [],
  msgs: [],
  contacts: [],
  companies: [],
  opps: [],
  stages: [],
  pipelines: [],
  activities: [],
  tasks: [],
  announcements: [],
  sources: [],
  campaigns: [],
  campaignEvents: [],
  chatSessions: [],
  chatMessages: [],
  pageViews: [],
  views: [],
  rules: [],
  alerts: [],
  answers: [],
  names: {},
  options: {},
});
