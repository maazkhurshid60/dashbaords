import { loadCommsPayload } from "@/lib/product-live.server";

/* GET /api/comms/data → {ok, data:{tickets, team, announcements, depts}, syncedAt, warnings, missing}
   for the Communications dashboard's loadLive(). Reads are cached for 60s server-side. */
export const dynamic = "force-dynamic";

export async function GET() {
  const j = await loadCommsPayload();
  return Response.json(j, { status: j.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
