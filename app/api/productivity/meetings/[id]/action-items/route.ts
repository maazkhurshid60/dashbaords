import { createActionItem, loadActionItems, syncToRoadmap, triggerRecapSync } from "@/lib/productivity-action-items";
import type { ActionItemInput } from "@/lib/productivity-action-types";
import { BadRequest, fail, readBody } from "@/lib/productivity-write";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/productivity/meetings/:id/action-items — linked tasks + form options (uncached). */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    return Response.json(await loadActionItems((await params).id));
  } catch (e) {
    return fail(e);
  }
}

/** POST /api/productivity/meetings/:id/action-items
    { action: "create", item } | { action: "syncRecap" } | { action: "roadmap", roadmapId } */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const b = await readBody(req);
    if (b.action === "create") {
      const r = (await createActionItem(id, (b.item ?? {}) as ActionItemInput)) as { id?: string };
      return Response.json({ ok: true, id: r?.id ?? null });
    }
    if (b.action === "syncRecap") {
      await triggerRecapSync(id);
      return Response.json({ ok: true });
    }
    if (b.action === "roadmap") {
      if (b.roadmapId !== null && typeof b.roadmapId !== "string") throw new BadRequest("roadmapId must be a string or null");
      const updated = await syncToRoadmap(id, b.roadmapId);
      return Response.json({ ok: true, updated });
    }
    throw new BadRequest("Unknown action");
  } catch (e) {
    return fail(e);
  }
}
