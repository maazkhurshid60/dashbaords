/* GET /api/ant/ants — active ANTs for the chat widget's picker. */
import { loadAntOptions } from "@/lib/ant-data.server";

export async function GET() {
  try {
    return Response.json({ ok: true, ants: await loadAntOptions() });
  } catch (e) {
    return Response.json({ ok: false, ants: [], error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
