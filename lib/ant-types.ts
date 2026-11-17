/* ANT Connector — shared (client-safe) types. Loaders live in lib/ant-data.server.ts. */

export const ANT_TABLES = {
  library: "tbldfHdLTG8FEIY1f",
  quickAssists: "tblzgjVZaSKMnkSEh",
  prompts: "tbl0wslF9EKF86ivf",
  requests: "tbl9GARyj0MjQXV6e",
  departments: "tblC2JxYOcofjMbFm",
} as const;

export const HIERARCHY = ["Orchestrator", "Master ANT", "Command ANT"] as const;
/* Airtable spelling kept ("In the Qeue"). */
export const REQUEST_STATUSES = ["Not Started", "In the Qeue", "Pending", "In Progress", "Returned", "Completed", "Cancelled"] as const;
export const PRIORITIES = ["Urgent", "High", "Normal", "Low"] as const;
export const QUEUE_TYPES = ["Immediate", "Daily", "Recurring / Ongoing", "Overnight", "On Demand"] as const;

export interface Ant {
  id: string;
  name: string;
  hierarchy: string; // "" when unset in Airtable
  active: boolean;
  overview: string;
  departments: string[];
  functions: string;
  outputs: string;
  triggers: string;
  /** Length of ANT BRAIN; the brain itself stays on the server (it feeds the system prompt). */
  brainChars: number;
  brainUrls: string;
  quickAssistIds: string[];
  promptIds: string[];
}

export interface QuickAssist {
  id: string;
  title: string;
  antIds: string[];
  departments: string[];
  trigger: string;
  preset: string;
  active: boolean;
  tables: string[];
  promptIds: string[];
}

export interface Prompt {
  id: string;
  name: string;
  template: string;
  type: string;
  antIds: string[];
  omniReady: boolean;
  description: string;
  status: string;
  outputFormat: string;
  departments: string[];
}

export interface AntRequest {
  id: string;
  num: number | null;
  title: string;
  snippet: string;
  location: string;
  status: string;
  priority: string;
  due: string;
  queueType: string;
  origin: string;
  submitted: string;
  completed: string;
  departments: string[];
  antIds: string[];
  quickAssistIds: string[];
}

export interface AntRequestDetail extends AntRequest {
  description: string;
  output: string;
  transcript: string;
  outputUrls: string;
}

export interface AntData {
  ants: Ant[];
  quickAssists: QuickAssist[];
  prompts: Prompt[];
  requests: AntRequest[];
  departments: { id: string; name: string }[];
}

export type ChatMsg = { role: "user" | "assistant"; content: string };

/** Short ANT entry for pickers (chat widget). */
export interface AntOption {
  id: string;
  name: string;
  hierarchy: string;
}

/** Fill-in-the-blank placeholders in prompt templates: [SUPPORT TICKETS/FEEDBACK SOURCE], [DEPARTMENT], … */
export const PLACEHOLDER = /\[([^\]\n]{1,80})\]/g;
export const placeholders = (t: string) => [...new Set([...t.matchAll(PLACEHOLDER)].map((m) => m[1]))];

/** Event the /ant page (or any page) dispatches to open the site-wide chat widget. */
export const OPEN_CHAT_EVENT = "ant:open-chat";
export interface OpenChatDetail {
  antId?: string;
  text?: string;
  quickAssistId?: string;
}
export function openAntChat(d: OpenChatDetail) {
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail: d }));
}
