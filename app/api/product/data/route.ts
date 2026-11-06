import { loadProductPayload } from "@/lib/product-live.server";

/* GET /api/product/data → {ok, data, syncedAt, warnings, missing} for the Product dashboard's
   loadLive(). Airtable reads are cached for 60s (lib/airtable.server.ts), so polling is cheap. */
export const dynamic = "force-dynamic";

export async function GET() {
  const j = await loadProductPayload();
  return Response.json(j, { status: j.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
