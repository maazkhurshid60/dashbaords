import { NextResponse } from "next/server";

/* POST /api/pics/share — OPS-22 persistent share links / invites.
   There is no Airtable table backing share links, invites, roles or expiry yet, so nothing is stored and no
   invite is sent. The dialog's client-side actions (copy link, copy summary, print / PDF, email link) work. */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Sharing invites aren't available yet — use Copy link, Copy summary, Print or Email link",
    },
    { status: 501 },
  );
}
