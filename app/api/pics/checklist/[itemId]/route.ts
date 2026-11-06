import { updateRecord, type AtRecord } from "@/lib/airtable.server";
import { ALLOW, bad, body, checklistFields, choice, handle, isRecId, text } from "@/lib/pics-airtable";
import { PICS_TABLES, mapChecklist } from "@/lib/pics-live";
import type { ChecklistItem } from "@/lib/types";

/* PATCH /api/pics/checklist/<recordId>
   { item }                      — Edit checklist item modal (name, due, item type, asset type, status, OPANT notes)
   { activity: {label, status} } — a review round's "Related activities" row (name + Status only) */
export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  return handle(async () => {
    const { itemId } = await params;
    if (!isRecId(itemId)) throw bad("Not an Airtable record id");
    const b = await body<{ item?: Partial<ChecklistItem>; activity?: { label?: string; status?: string } }>(req);
    const T = PICS_TABLES.checklist;
    let rec: AtRecord;
    if (b.item) {
      rec = await updateRecord(T, itemId, await checklistFields(b.item), ALLOW.checklistUpdate, false);
    } else if (b.activity) {
      const name = text(b.activity.label, 500);
      if (!name) throw bad("Activity name is required");
      const fields = { "Checklist Item Name": name, Status: await choice(T, "Status", String(b.activity.status ?? "")) };
      rec = await updateRecord(T, itemId, fields, ALLOW.checklistActivity, false);
    } else throw bad("Send item or activity");
    return { item: mapChecklist(rec), atStatus: String(rec.fields["Status"] ?? "") };
  });
}
