/* POST /api/product/deploy {action:'redeploy'|'promote'|'rollback', deploymentId}
   Needs a Vercel token + project id (not configured yet), so nothing is changed. */
export async function POST() {
  return Response.json({ ok: false, error: "Vercel token not configured" }, { status: 501 });
}
