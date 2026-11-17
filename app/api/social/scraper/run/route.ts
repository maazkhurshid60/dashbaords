/* GET  /api/social/scraper/run → { configured }
   POST /api/social/scraper/run → 503 until an Apify token (APIFY_TOKEN) is configured.
   The scraper actors themselves are not wired yet; this keeps the button honest. */
export const dynamic = "force-dynamic";

const configured = () => !!process.env.APIFY_TOKEN;

export function GET() {
  return Response.json({ configured: configured() });
}

export function POST() {
  if (!configured()) return Response.json({ ok: false, error: "Apify is not connected yet (APIFY_TOKEN not set)" }, { status: 503 });
  return Response.json({ ok: false, error: "Scraper run is not implemented yet" }, { status: 501 });
}
