import { createRecord } from "@/lib/airtable.server";
import { ALLOW, bad, body, choice, deptIds, handle, isDate, isRecId, teamIdsByInitials, text, url } from "@/lib/pics-airtable";
import { PICS_TABLES } from "@/lib/pics-live";

/* POST /api/pics — "Launch a new P.I.C.S" form → new row in P.I.C.S (tblbiIHxN97iyltFY). */
interface NewPics {
  name: string;
  type: string;
  stage: string;
  start: string;
  end: string;
  depts: string[];
  leads: string[];
  overview?: string;
  stakeholders?: string;
  briefingLink?: string | null;
  liveSiteUrl?: string | null;
  hierarchy?: string;
  parentId?: string;
  active?: boolean;
}

export async function POST(req: Request) {
  return handle(async () => {
    const b = await body<NewPics>(req);
    const T = PICS_TABLES.pics;
    const name = text(b.name, 300);
    if (!name) throw bad("P.I.C.S name is required");
    if (!isDate(b.start) || !isDate(b.end)) throw bad("Start and end dates must be YYYY-MM-DD");
    if (!Array.isArray(b.depts) || !b.depts.length) throw bad("At least one department is required");
    const leads = await teamIdsByInitials(Array.isArray(b.leads) ? b.leads.map(String) : []);
    const fields: Record<string, unknown> = {
      "P.I.C.S Name": name,
      Type: await choice(T, "Type", String(b.type)),
      Stage: await choice(T, "Stage", String(b.stage)),
      "Start Date": b.start,
      "End Date": b.end,
      "Related Department(s)": await deptIds(b.depts.map(String)),
      "Project Leads": leads.ids,
      Overview: text(b.overview),
      Stakeholders: text(b.stakeholders),
      "Briefing Link": url(b.briefingLink) || null,
      "Live Site URL": url(b.liveSiteUrl) || null,
      Active: b.active !== false,
    };
    if (b.hierarchy && b.hierarchy !== "None") {
      fields["Hierarchy"] = await choice(T, "Hierarchy", b.hierarchy);
      if (b.parentId) {
        if (!isRecId(b.parentId)) throw bad("Parent must be an Airtable P.I.C.S record");
        fields["Related Parent/Child/Subchild"] = [b.parentId];
      }
    }
    const rec = await createRecord(T, fields, ALLOW.picsCreate, false);
    return {
      id: rec.id,
      leads: leads.leads,
      warnings: leads.unmatched.length ? [`No unique team member for initials: ${leads.unmatched.join(", ")}`] : [],
    };
  });
}
