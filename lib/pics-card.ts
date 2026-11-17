import "server-only";
import { getSchema, listRecords, links, num, str, withFallback, type AtRecord, type TableSchema } from "./airtable.server";
import { PICS_TABLES, loadLookups } from "./pics-live";
import type { CardChecklist, CardData, CardFeedback, CardOptions, CardPics, CardRoadmap, CardTask } from "./pics-card-types";
import SNAPSHOT from "@/components/pics-card/snapshot.json";

/* Live read for the P.I.C.S Master Card v2. Builds the exact AIRTABLE object shape the prototype
   (PICS-Master-Card-v2.html) consumes, from P.I.C.S · P.I.C.S Roadmaps · Tasks Planning · P.I.C.S Checklist ·
   Feedback & Review Rounds, resolving links (team members, departments, goals, briefs, assets, reports) to names.
   Field names verified against the live schema (Nov 18 2026). Falls back to the bundled snapshot. */

export const CARD_TABLES = {
  ...PICS_TABLES,
  tasks: "tblyOuPIvgifN4OOQ",
  goals: "tblcSUspCdafrVNUs",
  briefs: "tblmii8LYj0rJAJ4w",
  assets: "tblweSjDl1eDtEkEM",
} as const;

const F = {
  pics: [
    "P.I.C.S Name", "Type", "Stage", "Hierarchy", "Start Date", "End Date", "Project Leads", "Related Department(s)",
    "Related Parent/Child/Subchild", "P.I.C.S Tag", "Active", "Overview",
  ],
  roadmap: [
    "P.I.C.S Roadmap Phase Title", "Related P.I.C.S", "Related Roadmap Tasks", "Roadmap Type", "Phase", "Roadmap Stage", "Roadmap Status",
    "Related Department(s)", "Related Deliverables & Assets", "Related Feedback & Review Round(s)", "Related P.I.C.S Checklists",
    "Sync Roadmap to Related P.I.C.S & P.I.C.S Checklists", "Assignee", "Dependencies", "Start Date", "Due Date", "Notes", "Related Briefs",
    "Related Goals", "Related Status Reports", "P.I.C.S Tag", "Tag Status", "Sprint Number",
  ],
  tasks: [
    "Task", "Assigned To", "Task Type", "Status", "Priority", "Start Date", "Due Date", "Hours Worked", "Planned Hours", "Task Details",
    "Notes From Assignee", "Related Roadmap",
  ],
  checklist: [
    "Checklist Item Name", "Checklist Number", "General Notes", "Item Type", "Deliverable (Asset) Type", "Due Date", "Status", "Checklist Owner",
    "Checklist Reviewer", "Related Roadmap", "Related Feedback & Review Round", "OPANT Notes", "P.I.C.S Tag",
  ],
  feedback: [
    "Feedback & Review Title", "Round Number", "Related P.I.C.S", "Related Roadmap", "Round Type", "Status", "Due Date", "Month", "Reviewer(s)",
    "Related Checklist", "Review Atachments", "Review URLs", "Review Notes", "Review Actions", "Feedback URLs", "P.I.C.S Tag", "Tag Status",
  ],
} as const;

const day = (v: unknown) => str(v).slice(0, 10);
const t = (v: unknown) => str(v).trim();
const DEPTH: Record<string, number> = { Parent: 0, Child: 1, "Sub-child": 2 };

async function names(tableId: string, schema: TableSchema[]) {
  const tbl = schema.find((x) => x.id === tableId);
  const primary = tbl?.fields.find((f) => f.id === tbl.primaryFieldId)?.name;
  if (!primary) return new Map<string, string>();
  const rows = await listRecords(tableId, { fields: [primary] });
  return new Map(rows.map((r) => [r.id, t(r.fields[primary])]));
}

function choicesOf(schema: TableSchema[], tableId: string, field: string) {
  const f = schema.find((x) => x.id === tableId)?.fields.find((x) => x.name === field);
  const list = f?.options?.choices?.map((c) => c.name.trim()).filter((n) => n && !/^sel[A-Za-z0-9]{14}$/.test(n));
  return list?.length ? [...new Set(list)] : undefined;
}

