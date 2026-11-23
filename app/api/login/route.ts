import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, authToken, sameToken, sitePassword } from "@/lib/site-auth";

/* POST /api/login (form: password, next) → sets the auth cookie and redirects. DELETE / GET ?logout signs out. */
const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function POST(req: Request) {
  const form = await req.formData();
  const next = safeNext(form.get("next"));
  const pw = sitePassword();
  const given = String(form.get("password") || "");
  if (!pw) return NextResponse.redirect(new URL(next, req.url), 303);
  const ok = sameToken(await authToken(given), await authToken(pw));
  if (!ok) {
    const back = new URL("/login", req.url);
    back.searchParams.set("error", "1");
    if (next !== "/") back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(AUTH_COOKIE, await authToken(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
