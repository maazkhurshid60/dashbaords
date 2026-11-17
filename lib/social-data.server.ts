import "server-only";
import { arr, bool, getSchema, links, listRecords, num, str, withFallback, type AtRecord } from "./airtable.server";
import { EMPTY_SOCIAL, SI_TABLES as T, type SocialData } from "./social-types";

/* Server loader for /social-impact. Every table is read through the shared 60s cache in
   airtable.server.ts. No example data: when Airtable can't be reached the page shows empty states.
   Rows without their primary field (blank placeholder rows in the base) are skipped. */

const named = (recs: AtRecord[], primary: string) => recs.filter((r) => str(r.fields[primary]).trim());
const iso = (v: unknown) => str(v).slice(0, 10);

async function load(): Promise<SocialData> {
  const [schema, scr, fun, apps, secs, ans, prog, sess, donors, gifts, outs, reps, sdg, pics, opps] = await Promise.all([
    getSchema(),
    listRecords(T.scraper),
    listRecords(T.funders),
    listRecords(T.applications),
    listRecords(T.sections),
    listRecords(T.answers),
    listRecords(T.programmes),
    listRecords(T.sessions),
    listRecords(T.donors),
    listRecords(T.gifts),
    listRecords(T.outcomes),
    listRecords(T.reports),
    listRecords(T.sdg),
    listRecords(T.pics, {
      filterByFormula: "SEARCH('nail networks', LOWER({P.I.C.S Name}))",
      fields: ["P.I.C.S Name", "P.I.C.S Tag", "Stage", "Type", "Start Date", "End Date", "Overview", "Hierarchy", "Related P.I.C.S Checklists", "Assigned Tasks", "Opportunities"],
    }),
    listRecords(T.opportunities, {
      filterByFormula: "{Pipeline}='Partnerships'",
      fields: ["Opportunity Name", "Stage", "Value", "Probability", "Next Step", "Next Step Date", "Close Date", "Days in Stage", "Related P.I.C.S"],
    }),
  ]);

  const choicesOf = (tableId: string, field: string) =>
    schema.find((t) => t.id === tableId)?.fields.find((f) => f.name === field)?.options?.choices?.map((c) => c.name) ?? [];

  const funderName = new Map(fun.map((r) => [r.id, str(r.fields["Funder Name"])]));
  const funderNames = (v: unknown) => links(v).map((id) => funderName.get(id) || "").filter(Boolean).join(", ");

  const sections = named(secs, "Section Title").map((r) => {
    const f = r.fields;
    return {
      id: r.id,
      title: str(f["Section Title"]),
      appId: links(f["Related Application"])[0] ?? "",
      prompt: str(f["Funder Prompt"]),
      order: num(f["Order"]),
      type: str(f["Response Type"]),
      required: bool(f["Required"]),
      wordLimit: num(f["Word Limit"]),
      charLimit: num(f["Character Limit"]),
      status: str(f["Status"]),
      draft: str(f["Draft Response"]),
      answersUsed: links(f["Answers Used"]),
    };
  });

  // The Nail Networks Launch P.I.C.S (the parent initiative) and its Partnerships opportunities.
  const nnRec = pics.find((r) => str(r.fields["Hierarchy"]) === "Parent") ?? pics[0];
  const nail = nnRec
    ? {
        id: nnRec.id,
        name: str(nnRec.fields["P.I.C.S Name"]),
        tag: str(nnRec.fields["P.I.C.S Tag"]),
        stage: str(nnRec.fields["Stage"]),
        type: str(nnRec.fields["Type"]),
        start: iso(nnRec.fields["Start Date"]),
        end: iso(nnRec.fields["End Date"]),
        overview: str(nnRec.fields["Overview"]),
        checklistCount: links(nnRec.fields["Related P.I.C.S Checklists"]).length,
        taskCount: links(nnRec.fields["Assigned Tasks"]).length,
        opportunities: opps
          .filter((o) => links(o.fields["Related P.I.C.S"]).includes(nnRec.id))
          .map((o) => ({
            id: o.id,
            name: str(o.fields["Opportunity Name"]) || "(unnamed opportunity)",
            stage: str(o.fields["Stage"]),
            value: num(o.fields["Value"]),
            probability: num(o.fields["Probability"]),
            nextStep: str(o.fields["Next Step"]),
            nextStepDate: iso(o.fields["Next Step Date"]),
            closeDate: iso(o.fields["Close Date"]),
            daysInStage: num(o.fields["Days in Stage"]),
          })),
      }
    : null;

  const openReports = reps.filter((r) => !["Submitted", "Accepted", "Waived"].includes(str(r.fields["Status"])));

  return {
    scraper: named(scr, "Opportunity Title").map((r) => {
      const f = r.fields;
      return {
        id: r.id,
        title: str(f["Opportunity Title"]),
        funderRaw: str(f["Funder Name Raw"]),
        funder: funderNames(f["Matched Funder"]),
        source: str(f["Source"]),
        sourceUrl: str(f["Source URL"]),
        dateScraped: iso(f["Date Scraped"]),
        deadline: iso(f["Deadline"]),
        deadlineType: str(f["Deadline Type"]),
        min: num(f["Award Amount Min"]),
        max: num(f["Award Amount Max"]),
        eligibility: str(f["Eligibility Summary"]),
        focus: arr(f["Focus Area Tags"]),
        geo: str(f["Geographic Eligibility"]),
        requiresMatch: bool(f["Requires Match Funding"]),
        fit: num(f["Fit Score"]),
        rationale: str(f["Fit Rationale"]),
        triage: str(f["Triage Status"]),
        rejection: str(f["Rejection Reason"]),
        promotedApp: links(f["Promoted Application"]),
        notes: str(f["Notes"]),
      };
    }),
    funders: named(fun, "Funder Name").map((r) => {
      const f = r.fields;
      return {
        id: r.id,
        name: str(f["Funder Name"]),
        type: str(f["Funder Type"]),
        website: str(f["Website"]),
        focus: arr(f["Focus Areas"]),
        scope: arr(f["Geographic Scope"]),
        low: num(f["Typical Award Low"]),
        high: num(f["Typical Award High"]),
        cycle: str(f["Application Cycle"]),
        relationship: str(f["Relationship Status"]),
        owner: str(f["Relationship Owner"]),
        intelligence: str(f["Funder Intelligence"]),
        apps: links(f["Grant Applications"]).length,
      };
    }),
    applications: named(apps, "Application Name").map((r) => {
      const f = r.fields;
      return {
        id: r.id,
        name: str(f["Application Name"]),
        funder: funderNames(f["Funder"]),
        stage: str(f["Stage"]),
        zone: str(f["Funnel Zone"]),
        requested: num(f["Amount Requested"]),
        awarded: num(f["Amount Awarded"]),
        probability: num(f["Probability"]),
        weighted: num(f["Weighted Value"]),
        deadline: iso(f["Deadline"]),
        loiDue: iso(f["LOI Due"]),
        daysToDeadline: num(f["Days to Deadline"]),
        sectionsComplete: num(f["Sections Complete"]),
        sectionsTotal: num(f["Sections Total"]),
        completion: num(f["Completion Percent"]),
        owner: str(f["Application Owner"]),
        portalUrl: str(f["Portal URL"]),
        restriction: str(f["Restriction"]),
        notes: str(f["Notes"]),
        sectionIds: links(f["Grant Application Sections"]),
      };
    }),
    sections,
    answers: named(ans, "Answer Title").map((r) => ({
      id: r.id,
      title: str(r.fields["Answer Title"]),
      body: str(r.fields["Answer Body"]),
      category: str(r.fields["Answer Category"]),
      approved: bool(r.fields["Approved"]),
      timesUsed: num(r.fields["Times Used"]),
    })),
    programmes: named(prog, "Programme Name").map((r) => ({
      id: r.id,
      name: str(r.fields["Programme Name"]),
      type: str(r.fields["Programme Type"]),
      status: str(r.fields["Status"]),
      start: iso(r.fields["Start Date"]),
      end: iso(r.fields["End Date"]),
      enrolled: num(r.fields["Enrolled"]),
      capacity: num(r.fields["Capacity"]),
      socialImpact: bool(r.fields["Social Impact Programme"]),
    })),
    sdg: sdg
      .filter((r) => str(r.fields["SDG"]).trim() || num(r.fields["SDG Number"]) != null)
      .map((r) => ({
        id: r.id,
        sdg: str(r.fields["SDG"]),
        number: num(r.fields["SDG Number"]),
        application: str(r.fields["VCG Application"]),
        program: str(r.fields["Related Program"]),
        status: str(r.fields["Status"]),
        outcomes: links(r.fields["Impact Outcomes"]).length,
      })),
    nail,
    counts: {
      sessions: named(sess, "Session Name").length,
      donors: named(donors, "Donor Name").length,
      gifts: named(gifts, "Gift Name").length,
      giftsTotal: gifts.reduce((s, r) => s + (num(r.fields["Amount"]) ?? 0), 0),
      outcomes: named(outs, "Metric Name").length,
      reportsOpen: named(openReports, "Report Name").length,
      reports: named(reps, "Report Name").length,
    },
    choices: {
      appStage: choicesOf(T.applications, "Stage"),
      sectionStatus: choicesOf(T.sections, "Status"),
    },
  };
}

export const loadSocial = () => withFallback(load, () => EMPTY_SOCIAL);
