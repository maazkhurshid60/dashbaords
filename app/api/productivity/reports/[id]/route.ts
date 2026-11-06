import { PT, REPORT_WRITABLE } from "@/lib/productivity-fields";
import { BadRequest, checkedUpdate, fail, readBody } from "@/lib/productivity-write";

/** PATCH /api/productivity/reports/:id — Master Reports Status; the Approved checkbox (and Approved At) follow it.
    Body: { status } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await readBody(req);
    if (typeof b.status !== "string" || !b.status) throw new BadRequest("status is required");
    const approved = b.status === "Approved";
    await checkedUpdate(
      PT.reports,
      id,
      { Status: b.status, Approved: approved, "Approved At": approved ? new Date().toISOString() : null },
      REPORT_WRITABLE,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
