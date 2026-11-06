import { MEETING_WRITABLE, PT } from "@/lib/productivity-fields";
import { BadRequest, checkedUpdate, fail, readBody } from "@/lib/productivity-write";

/** PATCH /api/productivity/meetings/:id — approve a meeting agenda or recap in Meetings Master.
    Body: { approve: "agenda" | "recap" } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await readBody(req);
    if (b.approve !== "agenda" && b.approve !== "recap") throw new BadRequest("approve must be agenda or recap");
    const field = b.approve === "agenda" ? "Agenda Approved" : "Recap Approved";
    await checkedUpdate(PT.meetings, id, { [field]: true }, MEETING_WRITABLE);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
