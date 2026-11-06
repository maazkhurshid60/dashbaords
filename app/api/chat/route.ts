/* POST /api/chat — shared AI endpoint for the intranet dashboards (Product "Summarize feedback",
   P.I.C.S report chat, …). Generic contract:
     body  {ant?: string, message?: string, messages?: {role:'user'|'assistant', content:string}[], system?: string, log?: boolean}
     reply {ok: true, reply: string, model} | {ok: false, error}
   Calls the Anthropic Messages API with fetch (no SDK). 503 until ANTHROPIC_API_KEY is set. */
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-5-5";
const MAX_INPUT = 200_000; // characters across the whole conversation

type Msg = { role: "user" | "assistant"; content: string };
interface ChatBody {
  ant?: string;
  message?: string;
  messages?: Msg[];
  system?: string;
  log?: boolean;
}

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fail("ANTHROPIC_API_KEY not configured", 503);

  let b: ChatBody;
  try {
    b = (await req.json()) as ChatBody;
  } catch {
    return fail("Body must be JSON", 400);
  }
  const history = Array.isArray(b.messages)
    ? b.messages.filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    : [];
  const messages: Msg[] = [...history, ...(typeof b.message === "string" && b.message.trim() ? [{ role: "user" as const, content: b.message }] : [])];
  if (!messages.length || messages[0].role !== "user") return fail("Send a message", 400);
  if (messages.reduce((n, m) => n + m.content.length, 0) > MAX_INPUT) return fail("Message is too long", 413);

  const ant = typeof b.ant === "string" ? b.ant.trim().slice(0, 40) : "";
  const system = [
    "You are an assistant inside Vision Creative Group's (VCG) intranet dashboards.",
    ant ? `Answer as ${ant}, the VCG ANT the request is addressed to.` : "",
    "Be concise and practical; use short paragraphs or bullet lists. Only use the data given in the conversation and say when it isn't enough.",
    typeof b.system === "string" ? b.system.slice(0, 20_000) : "",
  ]
    .filter(Boolean)
    .join("\n");

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
      body: JSON.stringify({ model: MODEL, max_tokens: 16000, system, messages, fallbacks: "default", output_config: { effort: "medium" } }),
    });
  } catch (e) {
    return fail("Couldn't reach Claude: " + (e instanceof Error ? e.message : String(e)), 502);
  }
  const j = (await res.json().catch(() => null)) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
    model?: string;
    error?: { message?: string };
  } | null;
  if (!res.ok || !j) return fail(j?.error?.message || `Claude API error ${res.status}`, res.status >= 400 && res.status < 600 ? res.status : 502);
  if (j.stop_reason === "refusal") return fail("Claude declined this request", 422);
  const reply = (j.content || [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("\n\n")
    .trim();
  return Response.json({ ok: true, reply, model: j.model || MODEL, ...(j.stop_reason === "max_tokens" ? { truncated: true } : {}) });
}
