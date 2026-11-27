import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ALL_TAG } from "@/lib/airtable.server";

/* POST /api/refresh — drops the cached Airtable reads so the next render fetches fresh data.
   Used by the status dot / sync buttons, so edits made directly in Airtable show at once. */
export async function POST() {
  revalidateTag(ALL_TAG, { expire: 0 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
