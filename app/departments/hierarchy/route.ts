import { NextResponse } from "next/server";
import { AirtableError, updateRecord } from "@/lib/airtable.server";

/* PATCH /departments/hierarchy  { memberId, reportsTo: string[] }
   Department Wiki › Hierarchy › Edit: sets Team Members › Reports To (Direct Reports is its
   inverse link and updates in Airtable automatically). Logged to Dashboard Sync Queue. */
const TEAM_MEMBERS = "tbl35kTjgPye2KTQ0";
const isRec = (v: unknown): v is string => typeof v === "string" && /^rec[A-Za-z0-9]{14}$/.test(v);

export async function PATCH(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) as { memberId?: unknown; reportsTo?: unknown };
    if (!isRec(b.memberId)) return NextResponse.json({ error: "memberId must be a Team Members record id" }, { status: 400 });
    const to = Array.isArray(b.reportsTo) ? b.reportsTo : [];
    if (!to.every(isRec) || to.includes(b.memberId) || to.length > 5)
      return NextResponse.json({ error: "reportsTo must be up to 5 other Team Members record ids" }, { status: 400 });
    const rec = await updateRecord(TEAM_MEMBERS, b.memberId, { "Reports To": to }, ["Reports To"], false, {
      dashboard: "Home",
      area: "Department Wiki · Hierarchy",
    });
    return NextResponse.json({ id: rec.id, reportsTo: rec.fields["Reports To"] ?? [] });
  } catch (e) {
    const status = e instanceof AirtableError && typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save" }, { status });
  }
}
