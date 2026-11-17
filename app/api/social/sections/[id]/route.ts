import { handle, readJson, saveSection } from "@/lib/social-write.server";

/* PATCH /api/social/sections/<recordId>  { draft?, status?, answersUsed?, area }
   Saves an Application Builder section (Grant Application Sections). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const b = await readJson<{ draft?: unknown; status?: unknown; answersUsed?: unknown; area?: unknown }>(req);
    return saveSection(id, b, b.area);
  });
}
