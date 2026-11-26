import { GrantScraperError, checkGrantScrape, scraperReadiness, startGrantScrape } from "@/lib/social-apify.server";

/*
 * GET  /api/social/scraper/run               -> configuration readiness
 * GET  /api/social/scraper/run?run=<runId>   -> Apify run status and import result
 * POST /api/social/scraper/run               -> start the configured Apify Task
 *
 * APIFY_TOKEN and APIFY_TASK_ID remain server-only. The browser receives only
 * readiness, a run id, and import counts.
 */
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  const status = error instanceof GrantScraperError ? error.status : 500;
  if (status >= 500) console.error("[social scraper]", error);
  return Response.json({ ok: false, error: error instanceof Error ? error.message : "Grant scraper failed" }, { status });
}

export async function GET(req: Request) {
  try {
    const runId = new URL(req.url).searchParams.get("run");
    if (!runId) return Response.json(scraperReadiness(), { headers: { "Cache-Control": "no-store" } });
    return Response.json(await checkGrantScrape(runId), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}

export async function POST() {
  try {
    return Response.json(await startGrantScrape(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
