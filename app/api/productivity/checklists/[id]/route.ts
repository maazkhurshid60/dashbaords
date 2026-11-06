import { CHECKLIST_WRITABLE, PT } from "@/lib/productivity-fields";
import { BadRequest, checkedUpdate, fail, optString, readBody } from "@/lib/productivity-write";

/** PATCH /api/productivity/checklists/:id — Task Checklists.
    Body: { notes?, submit?: true, decision?: "Approved" | "Rejected", feedback?, generateSummary?: true } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await readBody(req);
    const now = new Date().toISOString();
    const fields: Record<string, unknown> = {};
    const notes = optString(b.notes, "notes");
    const feedback = optString(b.feedback, "feedback");
    if (notes !== undefined) fields["Team Member Notes & Observations"] = notes;
    if (b.submit === true) {
      fields["Submit"] = true;
      fields["Date Submitted"] = now;
      fields["Checklist Status"] = "Submitted for Review";
    } else if (b.submit !== undefined) throw new BadRequest("submit can only be true");
    if (b.decision === "Approved") {
      fields["Approved"] = true;
      fields["Approved At"] = now;
    } else if (b.decision === "Rejected") {
      fields["Approved"] = false;
      fields["Checklist Status"] = "Returned";
    } else if (b.decision !== undefined) throw new BadRequest("decision must be Approved or Rejected");
    if (feedback !== undefined) fields["Checklist Feedback"] = feedback;
    if (b.generateSummary === true) fields["Generate Checklist Summary"] = true;
    else if (b.generateSummary !== undefined) throw new BadRequest("generateSummary can only be true");
    await checkedUpdate(PT.checklists, id, fields, CHECKLIST_WRITABLE);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
