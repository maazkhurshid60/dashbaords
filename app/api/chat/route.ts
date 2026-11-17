/* POST /api/chat — shared AI endpoint for the intranet dashboards.
   Two body shapes:
   1. ANT Connector (chat widget, /ant):  {antId?, messages[], context?: {page, recordId?}}
      The system prompt is built server-side from the ANT's ANT BRAIN + Functions + Expected Outputs
      (default: the general "VCG Intranet assistant" orchestrator) plus short page context. History is trimmed.
   2. Legacy (Product "Summarize feedback", P.I.C.S report chat, …):
      {ant?: string, message?: string, messages?: Msg[], system?: string}
   reply {ok: true, reply, model, antName?} | {ok: false, error}
   GET /api/chat → {configured} so the UI can show "AI not connected yet" before anyone types.
   503 until ANTHROPIC_API_KEY is set. */
import { buildSystemPrompt } from "@/lib/ant-data.server";
import { callClaude, ClaudeError, claudeConfigured, CLAUDE_MODEL, trimHistory } from "@/lib/ant-claude.server";
import type { ChatMsg } from "@/lib/ant-types";

export const dynamic = "force-dynamic";

const MAX_INPUT = 200_000; // characters across the whole conversation (legacy shape)

interface ChatBody {
  antId?: string;
  context?: { page?: string; recordId?: string };
  ant?: string;
  message?: string;
  messages?: ChatMsg[];
  system?: string;
  log?: boolean;
}

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

export function GET() {
  return Response.json({ configured: claudeConfigured(), model: CLAUDE_MODEL });
}

export async function POST(req: Request) {
  if (!claudeConfigured()) return fail("ANTHROPIC_API_KEY not configured", 503);

  let b: ChatBody;
  try {
    b = (await req.json()) as ChatBody;
  } catch {
    return fail("Body must be JSON", 400);
  }
  const history = Array.isArray(b.messages)
    ? b.messages.filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    : [];
  let messages: ChatMsg[] = [...history, ...(typeof b.message === "string" && b.message.trim() ? [{ role: "user" as const, content: b.message }] : [])];

  const antMode = "antId" in b || "context" in b;
  let system: string;
  let antName: string | undefined;
  if (antMode) {
    messages = trimHistory(messages);
    if (!messages.length) return fail("Send a message", 400);
    try {
      const ctx = b.context && typeof b.context === "object" ? { page: String(b.context.page || "").slice(0, 200), recordId: b.context.recordId } : undefined;
      ({ system, antName } = await buildSystemPrompt(typeof b.antId === "string" ? b.antId : undefined, ctx));
    } catch (e) {
      console.error("[chat] ANT lookup failed", e);
      ({ system, antName } = await buildSystemPrompt(undefined));
    }
  } else {
    if (!messages.length || messages[0].role !== "user") return fail("Send a message", 400);
    if (messages.reduce((n, m) => n + m.content.length, 0) > MAX_INPUT) return fail("Message is too long", 413);
    const ant = typeof b.ant === "string" ? b.ant.trim().slice(0, 40) : "";
    system = [
      "You are an assistant inside Vision Creative Group's (VCG) intranet dashboards.",
      ant ? `Answer as ${ant}, the VCG ANT the request is addressed to.` : "",
      "Be concise and practical; use short paragraphs or bullet lists. Only use the data given in the conversation and say when it isn't enough.",
      typeof b.system === "string" ? b.system.slice(0, 20_000) : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  try {
    const r = await callClaude(system, messages, antMode ? 4096 : 16000);
    return Response.json({ ok: true, reply: r.reply, model: r.model, ...(antName ? { antName } : {}), ...(r.truncated ? { truncated: true } : {}) });
  } catch (e) {
    if (e instanceof ClaudeError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
}
