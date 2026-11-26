import "server-only";
import type { Deployment } from "@/lib/product-types";

const API = "https://api.vercel.com";
const MAX_DEPLOYMENTS = 30;

export type VercelAction = "redeploy" | "promote" | "rollback";

export class VercelError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type RawDeployment = {
  id?: unknown;
  uid?: unknown;
  name?: unknown;
  url?: unknown;
  state?: unknown;
  readyState?: unknown;
  readySubstate?: unknown;
  target?: unknown;
  createdAt?: unknown;
  ready?: unknown;
  readyAt?: unknown;
  aliasAssigned?: unknown;
  isCurrent?: unknown;
  meta?: unknown;
  gitSource?: unknown;
};

type VercelConfig = { token: string; projectId: string; teamId?: string };

function config(): VercelConfig {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId)
    throw new VercelError("Vercel deployment controls are not configured. Add VERCEL_TOKEN and VERCEL_PROJECT_ID on the server.", 503);
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID?.trim() || undefined };
}

export const vercelConfigured = () => !!process.env.VERCEL_TOKEN?.trim() && !!process.env.VERCEL_PROJECT_ID?.trim();

function vercelUrl(path: string, teamId?: string) {
  const url = new URL(path, API);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url;
}

function message(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const err = (body as { error?: unknown }).error;
  if (err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string") return (err as { message: string }).message;
  if (typeof err === "string") return err;
  if (typeof (body as { message?: unknown }).message === "string") return (body as { message: string }).message;
  return fallback;
}

async function call(path: string, init: RequestInit = {}) {
  const { token, teamId } = config();
  const response = await fetch(vercelUrl(path, teamId), {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new VercelError(message(body, `Vercel request failed (${response.status})`), response.status >= 400 && response.status < 600 ? response.status : 502);
  return body;
}

const string = (value: unknown) => (typeof value === "string" ? value : "");
const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const idOf = (deployment: RawDeployment) => string(deployment.id) || string(deployment.uid);
const ms = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 100_000_000_000 ? n * 1000 : n;
};
const iso = (value: unknown) => {
  const n = ms(value);
  return n ? new Date(n).toISOString() : new Date(0).toISOString();
};

function stateOf(deployment: RawDeployment) {
  return string(deployment.readyState) || string(deployment.state) || "UNKNOWN";
}

function currentRaw(deployments: RawDeployment[]) {
  return (
    deployments.find((d) => d.isCurrent === true || string(d.readySubstate).toUpperCase() === "PROMOTED") ??
    deployments.find((d) => string(d.target) === "production" && stateOf(d) === "READY")
  );
}

function present(deployments: RawDeployment[]): Deployment[] {
  const activeId = idOf(currentRaw(deployments) ?? {});
  return deployments
    .map((d): Deployment | null => {
      const id = idOf(d);
      if (!id) return null;
      const meta = object(d.meta);
      const git = object(d.gitSource);
      const created = ms(d.createdAt);
      const ready = ms(d.readyAt) ?? ms(d.ready);
      const host = string(d.url);
      return {
        id,
        state: stateOf(d),
        target: string(d.target) === "production" ? "production" : "preview",
        branch: string(meta.githubCommitRef) || string(meta.gitlabCommitRef) || string(meta.bitbucketCommitRef) || string(git.ref) || "â€”",
        commit: (string(meta.githubCommitSha) || string(meta.gitlabCommitSha) || string(meta.bitbucketCommitSha) || string(git.sha) || "â€”").slice(0, 12),
        message: string(meta.githubCommitMessage) || string(meta.gitlabCommitMessage) || string(meta.bitbucketCommitMessage) || string(d.name) || "Vercel deployment",
        createdAt: iso(d.createdAt),
        buildSec: created && ready && ready >= created ? Math.round((ready - created) / 1000) : 0,
        url: host ? (host.startsWith("http") ? host : `https://${host}`) : "",
        current: id === activeId,
      };
    })
    .filter((d): d is Deployment => !!d)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function rawDeployments() {
  const { projectId } = config();
  const query = new URLSearchParams({ projectId, limit: String(MAX_DEPLOYMENTS) });
  const response = (await call(`/v7/deployments?${query}`)) as { deployments?: unknown };
  return Array.isArray(response.deployments) ? (response.deployments as RawDeployment[]) : [];
}

function assertDeploymentId(value: unknown): string {
  if (typeof value !== "string" || !/^dpl_[A-Za-z0-9]+$/.test(value)) throw new VercelError("Choose a valid Vercel deployment from this project.", 400);
  return value;
}

function findDeployment(deployments: RawDeployment[], id: string) {
  const found = deployments.find((d) => idOf(d) === id);
  if (!found) throw new VercelError("That deployment is not in this Vercel project or is no longer available.", 404);
  return found;
}

export async function listVercelDeployments() {
  return present(await rawDeployments());
}

export async function runVercelAction(action: VercelAction, requestedDeploymentId: unknown) {
  const deployments = await rawDeployments();
  const current = currentRaw(deployments);
  const deploymentId = action === "redeploy" && !requestedDeploymentId ? idOf(current ?? {}) : assertDeploymentId(requestedDeploymentId);
  if (!deploymentId) throw new VercelError("No current production deployment was found to redeploy.", 404);
  const deployment = findDeployment(deployments, deploymentId);
  const { projectId } = config();

  let response: unknown;
  if (action === "redeploy") {
    response = await call("/v13/deployments", { method: "POST", body: JSON.stringify({ deploymentId }) });
  } else if (action === "promote") {
    if (stateOf(deployment) !== "READY" || string(deployment.target) === "production") throw new VercelError("Only a ready preview deployment can be promoted.", 400);
    response = await call(`/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(deploymentId)}`, { method: "POST" });
  } else {
    if (stateOf(deployment) !== "READY" || string(deployment.target) !== "production") throw new VercelError("Only a ready previous production deployment can be used for a rollback.", 400);
    response = await call(`/v1/projects/${encodeURIComponent(projectId)}/rollback/${encodeURIComponent(deploymentId)}?description=${encodeURIComponent("Requested from VCG Intranet Product Dashboard")}`, {
      method: "POST",
    });
  }

  const result = object(response);
  return {
    action,
    deploymentId,
    resultDeploymentId: string(result.id) || string(result.uid) || null,
    resultUrl: string(result.url) || null,
    resultState: string(result.readyState) || string(result.state) || "queued",
  };
}
