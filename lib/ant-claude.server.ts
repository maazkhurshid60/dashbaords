import "server-only";
import type { ChatMsg } from "./ant-types";

/* Anthropic Messages API via fetch (no SDK). The key never leaves the server. */
export const CLAUDE_MODEL = "claude-sonnet-5-5";
export const claudeConfigured = () => !!process.env.ANTHROPIC_API_KEY;

/* ---- Spend caps (keep Claude usage small; override in .env.local if the client wants more).
   CLAUDE_MAX_OUTPUT_TOKENS  hard ceiling on every reply, whatever the caller asks for (default 1024)
   CLAUDE_DAILY_LIMIT        Claude calls allowed per day across the whole intranet (default 100)
   The daily counter lives in server memory: it resets at midnight UTC and on each redeploy. */
const envInt = (k: string, d: number) => {
  const n = parseInt(process.env[k] || "", 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};
export const MAX_OUTPUT_TOKENS = envInt("CLAUDE_MAX_OUTPUT_TOKENS", 1024);
export const DAILY_LIMIT = envInt("CLAUDE_DAILY_LIMIT", 100);
let day = "";
let used = 0;
function takeDailySlot() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    used = 0;
  }
  if (used >= DAILY_LIMIT) throw new ClaudeError(`Daily AI limit reached (${DAILY_LIMIT} requests). It resets tomorrow.`, 429);
  used++;
}
export const claudeUsage = () => ({ day, used, limit: DAILY_LIMIT, maxOutputTokens: MAX_OUTPUT_TOKENS });

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function callClaude(system: string, messages: ChatMsg[], maxTokens = MAX_OUTPUT_TOKENS) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ClaudeError("ANTHROPIC_API_KEY not configured", 503);
  takeDailySlot();
  const max_tokens = Math.min(maxTokens, MAX_OUTPUT_TOKENS);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        /* server-side refusal fallback ("default" routing) */
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens, system, messages, fallbacks: "default", output_config: { effort: "low" } }),
    });
  } catch (e) {
    throw new ClaudeError("Couldn't reach Claude: " + (e instanceof Error ? e.message : String(e)), 502);
  }
  const j = (await res.json().catch(() => null)) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
    model?: string;
    error?: { message?: string };
  } | null;
  if (!res.ok || !j) throw new ClaudeError(j?.error?.message || `Claude API error ${res.status}`, res.status >= 400 && res.status < 600 ? res.status : 502);
  if (j.stop_reason === "refusal") throw new ClaudeError("Claude declined this request", 422);
  const reply = (j.content || [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("\n\n")
    .trim();
  return { reply, model: j.model || CLAUDE_MODEL, truncated: j.stop_reason === "max_tokens" };
}

/** Bounded history for the ANT chat: last 10 turns, each ≤ 4k chars, ≤ 16k total, starting with a user turn. */
export function trimHistory(msgs: ChatMsg[]): ChatMsg[] {
  const out: ChatMsg[] = [];
  let total = 0;
  for (const m of msgs.slice(-10).reverse()) {
    const content = m.content.length > 4000 ? m.content.slice(0, 4000) + "\n…(trimmed)" : m.content;
    if (total + content.length > 16_000) break;
    total += content.length;
    out.unshift({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}
