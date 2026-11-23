/* Shared-password gate for the whole intranet.
   Set SITE_PASSWORD (server env, never NEXT_PUBLIC_) to turn it on; leave it unset and the site stays open.
   The cookie holds a SHA-256 of the password plus a fixed salt, so the password itself is never stored client-side
   and changing SITE_PASSWORD signs everyone out. */
export const AUTH_COOKIE = "vcg_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const sitePassword = () => process.env.SITE_PASSWORD || "";

export async function authToken(password: string) {
  const data = new TextEncoder().encode("vcg-intranet:" + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare (both are hex digests of equal length when valid). */
export function sameToken(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