function buildOptions(schema: TableSchema[], depts: string[]): CardOptions {
  const T = CARD_TABLES;
  const c = (tb: string, f: string) => choicesOf(schema, tb, f);
  return {
    roadmapType: c(T.roadmaps, "Roadmap Type"),
    phase: c(T.roadmaps, "Phase"),
    stage: c(T.roadmaps, "Roadmap Stage"),
    status: c(T.roadmaps, "Roadmap Status"),
    tagStatus: c(T.roadmaps, "Tag Status"),
    depts: depts.length ? depts : undefined,
    taskType: c(T.tasks, "Task Type"),
    taskStatus: c(T.tasks, "Status"),
    priority: c(T.tasks, "Priority"),
    clStatus: c(T.checklist, "Status"),
    clItemType: c(T.checklist, "Item Type"),
    clAsset: c(T.checklist, "Deliverable (Asset) Type"),
    fbType: c(T.reviews, "Round Type"),
    fbStatus: c(T.reviews, "Status"),
  };
}

async function load(): Promise<CardData> {
  const T = CARD_TABLES;
  const schema = await getSchema();
  const [L, pics, roadmap, tasks, checklist, feedback, goals, briefs, assets, reports] = await Promise.all([
    loadLookups(),
    listRecords(T.pics, { fields: [...F.pics] }),
    listRecords(T.roadmaps, { fields: [...F.roadmap] }),
    listRecords(T.tasks, { fields: [...F.tasks], filterByFormula: "{Related Roadmap}" }),
    listRecords(T.checklist, { fields: [...F.checklist] }),
    listRecords(T.reviews, { fields: [...F.feedback] }),
    names(T.goals, schema),
    names(T.briefs, schema),
    names(T.assets, schema),
    names(T.reports, schema),
  ]);
  const team = (v: unknown) => links(v).map((id) => L.team.get(id) || "").filter(Boolean);
  const dept = (v: unknown) => links(v).map((id) => L.depts.get(id) || "").filter(Boolean);
  const via = (m: Map<string, string>) => (v: unknown) => links(v).map((id) => m.get(id) || "").filter(Boolean);

  /* P.I.C.S */
  const P: CardPics[] = pics.map((r: AtRecord) => {
    const f = r.fields;
    const hierarchy = t(f["Hierarchy"]);
    const start = day(f["Start Date"]) || day(r.createdTime);
    return {
      id: r.id,
      name: t(f["P.I.C.S Name"]) || "(untitled P.I.C.S)",
      type: t(f["Type"]) || "Project",
      stage: t(f["Stage"]) || "Not Started",
      hierarchy,
      start,
      end: day(f["End Date"]) || start,
      leads: team(f["Project Leads"]),
      depts: dept(f["Related Department(s)"]),
      parent: hierarchy !== "Parent" ? links(f["Related Parent/Child/Subchild"])[0] ?? null : null,
      tag: t(f["P.I.C.S Tag"]),
      active: f["Active"] === true,
      overview: str(f["Overview"]),
    };
  });
  const picsById = new Map(P.map((p) => [p.id, p]));
  for (const p of P) if (p.parent && (!picsById.has(p.parent) || p.parent === p.id)) p.parent = null;

  /* Roadmap: a row belongs to its most specific linked P.I.C.S (tag prefix match, else deepest hierarchy). */
  const R: CardRoadmap[] = [];
  for (const r of roadmap) {
    const f = r.fields;
    const linked = links(f["Related P.I.C.S"]).map((id) => picsById.get(id)).filter((p): p is CardPics => !!p);
    if (!linked.length) continue;
    const title = t(f["P.I.C.S Roadmap Phase Title"]);
    const start = day(f["Start Date"]);
    const date = day(f["Due Date"]);
    if (!title && !start && !date) continue; // blank rows
    const tag = t(f["P.I.C.S Tag"]);
    const owner =
      linked.filter((p) => p.tag && tag.startsWith(p.tag)).sort((a, b) => b.tag.length - a.tag.length)[0] ??
      [...linked].sort((a, b) => (DEPTH[b.hierarchy] ?? 0) - (DEPTH[a.hierarchy] ?? 0))[0];
    const d = date || start || day(r.createdTime);
    R.push({
      id: r.id,
      title: title || "(untitled roadmap item)",
      rType: t(f["Roadmap Type"]) || "Task",
      phase: t(f["Phase"]) || "Phase 1",
      stage: t(f["Roadmap Stage"]) || "Not Started",
      status: t(f["Roadmap Status"]) || "Not Started",
      start: start || d,
      date: d,
      pics: owner.id,
      relPics: linked.map((p) => p.name),
      depts: dept(f["Related Department(s)"]),
      assignee: team(f["Assignee"]),
      deliverables: via(assets)(f["Related Deliverables & Assets"]),
      feedbackIds: links(f["Related Feedback & Review Round(s)"]),
      checklistIds: links(f["Related P.I.C.S Checklists"]),
      taskIds: links(f["Related Roadmap Tasks"]),
      briefs: via(briefs)(f["Related Briefs"]),
      goals: via(goals)(f["Related Goals"]),
      reports: via(reports)(f["Related Status Reports"]),
      dependencies: str(f["Dependencies"]),
      notes: str(f["Notes"]),
      syncFlag: f["Sync Roadmap to Related P.I.C.S & P.I.C.S Checklists"] === true,
      tag,
      tagStatus: t(f["Tag Status"]),
      sprintNo: num(f["Sprint Number"]),
    });
  }
  const rmIds = new Set(R.map((r) => r.id));
  const rmTitle = new Map(R.map((r) => [r.id, r.title]));

  /* Tasks Planning rows linked to a kept roadmap row */
  const TK: CardTask[] = tasks
    .filter((r) => links(r.fields["Related Roadmap"]).some((id) => rmIds.has(id)))
    .map((r) => {
      const f = r.fields;
      return {
        id: r.id,
        title: t(f["Task"]) || "(untitled task)",
        assignee: team(f["Assigned To"]),
        type: t(f["Task Type"]) || "Task",
        status: t(f["Status"]) || "Not Started",
        priority: t(f["Priority"]),
        start: day(f["Start Date"]),
        due: day(f["Due Date"]),
        worked: num(f["Hours Worked"]) ?? 0,
        planned: num(f["Planned Hours"]) ?? 0,
        details: str(f["Task Details"]),
        notesFromAssignee: str(f["Notes From Assignee"]),
        roadmapIds: links(f["Related Roadmap"]),
      };
    });
  const tkIds = new Set(TK.map((x) => x.id));
  for (const r of R) r.taskIds = r.taskIds.filter((id) => tkIds.has(id));

  /* Checklist items linked to a kept roadmap row */
  const C: CardChecklist[] = checklist
    .filter((r) => links(r.fields["Related Roadmap"]).some((id) => rmIds.has(id)))
    .map((r) => {
      const f = r.fields;
      return {
        id: r.id,
        title: t(f["Checklist Item Name"]) || "(untitled checklist item)",
        num: num(f["Checklist Number"]),
        itemType: t(f["Item Type"]) || "Task",
        assetType: t(f["Deliverable (Asset) Type"]),
        due: day(f["Due Date"]),
        status: t(f["Status"]) || "Not Started",
        owner: team(f["Checklist Owner"]),
        reviewer: team(f["Checklist Reviewer"]),
        roadmapIds: links(f["Related Roadmap"]).filter((id) => rmIds.has(id)),
        feedbackIds: links(f["Related Feedback & Review Round"]),
        notes: str(f["General Notes"]),
        opant: str(f["OPANT Notes"]),
        tag: t(f["P.I.C.S Tag"]),
      };
    });
  const clIds = new Set(C.map((x) => x.id));
  const clTitle = new Map(C.map((c) => [c.id, c.title]));
  for (const r of R) r.checklistIds = r.checklistIds.filter((id) => clIds.has(id));

  /* Feedback & Review Rounds linked to a kept roadmap row or P.I.C.S */
  const FB: CardFeedback[] = feedback
    .filter((r) => links(r.fields["Related Roadmap"]).some((id) => rmIds.has(id)) || links(r.fields["Related P.I.C.S"]).some((id) => picsById.has(id)))
    .map((r) => {
      const f = r.fields;
      const att = Array.isArray(f["Review Atachments"]) ? (f["Review Atachments"] as { filename?: string; size?: number; type?: string; url?: string }[]) : [];
      const reviewUrls = str(f["Review URLs"]);
      const pl = links(f["Related P.I.C.S"]).filter((id) => picsById.has(id));
      const rm = links(f["Related Roadmap"]).filter((id) => rmIds.has(id));
      const cl = links(f["Related Checklist"]).filter((id) => clIds.has(id));
      return {
        id: r.id,
        title: t(f["Feedback & Review Title"]) || "(untitled review round)",
        round: num(f["Round Number"]) ?? 0,
        type: t(f["Round Type"]),
        status: t(f["Status"]) || "Not Started",
        due: day(f["Due Date"]),
        reviewers: team(f["Reviewer(s)"]),
        url: (reviewUrls.match(/https?:\/\/\S+/) || [""])[0],
        notes: str(f["Review Notes"]),
        actions: str(f["Review Actions"]),
        pics: pl[pl.length - 1] || "",
        roadmapIds: rm,
        relPics: pl.map((id) => picsById.get(id)!.name),
        relRoadmap: rm.map((id) => rmTitle.get(id) || ""),
        checklistIds: cl,
        relChecklist: cl.map((id) => clTitle.get(id) || ""),
        month: t(f["Month"]),
        attachments: att.map((a) => ({ name: a.filename || "file", size: a.size, type: a.type, url: a.url })),
        reviewUrls,
        feedbackUrls: str(f["Feedback URLs"]),
        tag: t(f["P.I.C.S Tag"]),
        tagStatus: t(f["Tag Status"]),
      };
    });
  const fbIds = new Set(FB.map((x) => x.id));
  for (const r of R) r.feedbackIds = r.feedbackIds.filter((id) => fbIds.has(id));
  for (const c of C) c.feedbackIds = c.feedbackIds.filter((id) => fbIds.has(id));

  const depts = [...new Set([...L.depts.values()].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return {
    source: "Airtable · VCG Intranet (live)",
    pulled: new Date().toISOString().slice(0, 10),
    pics: P,
    roadmap: R,
    tasks: TK,
    checklist: C,
    feedback: FB,
    options: buildOptions(schema, depts),
  };
}

/** Master card data: live from Airtable, or the bundled Nov 4 snapshot if Airtable can't be read. */
export function loadPicsCard() {
  return withFallback(load, () => structuredClone(SNAPSHOT) as unknown as CardData);
}

/** PRD-6/PRD-8: the same data narrowed to P.I.C.S whose Related Department(s) contains `dept`
    (plus their ancestors, so the hierarchy tree still resolves). Roadmap/checklist/task/feedback rows follow. */
export function filterCardByDept(data: CardData, dept: string): CardData {
  const byId = new Map(data.pics.map((p) => [p.id, p]));
  const keep = new Set<string>();
  for (const p of data.pics) {
    if (!p.depts.includes(dept)) continue;
    let cur: CardPics | undefined = p;
    while (cur && !keep.has(cur.id)) {
      keep.add(cur.id);
      cur = cur.parent ? byId.get(cur.parent) : undefined;
    }
    // descendants of a matching record are part of its card scope
    const stack = [p.id];
    while (stack.length) {
      const id = stack.pop()!;
      for (const c of data.pics)
        if (c.parent === id && !keep.has(c.id)) {
          keep.add(c.id);
          stack.push(c.id);
        }
    }
  }
  const roadmap = data.roadmap.filter((r) => keep.has(r.pics));
  const rm = new Set(roadmap.map((r) => r.id));
  return {
    ...data,
    pics: data.pics.filter((p) => keep.has(p.id)),
    roadmap,
    tasks: data.tasks.filter((x) => x.roadmapIds.some((id) => rm.has(id))),
    checklist: data.checklist.filter((x) => x.roadmapIds.some((id) => rm.has(id))),
    feedback: data.feedback.filter((x) => x.roadmapIds.some((id) => rm.has(id)) || keep.has(x.pics)),
  };
}
