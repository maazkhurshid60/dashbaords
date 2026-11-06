import "server-only";
import { cache } from "react";
import { type AtRecord, links, listRecords, num, str, withFallback } from "@/lib/airtable.server";
import { PT, TASK_STATUS_TO_CODE } from "./productivity-fields";
import { addDays, dateKeyET, fmtKey, isoWeekOfKey, mondayOf, mondayOfIsoWeek } from "./productivity-logic";
import { productivitySnapshot, weekInfoFor } from "./productivity-snapshot";
import type {
  ChecklistRecord,
  DirectoryEntry,
  MasterReport,
  Meeting,
  Member,
  PlanningTask,
  ProductivityData,
  ReportContent,
  Schedule,
  ScheduleTask,
  TaskChecklistItem,
} from "./productivity-types";

/* Live Productivity Center data from the VCG Intranet base. Maps Airtable records into the
   same shapes as the bundled snapshot (lib/productivity-snapshot.ts), which stays the
   fallback when Airtable can't be read.

   Table → shape
     Team Members ("Currently Working")  → members, directory (every member, for link names)
     Weekly Schedules (-12…+8 weeks)      → schedules (Assigned Tasks resolved via Tasks Planning)
     Task Checklists (-12…+8 weeks + any awaiting review) → checklists (items = the checklist's Assigned Tasks,
                                             else the schedule's Assigned Tasks); Goals → names
     Tasks Planning                       → tasks, "due this month" tiles, checklist items
     Meetings Master                      → meetings (links resolved to names)
     Master Reports                       → reports, report text, comprehensive report
     Team Availability                    → availability grid
   "Current week" = the Mon–Fri week containing today (Eastern); Sat/Sun belong to the week
   just ended, matching the Team Capacity navigator. */

type R = AtRecord;
const f = (r: R, k: string) => r.fields[k];
const s = (r: R, k: string) => str(f(r, k)).trim();
const sOrNull = (r: R, k: string) => s(r, k) || null;

/** aiText fields come back as { state, value }; a stale "error" state can still carry the last good value. */
const aiText = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in v) return typeof (v as { value: unknown }).value === "string" ? (v as { value: string }).value : "";
  return "";
};

const initialsOf = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  if (w.length === 1) return w[0].slice(0, 3).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
};

/* ---------------- report text → HTML ----------------
   Report Text / Weekly Pulse are plain text or light markdown written by ANT. Everything is
   HTML-escaped first; only headings, bullets and **bold** are turned into markup. */
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export function reportTextToHtml(text: string): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(`<ul>${list.map((li) => `<li>${li}</li>`).join("")}</ul>`);
    list = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) {
      flush();
      continue;
    }
    const md = line.match(/^#{1,6}\s+(.*)$/);
    if (md) {
      flush();
      out.push(`<div class="rd-heading">${inline(md[1].replace(/\*\*/g, ""))}</div>`);
      continue;
    }
    // Short ALL-CAPS lines ("1. HEADLINE", "THE DAY") are section headings in ANT's plain-text reports.
    if (line.length <= 60 && /^(\d+\.\s+)?[A-Z][A-Z0-9 &'’—–\-/:,()]+$/.test(line) && /[A-Z]{3}/.test(line)) {
      flush();
      out.push(`<div class="rd-heading">${esc(line)}</div>`);
      continue;
    }
    const li = line.match(/^(?:[-*•]|\d+\.)\s+(.*)$/);
    if (li) {
      list.push(inline(li[1]));
      continue;
    }
    flush();
    out.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return out.join("\n");
}

/* ---------------- availability ---------------- */

const DAY_INDEX: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 };

/** "07:00 AM" → minutes after midnight. */
function minutesOf(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)?$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (!m[3]) h = Number(m[1]);
  else if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

/* ---------------- loader ---------------- */

