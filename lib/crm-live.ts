import "server-only";
import { airtableConfigured, arr, bool, getSchema, links, listRecords, num, str, type AtRecord } from "@/lib/airtable.server";
import {
  emptyCrm,
  type Activity,
  type Alert,
  type Announcement,
  type Answer,
  type Campaign,
  type CampaignEvent,
  type ChatMessage,
  type ChatSession,
  type Company,
  type Contact,
  type CrmData,
  type Kind,
  type Member,
  type Msg,
  type NotifRule,
  type Opp,
  type PageView,
  type Pipeline,
  type SavedView,
  type Source,
  type Stage,
  type Task,
} from "@/lib/crm-types";

/* Server-side loader for the Communications CRM. Every table is read with listRecords (60s
   cache, tag per table; writes invalidate it). Field names verified against the base schema
   on 2026-11-18. Live mode never mixes in example rows: an empty table renders an empty state. */

export const CRM_TABLES = {
  msgs: "tblzb0tCJJoZCmo17", // Communications
  contacts: "tblyoslnD6Z3J6xXz",
  companies: "tbl3mspypWLSCpVus",
  opps: "tblATuQGfo9YIzMzv", // Opportunities
  pipelines: "tblISA8x0lX8bKBWw",
  stages: "tblZq7EYaezMyUBqk", // Pipeline Stages
  activities: "tblT2HgoJYzA2lEmp",
  alerts: "tbllKnt83pekWlWJ0",
  announcements: "tblsFJrIbGx7qNJEx",
  answers: "tblV5EYUTiIFqha3R", // Answer Library
  chatSessions: "tbleVx36alwtvPfD5",
  chatMessages: "tblb42s5deL8fmJcv",
  pageViews: "tblb91mSDEoFdVemN", // Session Page Views
  views: "tblroxGGnxGRlkAEV", // Saved Views
  rules: "tblnfpwy6Mi6x3V7p", // Notification Rules
  sources: "tblG0fo8xo7BVPGxA", // Inbox Sources
  campaigns: "tblT9QDmMwvJ3Mzpo", // Email Campaigns
  campaignEvents: "tblDMmu7jeoSr8Z8c", // Campaign Activity
  tasks: "tblyOuPIvgifN4OOQ", // Tasks Planning
  members: "tbl35kTjgPye2KTQ0", // Team Members
  departments: "tblC2JxYOcofjMbFm",
  pics: "tblbiIHxN97iyltFY",
  pages: "tblElR6EYDtchNnRu", // Site Map & Architecture
} as const;

type R = AtRecord;
const d = (r: R, k: string) => str(r.fields[k]);
const n0 = (v: unknown) => num(v) ?? 0;
const BODY_MAX = 6000;

/* ---------------------------------------------------------------- mappers */
export const toMember = (r: R): Member => ({
  id: r.id,
  name: d(r, "Name"),
  email: d(r, "Email").split(/[\s,;]+/)[0] || "",
  roles: arr(r.fields["Role"]),
  intranetRole: d(r, "Intranet Role"),
  slackId: d(r, "Slack Member ID"),
  active: bool(r.fields["Currently Working"]) || bool(r.fields["Active Roster"]),
});

export const toMsg = (r: R): Msg => ({
  id: r.id,
  subject: d(r, "Subject"),
  date: d(r, "Email Date") || r.createdTime,
  status: d(r, "Status"),
  channel: d(r, "Channel"),
  direction: d(r, "Direction") || d(r, "Category"),
  from: d(r, "From"),
  to: d(r, "To"),
  body: d(r, "Body").slice(0, BODY_MAX),
  draft: d(r, "Reply Draft"),
  needs: bool(r.fields["Needs Response"]),
  intent: d(r, "Intent"),
  assigneeIds: links(r.fields["Assignee"]),
  contactIds: links(r.fields["Contact"]),
  oppIds: links(r.fields["Opportunities"]),
  sourceIds: links(r.fields["Inbox Sources"]),
  campaignIds: links(r.fields["Email Campaign"]),
  chatIds: links(r.fields["Chat Sessions"]),
  taskIds: links(r.fields["Tasks Planning"]),
  sentFrom: d(r, "Sent From"),
  outboundCampaign: d(r, "Outbound Campaign"),
  aiSummary: d(r, "AI Summary"),
  snoozedUntil: d(r, "Snoozed Until"),
  answeredByAI: bool(r.fields["Answered By AI"]),
  replyVisibility: d(r, "Reply Visibility"),
  threadUrl: d(r, "Thread URL"),
  reopened: bool(r.fields["Reopened"]),
  notes: d(r, "Notes"),
});

