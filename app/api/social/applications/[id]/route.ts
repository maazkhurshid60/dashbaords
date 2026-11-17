import { handle, readJson, setApplicationStage } from "@/lib/social-write.server";

/* PATCH /api/social/applications/<recordId>  { stage, area }
   Moves a Grant Application between pipeline stages (Opportunity Pipeline kanban / card drawer). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const b = await readJson<{ stage?: unknown; area?: unknown }>(req);
    return setApplicationStage(id, b.stage, b.area);
  });
}
