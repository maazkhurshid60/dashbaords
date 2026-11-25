import { NextResponse } from "next/server";
import { AirtableError } from "@/lib/airtable.server";
import { body } from "@/lib/pics-airtable";
import { emailConfigured } from "@/lib/email.server";
import { emailInvite, newToken, parseShare, resolveInvitees, saveShare, shareLink, sharesStorage, type ShareRecord } from "@/lib/pics-shares";

/* POST /api/pics/share — OPS-22. Body = the Share dialog payload (SharePayload).
   Validates it, stores the share (Airtable "P.I.C.S Shares" table, or memory in local dev), gives every invited
   person their own private link, and emails it through Brevo when Brevo is connected. A missing Brevo key never
   fails the share: the links are returned so the sender can pass them on by hand. */
export async function POST(req: Request) {
  try {
    const origin = new URL(req.url).origin;
    const input = parseShare(await body<unknown>(req));
    const invitees = await resolveInvitees(input.invites);

    const share: ShareRecord = {
      token: newToken(),
      kind: input.kind,
      targetId: input.id,
      targetName: input.name,
      invitees,
      access: input.access,
      expiresAt: input.expiresAt,
      include: input.include,
      message: input.message,
    };
    await saveShare(share);

    const results = await Promise.all(invitees.map(async (i) => ({ who: i.who, ...(await emailInvite(share, i, origin, "A VCG teammate")) })));
    const sent = results.filter((r) => r.sent).length;
    const links = invitees.map((i) => ({ who: i.who, role: i.role, external: i.external, link: shareLink(origin, share.token, i.key) }));
    const anyoneLink = share.access === "link" ? shareLink(origin, share.token) : null;

    const parts = [invitees.length ? `Shared with ${invitees.length} ${invitees.length === 1 ? "person" : "people"}` : "Link access saved"];
    if (invitees.length) {
      if (!emailConfigured()) parts.push("personal links are below (email isn't connected yet)");
      else if (sent === invitees.length) parts.push("invites emailed");
      else parts.push(`${sent} of ${invitees.length} invites emailed (${results.find((r) => !r.sent)?.reason ?? "some failed"})`);
    }
    if (sharesStorage() === "memory") parts.push("saved temporarily (dev only)");

    return NextResponse.json({ ok: true, message: parts.join(" · "), links, anyoneLink, results, storage: sharesStorage() });
  } catch (e) {
    const status = e instanceof AirtableError ? e.status : 500;
    if (status >= 500 && status !== 503) console.error("[api/pics/share]", e);
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Share failed" }, { status });
  }
}