export const toContact = (r: R): Contact => ({
  id: r.id,
  name: d(r, "Name"),
  org: d(r, "Outlet / Organization"),
  title: d(r, "Role / Title"),
  relationship: d(r, "Relationship"),
  email: d(r, "Email"),
  phone: d(r, "Phone"),
  location: d(r, "Location"),
  lastContacted: d(r, "Last Contacted"),
  notes: d(r, "Notes"),
  companyIds: links(r.fields["Company"]),
  stage: d(r, "Lifecycle Stage"),
  score: num(r.fields["Lead Score"]),
  ownerIds: links(r.fields["Owner"]),
  source: d(r, "Lead Source"),
  tags: arr(r.fields["Tags"]),
  followedByIds: links(r.fields["Followed By"]),
  created: d(r, "Created") || r.createdTime,
  msgCount: num(r.fields["Message Count"]),
  lastMessageAt: d(r, "Last Message At"),
  openTasks: num(r.fields["Open Tasks"]),
  contractorStatus: d(r, "Contractor Status"),
  engagement: d(r, "Engagement Type"),
  teamMemberIds: links(r.fields["Team Member"]),
  deptIds: links(r.fields["Department"]),
  oppIds: links(r.fields["Opportunities"]),
  picsIds: links(r.fields["Related P.I.C.S"]),
  firstLandingIds: links(r.fields["First Landing Page"]),
  categories: arr(r.fields["Contact Category"]),
  social: d(r, "Social Handle"),
  website: d(r, "Website"),
  duplicateOfIds: links(r.fields["Duplicate Of"]),
});

export const toCompany = (r: R): Company => ({
  id: r.id,
  name: d(r, "Company Name"),
  website: d(r, "Website"),
  industry: d(r, "Industry"),
  size: d(r, "Size"),
  city: d(r, "City"),
  tier: d(r, "Tier"),
  notes: d(r, "Notes"),
  ownerIds: links(r.fields["Owner"]),
  created: d(r, "Created") || r.createdTime,
  contactIds: links(r.fields["Contacts"]),
  oppIds: links(r.fields["Opportunities"]),
  openPipeline: num(r.fields["Open Pipeline"]),
  won: num(r.fields["Won"]),
});

export const toOpp = (r: R): Opp => ({
  id: r.id,
  name: d(r, "Opportunity Name"),
  pipeline: d(r, "Pipeline"),
  stageId: links(r.fields["Pipeline Stage"])[0] || "",
  stage: d(r, "Stage"),
  stageType: d(r, "Stage Type"),
  probability: num(r.fields["Probability"]),
  value: num(r.fields["Value"]),
  closeDate: d(r, "Close Date"),
  nextStep: d(r, "Next Step"),
  nextStepDate: d(r, "Next Step Date"),
  lostReason: d(r, "Lost Reason"),
  plan: d(r, "Plan"),
  contactIds: links(r.fields["Primary Contact"]),
  companyIds: links(r.fields["Company"]),
  ownerIds: links(r.fields["Owner"]),
  followedByIds: links(r.fields["Followed By"]),
  picsIds: links(r.fields["Related P.I.C.S"]),
  msgIds: links(r.fields["Source Message"]),
  campaignIds: links(r.fields["Email Campaigns"]),
  created: d(r, "Created") || r.createdTime,
  stageChangedAt: d(r, "Stage Changed At"),
  daysInStage: num(r.fields["Days in Stage"]),
  stale: bool(r.fields["Stale"]) || /^(1|true|yes|stale)/i.test(d(r, "Stale")),
});

const toStage = (r: R): Stage => ({
  id: r.id,
  name: d(r, "Name") || d(r, "Stage"),
  type: d(r, "Stage Type"),
  order: n0(r.fields["Order"]),
  probability: n0(r.fields["Probability"]),
  guidance: d(r, "Guidance"),
});

export const toPipeline = (r: R): Pipeline => ({
  id: r.id,
  name: d(r, "Pipeline Name"),
  order: n0(r.fields["Order"]),
  active: bool(r.fields["Active"]),
  description: d(r, "Description"),
});

export const toActivity = (r: R): Activity => ({
  id: r.id,
  subject: d(r, "Subject"),
  type: d(r, "Type"),
  body: d(r, "Body").slice(0, BODY_MAX),
  date: d(r, "Date") || r.createdTime,
  source: d(r, "Source"),
  contactIds: links(r.fields["Contact"]),
  oppIds: links(r.fields["Opportunity"]),
  ownerIds: links(r.fields["Owner"]),
  msgIds: links(r.fields["Communication"]),
});

