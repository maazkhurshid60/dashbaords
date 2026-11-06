import { updateRecord } from "@/lib/airtable.server";
import { ALLOW, bad, body, handle, isRecId, roadmapFields } from "@/lib/pics-airtable";
import { PICS_TABLES, mapRoadmap } from "@/lib/pics-live";
import type { RoadmapRow } from "@/lib/types";

/* PATCH /api/pics/roadmap/<recordId> { row } — roadmap week editor (title, type, phase, stage, status, due date). */
export async function PATCH(req: Request, { params }: { params: Promise<{ rowId: string }> }) {
  return handle(async () => {
    const { rowId } = await params;
    if (!isRecId(rowId)) throw bad("Not an Airtable record id");
    const b = await body<{ row?: Partial<RoadmapRow> }>(req);
    const rec = await updateRecord(PICS_TABLES.roadmaps, rowId, await roadmapFields(b.row ?? {}), ALLOW.roadmapUpdate, false);
    return { row: mapRoadmap(rec) };
  });
}
