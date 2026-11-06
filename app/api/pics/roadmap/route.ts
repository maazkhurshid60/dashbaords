import { createRecord } from "@/lib/airtable.server";
import { ALLOW, bad, body, handle, isRecId, roadmapFields } from "@/lib/pics-airtable";
import { PICS_TABLES, mapRoadmap } from "@/lib/pics-live";
import type { RoadmapRow } from "@/lib/types";

/* POST /api/pics/roadmap { picsId, row } — new row in P.I.C.S Roadmaps (tblTo1C185aBEIshk) linked to the P.I.C.S.
   The dashboard keeps one date per row, so a new row gets it as both Start Date and Due Date. */
export async function POST(req: Request) {
  return handle(async () => {
    const b = await body<{ picsId?: string; row?: Partial<RoadmapRow> }>(req);
    if (!isRecId(b.picsId)) throw bad("picsId must be an Airtable P.I.C.S record id");
    const f = await roadmapFields(b.row ?? {});
    const fields = { ...f, "Start Date": f["Due Date"], "Related P.I.C.S": [b.picsId] };
    const rec = await createRecord(PICS_TABLES.roadmaps, fields, ALLOW.roadmapCreate, false);
    return { row: mapRoadmap(rec) };
  });
}
