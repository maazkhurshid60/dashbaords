/* /api/ant/request
   GET  ?id=rec…  → one ANT Request with description / output / transcript.
   POST {kind:"new", title, description, antId?, departmentId?, quickAssistId?, priority?, dueDate?, queueType?}
        → Request Location "Hub", Status "Not Started", Request Origin "User".
   POST {kind:"chat", antId?, status:"Completed"|"Pending", messages[]}
        → Request Location "Claude"; title + description from the first user message, transcript from all turns.
   Writes go through createRecord (allow-listed, logged to Dashboard Sync Queue as "ANT Connector"). */
import { createAntRequest, isRecId, loadRequestDetail, transcriptText } from "@/lib/ant-data.server";
import { PRIORITIES, QUEUE_TYPES, type ChatMsg } from "@/lib/ant-types";
import { listRecords, str } from "@/lib/airtable.server";
import { ANT_TABLES } from "@/lib/ant-types";

export const dynamic = "force-dynamic";
const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });
const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!isRecId(id)) return fail("id must be an Airtable record id", 400);
  try {
    const r = await loadRequestDetail(id);
    return r ? Response.json({ ok: true, request: r }) : fail("Not found", 404);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 502);
  }
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return fail("Body must be JSON", 400);
  try {
    if (b.kind === "new") {
      const title = s(b.title, 200);
      if (!title) return fail("Title is required", 400);
      const due = s(b.dueDate, 10);
      const fields: Record<string, unknown> = {
        "Request Title": title,
        "Request Description": s(b.description, 20_000),
        "Request Location": "Hub",
        Status: "Not Started",
        "Request Origin": "User",
        ...(isRecId(b.antId) ? { "Related ANT": [b.antId] } : {}),
        ...(isRecId(b.departmentId) ? { "Related Department": [b.departmentId] } : {}),
        ...(isRecId(b.quickAssistId) ? { "Related Quick Assist": [b.quickAssistId] } : {}),
        ...((PRIORITIES as readonly string[]).includes(String(b.priority)) ? { Priority: b.priority } : {}),
        ...((QUEUE_TYPES as readonly string[]).includes(String(b.queueType)) ? { "Queue Type": b.queueType } : {}),
        ...(/^\d{4}-\d{2}-\d{2}$/.test(due) ? { "Due Date": due } : {}),
      };
      return Response.json({ ok: true, id: await createAntRequest(fields, "New ANT request") });
    }
    if (b.kind === "chat") {
      const msgs = (Array.isArray(b.messages) ? b.messages : [])
        .filter((m: ChatMsg) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .slice(-60) as ChatMsg[];
      const first = msgs.find((m) => m.role === "user");
      if (!first) return fail("Nothing to save yet", 400);
      const status = b.status === "Pending" ? "Pending" : "Completed";
      let antName = "VCG Intranet assistant";
      if (isRecId(b.antId)) {
        const r = await listRecords(ANT_TABLES.library, { filterByFormula: `RECORD_ID()='${b.antId}'`, fields: ["ANT Name"] });
        antName = str(r[0]?.fields["ANT Name"]).trim() || antName;
      }
      const oneLine = first.content.replace(/\s+/g, " ").trim();
      const fields: Record<string, unknown> = {
        "Request Title": `${antName} chat — ${oneLine.slice(0, 90)}${oneLine.length > 90 ? "…" : ""}`,
        "Request Description": first.content.slice(0, 20_000),
        "Request Transcript": transcriptText(msgs, antName).slice(0, 95_000),
        "Request Location": "Claude",
        Status: status,
        "Request Origin": "User",
        ...(isRecId(b.antId) ? { "Related ANT": [b.antId] } : {}),
        ...(isRecId(b.quickAssistId) ? { "Related Quick Assist": [b.quickAssistId] } : {}),
      };
      return Response.json({ ok: true, id: await createAntRequest(fields, "Chat — save to ANT Requests") });
    }
    return fail("kind must be 'new' or 'chat'", 400);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 502);
  }
}