async function loadLive(): Promise<ProductivityData> {
  const now = new Date().toISOString();
  const week = weekInfoFor(now);
  const todayKey = dateKeyET(now);

  const [memberRecs, scheduleRecs, checklistRecs, taskRecs, meetingRecs, reportRecs, deptRecs, typeRecs, availRecs, goalRecs] = await Promise.all([
    listRecords(PT.members, {
      fields: ["Name", "Team Member ID", "Email", "Currently Working", "Role", "Department", "Weekly Scheduled Hours"],
    }),
    listRecords(PT.schedules, {
      fields: ["Week ID", "Week Starting Date", "Scheduled Hours", "Team Member", "Assigned Tasks", "Associated Checklist", "Week", "Month"],
    }),
    listRecords(PT.checklists, {
      fields: [
        "Checklist ID",
        "Week ID",
        "Week",
        "Checklist Status",
        "Team Member",
        "Assigned Tasks",
        "Checklist Approver",
        "Team Member Notes & Observations",
        "Submit",
        "Date Submitted",
        "Checklist Summary",
        "Checklist Feedback",
        "Approved",
        "Related Goals",
      ],
    }),
    listRecords(PT.tasks, {
      fields: [
        "Task",
        "Assigned To",
        "Task Type",
        "Status",
        "Priority",
        "Start Date",
        "Due Date",
        "Completed",
        "Task Details",
        "Notes From Assignee",
        "Week Number #",
        "Related Meetings",
      ],
    }),
    listRecords(PT.meetings, {
      fields: [
        "Meeting Title",
        "Meeting Status",
        "Meeting Date & Time",
        "Meeting Type",
        "Facilitator",
        "Departments",
        "Attendees (Internal)",
        "Internal Attendees",
        "Meeting Location / Link",
        "Meeting Objectives",
        "Meeting Duration (Minutes)",
        "Agenda URL",
        "Agenda Assignee",
        "Sync Agenda",
        "Agenda Approver",
        "Agenda Approved",
        "Recap Assignee",
        "Recap URL",
        "Sync Recap",
        "Recap Approver",
        "Recap Approved",
        "Action Items",
      ],
    }),
    listRecords(PT.reports, {
      fields: [
        "Report Title",
        "Report Type",
        "Report Text",
        "Prepared By",
        "Related Department(s)",
        "Date Created",
        "Reporting Period",
        "Week Number",
        "Status",
        "Approved",
        "Weekly Pulse",
        "ANT Observations & Suggestions",
      ],
    }),
    listRecords(PT.departments, { fields: ["Department Name"] }),
    listRecords(PT.meetingTypes, { fields: ["Meeting Type"] }),
    listRecords(PT.availability, { fields: ["Team Member", "Day of Week", "Start Time", "End Time"] }),
    listRecords(PT.goals, { fields: ["Goal"] }),
  ]);

  /* ---- lookups ---- */
  const memberName = new Map(memberRecs.map((r) => [r.id, s(r, "Name")]));
  const deptName = new Map(deptRecs.map((r) => [r.id, s(r, "Department Name")]));
  const typeName = new Map(typeRecs.map((r) => [r.id, s(r, "Meeting Type")]));
  const goalName = new Map(goalRecs.map((r) => [r.id, s(r, "Goal")]));
  const taskRec = new Map(taskRecs.map((r) => [r.id, r]));
  const checklistRec = new Map(checklistRecs.map((r) => [r.id, r]));
  const names = (ids: string[], map: Map<string, string>) => [...new Set(ids.map((id) => map.get(id)).filter((n): n is string => !!n))];
  const people = (r: R, k: string) => names(links(f(r, k)), memberName);
  const joinOrNull = (xs: string[]) => (xs.length ? xs.join(", ") : null);

  /* ---- members ---- */
  const members: Member[] = memberRecs
    .filter((r) => f(r, "Currently Working") === true)
    .map((r) => {
      const name = s(r, "Name");
      return {
        id: r.id,
        name,
        role: str((f(r, "Role") as unknown[] | undefined)?.[0]) || "",
        dept: names(links(f(r, "Department")), deptName)[0] ?? "Unassigned",
        teamId: num(f(r, "Team Member ID")) ?? 0,
        weeklyHours: num(f(r, "Weekly Scheduled Hours")),
        initials: initialsOf(name),
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1)); // stable roster order → stable member colors
  const activeIds = new Set(members.map((m) => m.id));

  const directory: Record<string, DirectoryEntry> = Object.fromEntries(
    memberRecs.map((r) => [r.id, { name: s(r, "Name") || r.id, teamMemberId: num(f(r, "Team Member ID")), email: sOrNull(r, "Email") }]),
  );

  /* ---- tasks ---- */
  const normStatus = (v: string) => (v === "In progress" ? "In Progress" : v);
  const tasks: PlanningTask[] = taskRecs
    .filter((r) => s(r, "Task"))
    .map((r) => ({
      id: r.id,
      task: s(r, "Task"),
      due: s(r, "Due Date"),
      assignees: links(f(r, "Assigned To")),
      status: normStatus(s(r, "Status")) || "Not Started",
      priority: sOrNull(r, "Priority"),
      week: sOrNull(r, "Week Number #"),
      taskDetails: sOrNull(r, "Task Details"),
      relatedMeetings: links(f(r, "Related Meetings")),
    }));

  const monthKey = todayKey.slice(0, 7);
  const byStatus: Record<string, number> = { "Not Started": 0, "In Progress": 0, "At Risk": 0, Planning: 0, Completed: 0 };
  const dueThisMonth = tasks.filter((t) => t.due.startsWith(monthKey));
  dueThisMonth.forEach((t) => (byStatus[t.status] = (byStatus[t.status] ?? 0) + 1));

  const scheduleTask = (id: string): ScheduleTask | null => {
    const r = taskRec.get(id);
    if (!r) return null;
    return {
      taskId: id,
      label: s(r, "Task") || "(untitled task)",
      type: s(r, "Task Type") || "Task",
      status: normStatus(s(r, "Status")) || "Not Started",
      priority: s(r, "Priority") || "—",
      start: s(r, "Start Date"),
      due: s(r, "Due Date"),
      // Task Details / Notes are shown from Tasks Planning (by taskId), so they aren't copied here.
    };
  };

  /* ---- schedules (every week, active roster) ----
     A schedule's week is its Week Starting Date; when that is empty, the Monday of its Week
     select (ISO week, nearest year to today). */
  const weekStartOf = (date: string, weekSel: string): string | null => {
    if (date) return mondayOf(date);
    const n = Number(weekSel);
    return Number.isInteger(n) && n > 0 ? mondayOfIsoWeek(n, todayKey) : null;
  };
  const memberOrder = new Map(members.map((m, i) => [m.id, i]));
  const recMember = (r: R) => links(f(r, "Team Member")).find((id) => activeIds.has(id));
  const schedWeek = new Map(scheduleRecs.map((r) => [r.id, weekStartOf(s(r, "Week Starting Date"), s(r, "Week"))]));
  // Payload window: 12 weeks back to 8 weeks ahead (checklists awaiting review are kept regardless).
  const windowFrom = addDays(week.start, -12 * 7);
  const windowTo = addDays(week.start, 8 * 7);
  const inWindow = (k: string | null | undefined) => !!k && k >= windowFrom && k <= windowTo;
  const rosterSchedules = scheduleRecs
    .filter((r) => recMember(r) && inWindow(schedWeek.get(r.id)))
    .sort((a, b) => schedWeek.get(a.id)!.localeCompare(schedWeek.get(b.id)!) || memberOrder.get(recMember(a)!)! - memberOrder.get(recMember(b)!)!);

  const schedules: Schedule[] = rosterSchedules.map((r) => {
    const memberId = recMember(r)!;
    const name = memberName.get(memberId) ?? "";
    const cl = links(f(r, "Associated Checklist"))
      .map((id) => checklistRec.get(id))
      .find(Boolean);
    const ws = schedWeek.get(r.id)!;
    return {
      id: r.id,
      memberId,
      member: name,
      initials: initialsOf(name),
      weekId: s(r, "Week ID") || `Week ${isoWeekOfKey(ws)}`,
      weekStart: ws,
      hours: num(f(r, "Scheduled Hours")),
      checklistId: cl ? s(cl, "Checklist ID") || null : null,
      tasks: links(f(r, "Assigned Tasks"))
        .map(scheduleTask)
        .filter((t): t is ScheduleTask => !!t),
    };
  });

  /* ---- checklists (every week of the active roster, plus anything still awaiting review) ----
     Items = the checklist's own Assigned Tasks, else its schedule's Assigned Tasks (schedule
     found via Associated Checklist, else the checklist's Week ID link). */
  const scheduleOfChecklist = new Map<string, R>();
  scheduleRecs.forEach((sr) => links(f(sr, "Associated Checklist")).forEach((id) => scheduleOfChecklist.has(id) || scheduleOfChecklist.set(id, sr)));
  const scheduleRec = new Map(scheduleRecs.map((r) => [r.id, r]));
  const scheduleFor = (r: R) =>
    scheduleOfChecklist.get(r.id) ?? links(f(r, "Week ID")).map((id) => scheduleRec.get(id)).find((x): x is R => !!x);

  const approvalOf = (r: R) => {
    if (f(r, "Approved") === true) return "Approved";
    const st = s(r, "Checklist Status");
    return st === "Submitted for Review" ? "In Review" : st === "Returned" ? "Rejected" : st || "Not Started";
  };
  const awaitingReview = (r: R) => f(r, "Approved") !== true && (f(r, "Submit") === true || s(r, "Checklist Status") === "Submitted for Review");

  const checklistWeek = (r: R) => {
    const sched = scheduleFor(r);
    return weekStartOf("", s(r, "Week")) ?? (sched ? (schedWeek.get(sched.id) ?? null) : null);
  };
  const checklists: ChecklistRecord[] = checklistRecs
    .filter((r) => (recMember(r) && inWindow(checklistWeek(r))) || awaitingReview(r))
    .map((r) => {
      const sched = scheduleFor(r);
      const own = links(f(r, "Assigned Tasks"));
      const taskIds = own.length ? own : sched ? links(f(sched, "Assigned Tasks")) : [];
      const items: TaskChecklistItem[] = taskIds
        .map((tid) => taskRec.get(tid))
        .filter((t): t is R => !!t)
        .map((t) => {
          const status = normStatus(s(t, "Status")) || "Not Started";
          return {
            taskId: t.id,
            label: s(t, "Task") || "(untitled task)",
            done: status === "Completed" || f(t, "Completed") === true,
            notes: "",
            statusCode: TASK_STATUS_TO_CODE[status],
            edit: { status, priority: s(t, "Priority") || "Medium", due: s(t, "Due Date"), notes: s(t, "Notes From Assignee") },
          };
        });
      const st = s(r, "Checklist Status");
      // The checklist's own Week select wins; its schedule's week is the fallback.
      const ws = checklistWeek(r);
      return {
        id: r.id,
        checklistId: s(r, "Checklist ID") || r.id,
        member: people(r, "Team Member")[0] ?? "—",
        approval: approvalOf(r),
        submitted: f(r, "Submit") === true || st === "Submitted for Review",
        submittedAt: sOrNull(r, "Date Submitted"),
        summary: aiText(f(r, "Checklist Summary")).trim(),
        items,
        managerNotes: s(r, "Team Member Notes & Observations"),
        feedback: s(r, "Checklist Feedback"),
        approver: joinOrNull(people(r, "Checklist Approver")) ?? undefined,
        week: ws ? `Week ${isoWeekOfKey(ws)}` : "No week",
        weekStart: ws,
        goals: names(links(f(r, "Related Goals")), goalName),
      };
    })
    .sort((a, b) => (b.weekStart ?? "").localeCompare(a.weekStart ?? "") || a.checklistId.localeCompare(b.checklistId));

  /* ---- meetings ---- */
  const meetings: Meeting[] = meetingRecs
    .filter((r) => s(r, "Meeting Date & Time"))
    .map((r) => ({
      id: r.id,
      title: s(r, "Meeting Title") || "(untitled meeting)",
      dt: s(r, "Meeting Date & Time"),
      depts: names(links(f(r, "Departments")), deptName),
      attendees: [...new Set([...people(r, "Attendees (Internal)"), ...people(r, "Internal Attendees")])],
      facilitator: people(r, "Facilitator")[0] ?? null,
      agendaReady: f(r, "Sync Agenda") === true,
      agendaApproved: f(r, "Agenda Approved") === true,
      agendaApprover: joinOrNull(people(r, "Agenda Approver")),
      recapReady: f(r, "Sync Recap") === true,
      recapApproved: f(r, "Recap Approved") === true,
      recapApprover: joinOrNull(people(r, "Recap Approver")),
      objectives: s(r, "Meeting Objectives"),
      prepStatus: sOrNull(r, "Meeting Status"),
      agendaUrl: sOrNull(r, "Agenda URL"),
      recapUrl: sOrNull(r, "Recap URL"),
      meetingType: names(links(f(r, "Meeting Type")), typeName)[0] ?? null,
      locationLink: sOrNull(r, "Meeting Location / Link"),
      durationMinutes: num(f(r, "Meeting Duration (Minutes)")),
      agendaAssignee: joinOrNull(people(r, "Agenda Assignee")),
      recapAssignee: joinOrNull(people(r, "Recap Assignee")),
      actionItems: links(f(r, "Action Items"))
        .map((id) => (taskRec.get(id) ? s(taskRec.get(id)!, "Task") : ""))
        .filter(Boolean),
    }));

  /* ---- reports ---- */
  const reportContent: Record<string, ReportContent> = {};
  const pulseText = new Map<string, string>();
  const antText = new Map<string, string>();
  const reports: MasterReport[] = reportRecs
    .filter((r) => s(r, "Report Title"))
    .map((r) => {
      const title = s(r, "Report Title");
      const date = s(r, "Date Created") || r.createdTime.slice(0, 10);
      const type = s(r, "Report Type") || (/\bpulse\b/i.test(title) ? "WEEKLY PULSE" : "—");
      const weekNumber = num(f(r, "Week Number"));
      const text = s(r, "Report Text");
      const pulse = aiText(f(r, "Weekly Pulse")).trim();
      const ant = aiText(f(r, "ANT Observations & Suggestions")).trim();
      if (type === "WEEKLY PULSE" && (text || pulse)) pulseText.set(r.id, text || pulse);
      if (ant) antText.set(r.id, ant);
      const body = [text, pulse && pulse !== text ? pulse : "", ant ? `### ANT Observations & Suggestions\n${ant}` : ""].filter(Boolean).join("\n\n");
      if (body) reportContent[r.id] = { reportTitle: title, reportDate: date, html: reportTextToHtml(body) };
      const cadence = s(r, "Reporting Period");
      const period =
        weekNumber != null && date && (!cadence || cadence === "Weekly")
          ? `Week ${weekNumber} (${fmtKey(date, { month: "short", day: "numeric" })} – ${fmtKey(addDays(date, 4), { month: "short", day: "numeric" })})`
          : date
            ? `As of ${fmtKey(date, { month: "short", day: "numeric" })}`
            : "—";
      const depts = names(links(f(r, "Related Department(s)")), deptName);
      const prepared = people(r, "Prepared By");
      return {
        id: r.id,
        title,
        type,
        // Pulse / brief / CEO series without a department link are company-level → Executive (as in the v3 dashboard).
        dept: depts[0] ?? (["WEEKLY PULSE", "MORNING BRIEF", "CEO REPORT"].includes(type) ? "Executive" : "Unassigned"),
        date,
        status: s(r, "Status") || "Not Started",
        hasContent: !!body,
        contentKey: body ? r.id : undefined,
        weekNumber,
        preparedBy: prepared.length ? prepared.join(", ") : "—",
        reportingPeriod: cadence && cadence !== "Weekly" ? `${cadence} · ${period}` : period,
        approved: f(r, "Approved") === true,
      };
    });

  const latest = (ids: Map<string, string>) =>
    reports
      .filter((r) => ids.has(r.id) && r.date <= todayKey)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((r): ReportContent => ({ reportTitle: r.title, reportDate: r.date, html: reportTextToHtml(ids.get(r.id)!) }))[0] ?? null;
  const currentPulse =
    reports.find((r) => r.type === "WEEKLY PULSE" && r.weekNumber === week.number && r.date === week.start) ??
    reports.find((r) => r.type === "WEEKLY PULSE" && r.weekNumber === week.number) ??
    null;
  const currentPulseText = currentPulse ? pulseText.get(currentPulse.id) : undefined;

  /* ---- availability ---- */
  const availability: Record<string, (number | null)[]> = {};
  availRecs.forEach((r) => {
    const day = DAY_INDEX[s(r, "Day of Week")];
    const start = minutesOf(s(r, "Start Time"));
    const end = minutesOf(s(r, "End Time"));
    if (day == null || start == null || end == null || end <= start) return;
    links(f(r, "Team Member"))
      .filter((id) => activeIds.has(id))
      .forEach((id) => {
        const row = (availability[id] ??= [null, null, null, null, null]);
        row[day] = (row[day] ?? 0) + Math.round(((end - start) / 60) * 10) / 10;
      });
  });

  return {
    today: now,
    week,
    members,
    directory,
    tasksThisMonth: { total: dueThisMonth.length, byStatus },
    availability,
    availabilitySet: Object.keys(availability).length > 0,
    schedules,
    checklists,
    reports,
    reportStatusOptions: ["Not Started", "In Progress", "Ready for Review", "Approved"],
    reportContent,
    comprehensive: {
      current: currentPulse ? { title: currentPulse.title, status: currentPulse.status, contentKey: currentPulseText ? currentPulse.id : null } : null,
      pulse: currentPulse && currentPulseText ? { reportTitle: currentPulse.title, reportDate: currentPulse.date, html: reportTextToHtml(currentPulseText) } : latest(pulseText),
      ant: latest(antText),
    },
    tasks,
    meetings,
    writable: true,
  };
}

/** Productivity Center data (live, or the snapshot with the reason). One load per request; table reads cached 60s. */
export const loadProductivity = cache(() => withFallback(loadLive, productivitySnapshot));
