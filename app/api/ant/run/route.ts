/* POST /api/ant/run {requestId} — "Run with Claude": loads an ANT Request, prompts its Related ANT
   (brain + Quick Assist preset + description), writes Output Summary / Status "Completed" back.
   Callable by Airtable automations later: when ANT_RUN_KEY is set, header x-ant-key must match it;
   otherwise only same-origin browser calls are accepted. */
import { isRecId, runAntRequest } from "@/lib/ant-data.server";
import { callClaude, ClaudeError, claudeConfigured } from "@/lib/ant-claude.server";

export const dynamic = "force-dynamic";
const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

function allowed(req: Request) {
  const key = process.env.ANT_RUN_KEY;
  if (req.headers.get("x-ant-key")) return !!key && req.headers.get("x-ant-key") === key;
  if (key) return false;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return !!origin && !!host && new URL(origin).host === host;
}

export async function POST(req: Request) {
  if (!allowed(req)) return fail("Not allowed", 401);
  if (!claudeConfigured()) return fail("ANTHROPIC_API_KEY not configured", 503);
  const b = (await req.json().catch(() => null)) as { requestId?: unknown } | null;
  if (!isRecId(b?.requestId)) return fail("requestId must be an Airtable record id", 400);
  try {
    const output = await runAntRequest(b.requestId, (s, m) => callClaude(s, m, 8000));
    return Response.json({ ok: true, output });
  } catch (e) {
    if (e instanceof ClaudeError) return fail(e.message, e.status);
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
}
