import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, authToken, sameToken, sitePassword } from "@/lib/site-auth";

/* Password gate: only active when SITE_PASSWORD is set. Pages redirect to /login; API calls get 401 JSON. */
export async function proxy(req: NextRequest) {
  const pw = sitePassword();
  if (!pw) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();
  // Shared P.I.C.S links are opened by people without the team password; that page checks its own link token.
  if (pathname.startsWith("/shared/")) return NextResponse.next();
  const have = req.cookies.get(AUTH_COOKIE)?.value || "";
  if (have && sameToken(have, await authToken(pw))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ ok: false, message: "Sign in required" }, { status: 401 });
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
