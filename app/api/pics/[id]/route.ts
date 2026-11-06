import { updateRecord } from "@/lib/airtable.server";
import { ALLOW, bad, body, choice, handle, isRecId } from "@/lib/pics-airtable";
import { PICS_TABLES } from "@/lib/pics-live";

/* PATCH /api/pics/<recordId> { stage } — moves a P.I.C.S to another Stage (fld4RzSQZB9T37lRi). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    if (!isRecId(id)) throw bad("Not an Airtable record id");
    const b = await body<{ stage?: string }>(req);
    if (typeof b.stage !== "string") throw bad("stage is required");
    const stage = await choice(PICS_TABLES.pics, "Stage", b.stage);
    const rec = await updateRecord(PICS_TABLES.pics, id, { Stage: stage }, ALLOW.picsUpdate, false);
    return { id: rec.id, stage };
  });
}
