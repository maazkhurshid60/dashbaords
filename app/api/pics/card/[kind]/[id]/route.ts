import { bad, body, handle } from "@/lib/pics-airtable";
import { isCardKind, writeCard } from "@/lib/pics-card-write";

/* PATCH /api/pics/card/<roadmap|task|checklist|feedback>/<recordId>  { patch, audit:{dashboard, area} }
   Write hooks of the P.I.C.S Master Card: saveRoadmapItem/saveRoadmapDraft · saveTask · saveChecklistItem · saveFeedback.
   Only allow-listed fields are written; every write is logged to the Dashboard Sync Queue. */
export async function PATCH(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  return handle(async () => {
    const { kind, id } = await params;
    if (!isCardKind(kind)) throw bad("Unknown record kind");
    const b = await body<{ patch?: Record<string, unknown>; audit?: unknown }>(req);
    return writeCard(kind, id, b.patch ?? {}, b.audit);
  });
}
