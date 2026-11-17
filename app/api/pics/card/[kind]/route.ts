import { bad, body, handle } from "@/lib/pics-airtable";
import { isCardKind, writeCard } from "@/lib/pics-card-write";

/* POST /api/pics/card/<roadmap|task|checklist>  { patch, audit:{dashboard, area} }
   Creates a P.I.C.S Roadmaps row (saveRoadmapDraft, new item), a Tasks Planning task (roadmap record › Add task)
   or a P.I.C.S Checklist item (+ Add checklist item). Logged to the Dashboard Sync Queue. */
export async function POST(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  return handle(async () => {
    const { kind } = await params;
    if (!isCardKind(kind)) throw bad("Unknown record kind");
    const b = await body<{ patch?: Record<string, unknown>; audit?: unknown }>(req);
    return writeCard(kind, null, b.patch ?? {}, b.audit);
  });
}
