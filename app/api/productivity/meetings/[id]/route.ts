import { MEETING_WRITABLE, PT } from "@/lib/productivity-fields";
import { BadRequest, checkedUpdate, fail, readBody } from "@/lib/productivity-write";

/** PATCH /api/productivity/meetings/:id — approve a meeting agenda/recap or request calendar sync.
    Bodies: { approve: "agenda" | "recap" } | { requestCalendarSync: true } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await readBody(req);
    const approving = b.approve === "agenda" || b.approve === "recap";
    const requestingCalendarSync = b.requestCalendarSync === true;
    if (b.requestCalendarSync !== undefined && !requestingCalendarSync) throw new BadRequest("requestCalendarSync must be true");
    if (approving === requestingCalendarSync) throw new BadRequest("Choose one meeting action");
    if (!approving && b.approve !== undefined) throw new BadRequest("approve must be agenda or recap");

    const field = requestingCalendarSync ? "Sync to Calendar" : b.approve === "agenda" ? "Agenda Approved" : "Recap Approved";
    await checkedUpdate(PT.meetings, id, { [field]: true }, MEETING_WRITABLE);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