export const toTask = (r: R): Task => ({
  id: r.id,
  task: d(r, "Task"),
  assigneeIds: links(r.fields["Assigned To"]),
  due: d(r, "Due Date"),
  priority: d(r, "Priority"),
  status: d(r, "Status"),
  completed: bool(r.fields["Completed"]),
  picsTag: d(r, "P.I.C.S Tag"),
  picsIds: links(r.fields["Related P.I.C.S"]),
  contactIds: links(r.fields["Related Contact"]),
  oppIds: links(r.fields["Related Opportunity"]),
  msgIds: links(r.fields["Related Communications"]),
});

export const toAnnouncement = (r: R): Announcement => ({
  id: r.id,
  title: d(r, "Title"),
  body: d(r, "Body"),
  type: d(r, "Type"),
  page: d(r, "Target Page"),
  status: d(r, "Status"),
  publishDate: d(r, "Publish Date"),
  expires: d(r, "Expires"),
  pinned: bool(r.fields["Pinned"]),
  postedByIds: links(r.fields["Posted By"]),
  publishTo: arr(r.fields["Publish To"]),
  slackChannel: d(r, "Slack Channel"),
  slackSentAt: d(r, "Slack Sent At"),
  emailSentAt: d(r, "Email Sent At"),
  likes: num(r.fields["Likes"]),
  oppIds: links(r.fields["Related Opportunity"]),
  contactIds: links(r.fields["Related Contact"]),
  created: r.createdTime,
});

export const toSource = (r: R): Source => ({
  id: r.id,
  name: d(r, "Source Name"),
  type: d(r, "Source Type"),
  address: d(r, "Address / URL"),
  website: d(r, "Website"),
  platform: d(r, "Platform"),
  status: d(r, "Status"),
  ownerIds: links(r.fields["Owner"]),
  replyFrom: d(r, "Reply From"),
  slackChannel: d(r, "Slack Channel"),
  intranetAlerts: bool(r.fields["Intranet Alerts"]),
  aiDrafts: bool(r.fields["AI Drafts"]),
  aiAutoReply: bool(r.fields["AI Auto-Reply (Community)"]),
  replyWindow: num(r.fields["Reply Window (hours)"]),
  syncMethod: d(r, "Sync Method"),
  lastSynced: d(r, "Last Synced"),
  notes: d(r, "Notes"),
});

export const toCampaign = (r: R): Campaign => ({
  id: r.id,
  name: d(r, "Campaign Name"),
  channel: d(r, "Channel"),
  status: d(r, "Status"),
  senderIds: links(r.fields["Sender"]),
  ownerIds: links(r.fields["Owner"]),
  list: d(r, "Recipient List"),
  started: d(r, "Started"),
  prospects: n0(r.fields["Prospects"]),
  sent: n0(r.fields["Sent"]),
  opened: n0(r.fields["Opened"]),
  clicked: n0(r.fields["Clicked"]),
  replied: n0(r.fields["Replied"]),
  bounced: n0(r.fields["Bounced"]),
  unsubscribed: n0(r.fields["Unsubscribed"]),
  steps: d(r, "Workflow Steps"),
  notes: d(r, "Notes"),
  lastSynced: d(r, "Last Synced"),
});

const toCampaignEvent = (r: R): CampaignEvent => ({
  id: r.id,
  event: d(r, "Event"),
  type: d(r, "Event Type"),
  campaignIds: links(r.fields["Campaign"]),
  email: d(r, "Recipient Email"),
  contactIds: links(r.fields["Contact"]),
  step: num(r.fields["Step"]),
  at: d(r, "Occurred At") || r.createdTime,
  msgIds: links(r.fields["Communication"]),
});

export const toChatSession = (r: R): ChatSession => ({
  id: r.id,
  sessionId: d(r, "Session ID"),
  visitor: d(r, "Visitor Name"),
  visitorEmail: d(r, "Visitor Email"),
  online: bool(r.fields["Visitor Online"]),
  status: d(r, "Status"),
  handedOffAt: d(r, "Handed Off At"),
  handoffReason: d(r, "Hand-off Reason"),
  referrer: d(r, "Referrer / Source"),
  utm: d(r, "UTM"),
  device: d(r, "Device"),
  city: d(r, "City"),
  visits: num(r.fields["Visit Count"]),
  timeOnSite: num(r.fields["Time on Site"]),
  signedIn: d(r, "Signed In"),
  startedAt: d(r, "Started At") || r.createdTime,
  msgIds: links(r.fields["Communication"]),
  contactIds: links(r.fields["Contact"]),
  landingIds: links(r.fields["Landing Page"]),
  chatStartIds: links(r.fields["Chat Start Page"]),
});

