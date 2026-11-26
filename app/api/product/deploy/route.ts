import { checkKey } from "@/lib/product-write.server";
import { createRecord } from "@/lib/airtable.server";
import { AT } from "@/lib/product-data";
import { VercelError, runVercelAction, type VercelAction } from "@/lib/vercel.server";

async function logDeploymentAction(action: VercelAction, sourceDeploymentId: string, resultDeploymentId: string | null) {
  const fields = AT.releases.f!;
  const status = action === "rollback" ? "Rolled Back" : "Rolled Out";
  const actionLabel = action === "redeploy" ? "Redeployed" : action === "promote" ? "Promoted to production" : "Rolled back";
  const record = {
    [fields.version]: resultDeploymentId || sourceDeploymentId,
    [fields.date]: new Date().toISOString(),
    [fields.env]: "Live",
    [fields.status]: status,
    [fields.notes]: `${actionLabel} from Product Dashboard. Source deployment: ${sourceDeploymentId}.`,
  };
  await createRecord(AT.releases.id!, record, Object.keys(record), false, { dashboard: "Product", area: "Vercel deployment controls" });
}

/* POST /api/product/deploy {action:'redeploy'|'promote'|'rollback', deploymentId?}
   The token remains server-only. Redeploy uses the current production deployment when no id is supplied. */
export async function POST(req: Request) {
  try {
    checkKey(req);
    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new VercelError("Expected a JSON object body.", 400);
    const { action, deploymentId } = body as { action?: unknown; deploymentId?: unknown };
    if (action !== "redeploy" && action !== "promote" && action !== "rollback") throw new VercelError("action must be redeploy, promote, or rollback.", 400);
    const result = await runVercelAction(action as VercelAction, deploymentId);
    let logWarning: string | undefined;
    try {
      await logDeploymentAction(result.action, result.deploymentId, result.resultDeploymentId);
    } catch (logError) {
      logWarning = `Vercel accepted the request, but the release log could not be saved: ${logError instanceof Error ? logError.message : String(logError)}`;
      console.error("[product deploy] release log", logError);
    }
    return Response.json({ ok: true, ...result, ...(logWarning ? { logWarning } : {}) });
  } catch (error) {
    const status = error instanceof VercelError ? error.status : 500;
    if (status >= 500) console.error("[product deploy]", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status });
  }
}
