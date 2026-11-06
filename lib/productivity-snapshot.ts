/* The bundled Productivity Center snapshot (Week 39, Sep 21–25, 2026) as one
   ProductivityData bundle. Used as the fallback when Airtable can't be read. */
import {
  ACTIVE_MEMBERS,
  AVAILABILITY_SET,
  CHECKLISTS,
  MASTER_REPORTS,
  REPORT_CONTENT,
  REPORT_STATUS_OPTIONS,
  SCHEDULES,
  TASKS_THIS_MONTH,
  TEAM_MEMBER_DIRECTORY,
} from "./productivity-data";
import { dateKeyET, fmtKey, isoWeekOfKey, mondayOf, weekRangeText } from "./productivity-logic";
import { MEETINGS_MASTER, PIPELINE_TODAY } from "./productivity-meetings";
import { TASKS_PLANNING } from "./productivity-tasks";
import type { ProductivityData, WeekInfo } from "./productivity-types";

export function weekInfoFor(todayIso: string): WeekInfo {
  const today = dateKeyET(todayIso);
  const monday = mondayOf(today);
  const number = isoWeekOfKey(monday);
  return {
    number,
    label: `Week ${number}`,
    range: weekRangeText(monday),
    start: monday,
    monthLong: fmtKey(today.slice(0, 8) + "01", { month: "long", year: "numeric" }),
    monthShort: fmtKey(today.slice(0, 8) + "01", { month: "short", year: "numeric" }),
  };
}

export function productivitySnapshot(): ProductivityData {
  const pulseRecord = MASTER_REPORTS.find((r) => r.type === "WEEKLY PULSE" && r.weekNumber === 39);
  return {
    today: PIPELINE_TODAY,
    week: weekInfoFor(PIPELINE_TODAY),
    members: ACTIVE_MEMBERS,
    directory: TEAM_MEMBER_DIRECTORY,
    tasksThisMonth: TASKS_THIS_MONTH,
    availability: {},
    availabilitySet: AVAILABILITY_SET,
    schedules: SCHEDULES,
    checklists: CHECKLISTS.map((c) => ({ ...c, week: "Week 39", weekStart: "2026-09-21", approver: "Eloisa Melchor" })),
    reports: MASTER_REPORTS,
    reportStatusOptions: REPORT_STATUS_OPTIONS,
    reportContent: REPORT_CONTENT,
    comprehensive: {
      current: pulseRecord ? { title: pulseRecord.title, status: pulseRecord.status, contentKey: pulseRecord.contentKey ?? null } : null,
      pulse: REPORT_CONTENT.pulse32 ?? null,
      ant: REPORT_CONTENT.ant28 ?? null,
    },
    tasks: TASKS_PLANNING,
    meetings: MEETINGS_MASTER,
    writable: false,
  };
}
