import "server-only";
import type { ChatMsg } from "./ant-types";

/* Anthropic Messages API via fetch (no SDK). The key never leaves the server. */
export const CLAUDE_MODEL = "claude-sonnet-5-5";
export const claudeConfigured = () => !!process.env.ANTHROPIC_API_KEY;

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function callClaude(system: string, messages: ChatMsg[], maxTokens = 16000) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ClaudeError("ANTHROPIC_API_KEY not configured", 503);
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
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages, fallbacks: "default", output_config: { effort: "medium" } }),
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

/** Bounded history for the ANT chat: last 20 turns, each ≤ 8k chars, ≤ 48k total, starting with a user turn. */
export function trimHistory(msgs: ChatMsg[]): ChatMsg[] {
  const out: ChatMsg[] = [];
  let total = 0;
  for (const m of msgs.slice(-20).reverse()) {
    const content = m.content.length > 8000 ? m.content.slice(0, 8000) + "\n…(trimmed)" : m.content;
    if (total + content.length > 48_000) break;
    total += content.length;
    out.unshift({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}
