import { deleteActionItem, unlinkActionItem, updateActionItem } from "@/lib/productivity-action-items";
import type { ActionItemInput } from "@/lib/productivity-action-types";
import { BadRequest, fail, readBody } from "@/lib/productivity-write";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/productivity/action-items/:taskId — edit a linked Tasks Planning row. Body: ActionItemInput */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await updateActionItem((await params).id, (await readBody(req)) as ActionItemInput);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

/** DELETE /api/productivity/action-items/:taskId?mode=unlink&meeting=rec… (remove from meeting) or ?mode=delete (delete task). */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const u = new URL(req.url);
    const mode = u.searchParams.get("mode");
    if (mode === "unlink") await unlinkActionItem(id, u.searchParams.get("meeting") ?? "");
    else if (mode === "delete") await deleteActionItem(id);
    else throw new BadRequest("mode must be unlink or delete");
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
