import { loadCrm } from "@/lib/crm-live";

/* GET /api/comms/data → CrmData (every Communications CRM table, 60s server cache per table). */
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadCrm();
  return Response.json(data, { status: data.live ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
