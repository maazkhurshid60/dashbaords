import { handle, readJson, saveAnswer } from "@/lib/social-write.server";

/* POST /api/social/answers  { title, body, sectionId?, area }
   "Save to Answer Library": creates an Answer Library row linked to the section. */
export async function POST(req: Request) {
  return handle(async () => {
    const b = await readJson<{ title?: unknown; body?: unknown; sectionId?: unknown; area?: unknown }>(req);
    return saveAnswer(b, b.area);
  });
}