export const toChatMessage = (r: R): ChatMessage => ({
  id: r.id,
  senderType: d(r, "Sender Type"),
  senderName: d(r, "Sender Name"),
  text: d(r, "Text") || d(r, "Message"),
  sentAt: d(r, "Sent At") || r.createdTime,
  via: d(r, "Delivered Via"),
  sessionIds: links(r.fields["Session"]),
});

const toPageView = (r: R): PageView => ({
  id: r.id,
  name: d(r, "Name"),
  url: d(r, "URL"),
  step: num(r.fields["Step"]),
  seconds: num(r.fields["Seconds Into Visit"]),
  at: d(r, "Viewed At"),
  sessionIds: links(r.fields["Session"]),
});

export const toView = (r: R): SavedView => ({
  id: r.id,
  name: d(r, "View Name"),
  object: d(r, "Object"),
  stages: arr(r.fields["Stages"]),
  locations: d(r, "Locations"),
  months: d(r, "Months"),
  sources: arr(r.fields["Sources"]),
  tiers: arr(r.fields["Tiers"]),
  industries: arr(r.fields["Industries"]),
  pipelines: arr(r.fields["Pipelines"]),
  stageTypes: arr(r.fields["Stage Types"]),
  closeMonths: d(r, "Close Months"),
  shared: bool(r.fields["Shared"]),
  ownerIds: links(r.fields["Owners"]),
});

export const toRule = (r: R): NotifRule => ({
  id: r.id,
  inbox: d(r, "Inbox"),
  intranet: bool(r.fields["Intranet"]),
  slack: bool(r.fields["Slack"]),
  slackChannel: d(r, "Slack Channel"),
  email: bool(r.fields["Email"]),
  events: arr(r.fields["Events"]),
  quietHours: d(r, "Quiet Hours"),
  ownerIds: links(r.fields["Owner"]),
});

const toAlert = (r: R): Alert => ({
  id: r.id,
  alert: d(r, "Alert"),
  type: d(r, "Alert Type"),
  slackChannel: d(r, "Slack Channel"),
  sentAt: d(r, "Sent At") || r.createdTime,
  msgIds: links(r.fields["Communication"]),
  readByIds: links(r.fields["Read By"]),
});

export const toAnswer = (r: R): Answer => ({
  id: r.id,
  title: d(r, "Answer Title"),
  body: d(r, "Answer Body"),
  category: d(r, "Answer Category"),
  approved: bool(r.fields["Approved"]),
});

/** Maps a raw record of a write's target collection to the client shape. */
export const MAPPERS: Record<Kind, (r: R) => { id: string }> = {
  msgs: toMsg,
  contacts: toContact,
  companies: toCompany,
  opps: toOpp,
  pipelines: toPipeline,
  activities: toActivity,
  tasks: toTask,
  announcements: toAnnouncement,
  sources: toSource,
  campaigns: toCampaign,
  chatSessions: toChatSession,
  chatMessages: toChatMessage,
  views: toView,
  rules: toRule,
  answers: toAnswer,
};

/* Select fields whose choices the UI offers (Table → fields). */
const OPTION_FIELDS: Record<string, string[]> = {
  Communications: ["Status", "Channel", "Intent", "Reply Visibility"],
  Contacts: ["Lifecycle Stage", "Lead Source", "Tags", "Relationship", "Contractor Status", "Engagement Type", "Contact Category"],
  Companies: ["Industry", "Tier"],
  Opportunities: ["Pipeline", "Lost Reason", "Plan"],
  Activities: ["Type", "Source"],
  "Tasks Planning": ["Priority", "Status"],
  Announcements: ["Type", "Target Page", "Status", "Publish To"],
  "Inbox Sources": ["Source Type", "Website", "Platform", "Status"],
  "Email Campaigns": ["Status", "Channel"],
  "Chat Sessions": ["Status"],
  "Notification Rules": ["Events"],
  "Answer Library": ["Answer Category"],
  "Saved Views": ["Object", "Stages", "Sources", "Pipelines", "Stage Types"],
};

