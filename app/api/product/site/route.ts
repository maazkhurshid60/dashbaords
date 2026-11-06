import tls from "node:tls";
import { CFG } from "@/lib/product-data";

/* GET /api/product/site → {ok, site:{url, status, http, ms, checkedAt, ssl, deployments, uptime, vitals, errorRate}}
   A real request to acrylics.world (status + response time) and its TLS certificate. Deployments,
   uptime history, Core Web Vitals and error rate need Vercel (no token yet) → empty / null. */
export const dynamic = "force-dynamic";

const SLOW_MS = 3000;

function certInfo(host: string): Promise<string | null> {
  return new Promise((resolve) => {
    const sock = tls.connect({ host, port: 443, servername: host, timeout: 5000 }, () => {
      const c = sock.getPeerCertificate();
      const until = c?.valid_to ? new Date(c.valid_to) : null;
      const days = until ? Math.floor((until.getTime() - Date.now()) / 864e5) : null;
      const out = !sock.authorized
        ? `Invalid: ${String(sock.authorizationError || "certificate not trusted")}`
        : until
          ? `Valid · expires ${until.toISOString().slice(0, 10)}${days != null && days < 21 ? ` (${days} days)` : ""}`
          : "Valid";
      sock.end();
      resolve(out);
    });
    sock.on("timeout", () => {
      sock.destroy();
      resolve(null);
    });
    sock.on("error", (e) => resolve(`Unavailable: ${e.message}`));
  });
}

export async function GET() {
  const url = CFG.siteUrl;
  const host = new URL(url).hostname;
  const t0 = Date.now();
  let http: number | null = null;
  let ms: number | null = null;
  let error: string | undefined;
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(10000), headers: { "User-Agent": "VCG-Intranet-SiteCheck/1.0" } });
    ms = Date.now() - t0;
    http = res.status;
    await res.body?.cancel();
  } catch (e) {
    error = e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e);
  }
  const status = http == null || http >= 500 ? "down" : http >= 400 || (ms ?? 0) > SLOW_MS ? "degraded" : "up";
  const ssl = url.startsWith("https:") ? await certInfo(host) : null;
  return Response.json(
    {
      ok: true,
      site: { url, status, http, ms, checkedAt: new Date().toISOString(), ssl, deployments: [], uptime: [], vitals: null, errorRate: null, ...(error ? { error } : {}) },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
