import { createRecord } from "@/lib/airtable.server";
import { ALLOW, antIds, bad, body, choice, choices, deptIds, handle, isDate, teamIdsByInitials, text, url } from "@/lib/pics-airtable";
import { PICS_TABLES } from "@/lib/pics-live";
import type { PicsReport } from "@/lib/pics-types";

/* POST /api/pics/reports { report } — "New report" form → new row in Master Reports (tblRxHSe5HyDPLTZR).
   Master Reports has no P.I.C.S link field, so the form's "Related P.I.C.S" stays on the dashboard only. */
export async function POST(req: Request) {
  return handle(async () => {
    const { report: r } = await body<{ report?: Partial<PicsReport> }>(req);
    if (!r) throw bad("report is required");
    const T = PICS_TABLES.reports;
    const title = text(r.title, 300);
    if (!title) throw bad("Report title is required");
    if (!Array.isArray(r.depts) || !r.depts.length) throw bad("At least one department is required");
    const status = await choice(T, "Status", r.status || "Not Started");
    const prepared = await teamIdsByInitials(r.preparedBy && r.preparedBy !== "—" ? r.preparedBy.split(/[,\s/]+/) : []);
    const ants = await antIds(r.ant ? r.ant.split(",").map((s) => s.trim()).filter(Boolean) : []);
    const fields: Record<string, unknown> = {
      "Report Title": title,
      "Report Type": r.reportType ? await choice(T, "Report Type", r.reportType) : null,
      Status: status,
      "Reporting Period": r.period ? await choice(T, "Reporting Period", r.period) : null,
      "Week Number": await choices(T, "Week Number", (r.weekNumbers ?? []).map(String)),
      "Related Department(s)": await deptIds(r.depts.map(String)),
      "Report Audience": await choices(T, "Report Audience", (r.audience ?? []).map(String)),
      "Prepared By": prepared.ids,
      "Related ANT": ants.ids,
      "Report Request": text(r.reportRequest),
      "Delivery Link": url(r.deliveryLink) || null,
      "Date Created": isDate(r.date) ? r.date : new Date().toISOString().slice(0, 10),
      Approved: status === "Approved",
      "Created Via": await choice(T, "Created Via", "Dashboard form"),
    };
    const rec = await createRecord(T, fields, ALLOW.reportCreate, false);
    const warnings = [
      ...(prepared.unmatched.length ? [`No unique team member for "${prepared.unmatched.join(", ")}"`] : []),
      ...(ants.unmatched.length ? [`No ANT named "${ants.unmatched.join(", ")}"`] : []),
    ];
    return { id: rec.id, warnings };
  });
}
