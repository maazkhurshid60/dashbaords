import { createRecord } from "@/lib/airtable.server";
import { ALLOW, bad, body, checklistFields, handle, isRecId } from "@/lib/pics-airtable";
import { PICS_TABLES, mapChecklist } from "@/lib/pics-live";
import type { ChecklistItem } from "@/lib/types";

/* POST /api/pics/checklist { picsId, item } — new row in P.I.C.S Checklist (tbl8Nm9AL749eBLZC) linked to the P.I.C.S. */
export async function POST(req: Request) {
  return handle(async () => {
    const b = await body<{ picsId?: string; item?: Partial<ChecklistItem> }>(req);
    if (!isRecId(b.picsId)) throw bad("picsId must be an Airtable P.I.C.S record id");
    const fields = { ...(await checklistFields(b.item ?? {})), "Related P.I.C.S": [b.picsId] };
    const rec = await createRecord(PICS_TABLES.checklist, fields, ALLOW.checklistCreate, false);
    return { item: mapChecklist(rec), atStatus: String(rec.fields["Status"] ?? "") };
  });
}