async function loadOptions() {
  const out: Record<string, string[]> = {};
  const schema = await getSchema();
  for (const [table, fields] of Object.entries(OPTION_FIELDS)) {
    const t = schema.find((x) => x.name === table);
    for (const f of fields) {
      const fld = t?.fields.find((x) => x.name === f);
      const ch = fld?.options?.choices?.map((c) => c.name.trim()).filter(Boolean);
      if (ch) out[`${table}.${f}`] = [...new Set(ch)];
    }
  }
  return out;
}

async function nameMap(tableId: string, field: string) {
  const rows = await listRecords(tableId, { fields: [field] });
  return Object.fromEntries(rows.map((r) => [r.id, str(r.fields[field])]));
}

/** Loads every CRM table. A table that fails is reported in `errors` and left empty. */
export async function loadCrm(): Promise<CrmData> {
  if (!airtableConfigured()) return emptyCrm(["Airtable is not configured (AIRTABLE_TOKEN missing)."]);
  const out = emptyCrm();
  out.live = true;
  const T = CRM_TABLES;
  const errors: string[] = [];
  const get = async <K>(label: string, p: Promise<K>, fallback: K): Promise<K> => {
    try {
      return await p;
    } catch (e) {
      console.error("[crm-live]", label, e);
      errors.push(`${label}: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
      return fallback;
    }
  };
  const map = <X>(tableId: string, label: string, fn: (r: R) => X, opts: Parameters<typeof listRecords>[1] = {}) =>
    get(label, listRecords(tableId, opts).then((rs) => rs.map(fn)), [] as X[]);

  const [members, msgs, contacts, companies, opps, stages, pipelines, activities, tasks, announcements, sources, campaigns, campaignEvents] = await Promise.all([
    map(T.members, "Team Members", toMember, {
      fields: ["Name", "Email", "Role", "Intranet Role", "Slack Member ID", "Currently Working", "Active Roster"],
    }),
    map(T.msgs, "Communications", toMsg, { sort: [{ field: "Email Date", direction: "desc" }] }),
    map(T.contacts, "Contacts", toContact),
    map(T.companies, "Companies", toCompany),
    map(T.opps, "Opportunities", toOpp),
    map(T.stages, "Pipeline Stages", toStage),
    map(T.pipelines, "Pipelines", toPipeline),
    map(T.activities, "Activities", toActivity),
    map(T.tasks, "Tasks Planning", toTask, {
      filterByFormula: "OR({Related Contact}!='',{Related Opportunity}!='',{Related Communications}!='')",
      fields: ["Task", "Assigned To", "Due Date", "Priority", "Status", "Completed", "P.I.C.S Tag", "Related P.I.C.S", "Related Contact", "Related Opportunity", "Related Communications"],
    }),
    map(T.announcements, "Announcements", toAnnouncement),
    map(T.sources, "Inbox Sources", toSource),
    map(T.campaigns, "Email Campaigns", toCampaign),
    map(T.campaignEvents, "Campaign Activity", toCampaignEvent),
  ]);
  const [chatSessions, chatMessages, pageViews, views, rules, alerts, answers, options, depts, pics, pages] = await Promise.all([
    map(T.chatSessions, "Chat Sessions", toChatSession),
    map(T.chatMessages, "Chat Messages", toChatMessage),
    map(T.pageViews, "Session Page Views", toPageView),
    map(T.views, "Saved Views", toView),
    map(T.rules, "Notification Rules", toRule),
    map(T.alerts, "Alerts", toAlert),
    map(T.answers, "Answer Library", toAnswer),
    get("Schema", loadOptions(), {} as Record<string, string[]>),
    get("Departments", nameMap(T.departments, "Department Name"), {} as Record<string, string>),
    get("P.I.C.S", nameMap(T.pics, "P.I.C.S Name"), {} as Record<string, string>),
    get("Site Map & Architecture", nameMap(T.pages, "Page Name"), {} as Record<string, string>),
  ]);
  stages.sort((a, b) => a.order - b.order);
  pipelines.sort((a, b) => a.order - b.order);
  return {
    ...out,
    errors,
    members: members.filter((m) => m.name),
    msgs,
    contacts,
    companies,
    opps,
    stages,
    pipelines,
    activities,
    tasks,
    announcements,
    sources,
    campaigns,
    campaignEvents,
    chatSessions,
    chatMessages,
    pageViews,
    views,
    rules,
    alerts,
    answers,
    options,
    names: { ...depts, ...pics, ...pages },
  };
}
