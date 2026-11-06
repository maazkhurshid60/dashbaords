import { PT, TASK_WRITABLE } from "@/lib/productivity-fields";
import { BadRequest, checkedUpdate, fail, optString, readBody } from "@/lib/productivity-write";

/** PATCH /api/productivity/tasks/:id — checklist item status / edit panel → Tasks Planning.
    Body: { status?, priority?, due? (YYYY-MM-DD or ""), notes? } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await readBody(req);
    const fields: Record<string, unknown> = {};
    const status = optString(b.status, "status", 100);
    const priority = optString(b.priority, "priority", 100);
    const due = optString(b.due, "due", 10);
    const notes = optString(b.notes, "notes");
    if (status !== undefined) {
      fields["Status"] = status;
      fields["Completed"] = status === "Completed";
    }
    if (priority !== undefined) fields["Priority"] = priority;
    if (due !== undefined) {
      if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new BadRequest("due must be YYYY-MM-DD");
      fields["Due Date"] = due || null;
    }
    if (notes !== undefined) fields["Notes From Assignee"] = notes;
    if (!Object.keys(fields).length) throw new BadRequest("Nothing to update");
    fields["Last Dashboard Edit At"] = new Date().toISOString();
    await checkedUpdate(PT.tasks, id, fields, TASK_WRITABLE);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
