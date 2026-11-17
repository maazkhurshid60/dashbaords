import { airtableConfigured } from "@/lib/airtable.server";
import { runCrmAction } from "@/lib/crm-write";

/* POST /api/comms/<action> — Communications CRM writes (saveContact, saveCompany, saveDeal,
   savePipeline, saveTask, logActivity, updateMessage, sendReply, sendChatReply, saveChatSession,
   saveSource, snovAction, postUpdate, saveView, notifySlack, saveNotificationRules, saveAnswer).
   Body: the action's payload as JSON. Reply: WriteResult {ok, records?, removed?, notConnected?, error?}. */
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (!airtableConfigured()) return Response.json({ ok: false, error: "Airtable is not configured" }, { status: 503 });
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Body must be JSON" }, { status: 400 });
  }
  const r = await runCrmAction(action, payload);
  return Response.json(r.body, { status: r.status, headers: { "Cache-Control": "no-store" } });
}
