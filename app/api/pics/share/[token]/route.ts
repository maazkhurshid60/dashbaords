import { NextResponse } from "next/server";
import { accessFor, getShare } from "@/lib/pics-shares";

/* GET /api/pics/share/<token>[?k=<personal key>] — resolves a saved share link: what it points at, what's
   included, when it expires and what the caller may do. 404 = unknown token, 410 = expired, 403 = this link
   doesn't give the caller access. People's emails and keys are never returned. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const key = new URL(req.url).searchParams.get("k");
  try {
    const r = await getShare(token);
    if (!r.ok) return NextResponse.json({ ok: false, reason: r.reason }, { status: r.reason === "expired" ? 410 : 404 });
    const s = r.share;
    const access = accessFor(s, key);
    if (!access) return NextResponse.json({ ok: false, reason: "no-access" }, { status: 403 });
    return NextResponse.json({
      ok: true,
      kind: s.kind,
      targetId: s.targetId,
      targetName: s.targetName,
      access: s.access,
      include: s.include,
      expiresAt: s.expiresAt,
      you: { role: access.role, who: access.who },
    });
  } catch (e) {
    console.error("[api/pics/share/token]", e);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
