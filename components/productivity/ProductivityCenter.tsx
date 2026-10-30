"use client";

import { useState } from "react";
import { FeedItem, PageFooter, SidePanel, TopBar } from "@/components/AppShell";
import { StatTile } from "@/components/charts";
import { useToast } from "@/components/ui";
import { ACTIVE_MEMBERS, CHECKLISTS, MASTER_REPORTS, SCHEDULES, TASKS_THIS_MONTH } from "@/lib/productivity-data";
import { meetingById } from "@/lib/productivity-logic";
import type { ChecklistRecord, MasterReport, ReviewKind } from "@/lib/productivity-types";
import { CapacityPanel } from "./Capacity";
import { DayMeetingsModal, ReviewDetailsModal } from "./MeetingModals";
import { MeetingsPipelineView } from "./MeetingsPipeline";
import { ChecklistModal, ReportModal, ScheduleModal, SummaryModal } from "./Modals";
import { ReportsView } from "./Reports";
import { SchedulesView } from "./Schedules";
import { SummariesView } from "./Summaries";
import type { Hit } from "./shared";

type Tab = "meetings" | "schedules" | "reports" | "team" | "summaries";
const TABS: [Tab, string][] = [
  ["meetings", "Meetings Pipeline"],
  ["schedules", "Schedules & Checklists"],
  ["reports", "Reports"],
  ["team", "Team"],
  ["summaries", "Checklist Summaries"],
];

type Open =
  | { kind: "schedule"; id: string }
  | { kind: "checklist"; id: string }
  | { kind: "summary"; id: string }
  | { kind: "report"; id: string }
  | { kind: "day"; key: string }
  | { kind: "review"; id: string; review: ReviewKind }
  | null;

export function ProductivityCenter() {
  const toast = useToast();
  const [tab, setTabState] = useState<Tab>("meetings");
  // Bumped each time Reports is opened, so its month/department groups start collapsed again (as in the original).
  const [reportsVisit, setReportsVisit] = useState(0);
  const [checklists, setChecklists] = useState<ChecklistRecord[]>(() => structuredClone(CHECKLISTS));
  const [reports, setReports] = useState<MasterReport[]>(() => structuredClone(MASTER_REPORTS));
  /** Session-only agenda/recap approvals, keyed `${kind}:${meetingId}`. */
  const [approvedReviews, setApprovedReviews] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<Open>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hit: Hit = (...vals) => !q || vals.some((v) => v?.toLowerCase().includes(q));

  const setTab = (t: Tab) => {
    if (t === "reports" && tab !== "reports") setReportsVisit((n) => n + 1);
    setTabState(t);
  };

  const patchChecklist = (id: string, fn: (c: ChecklistRecord) => void) =>
    setChecklists((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c;
        const n = structuredClone(c);
        fn(n);
        return n;
      }),
    );
  const setReportStatus = (id: string, status: string) => {
    const r = reports.find((x) => x.id === id);
    setReports((rs) => rs.map((x) => (x.id === id ? { ...x, status, approved: status === "Approved" } : x)));
    toast(`"${r?.title ?? "Report"}" status set to ${status}`);
  };

  const s = TASKS_THIS_MONTH.byStatus;
  const close = () => setOpen(null);
  const openSchedule = open?.kind === "schedule" ? SCHEDULES.find((x) => x.id === open.id) : undefined;
  const openChecklist = open?.kind === "checklist" || open?.kind === "summary" ? checklists.find((x) => x.id === open.id) : undefined;
  const openReport = open?.kind === "report" ? reports.find((x) => x.id === open.id) : undefined;
  const openReview = open?.kind === "review" ? meetingById(open.id) : undefined;

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="min-w-0 flex-1">
        <TopBar title="Productivity Center" search="Search tasks, members, checklists…" query={query} onQuery={setQuery} />

        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8">
          <div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-6">
              <StatTile label="Total tasks" value={TASKS_THIS_MONTH.total} delta="Sep 2026" tone="plain" />
              <StatTile label="Not started" value={s["Not Started"]} tone="plain" />
              <StatTile label="In progress" value={s["In Progress"]} tone="brand" delta="active" />
              <StatTile label="At risk" value={s["At Risk"]} tone="bad" delta="flagged" />
              <StatTile label="Planning" value={s["Planning"]} tone="warn" delta="queued" />
              <StatTile
                label="Completed"
                value={s["Completed"]}
                delta={`${Math.round((s["Completed"] / TASKS_THIS_MONTH.total) * 100)}%`}
                tone="good"
              />
            </div>
            <p className="mt-3 text-[11.5px] text-muted">
              Tasks Planning · due this month (September 2026) · {TASKS_THIS_MONTH.total} tasks — filtered to this month so the board
              doesn&apos;t show all 500+ open tasks at once.
            </p>
          </div>

          <div className="seg" role="group" aria-label="View">
            {TABS.map(([id, l]) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className="whitespace-nowrap">
                {l}
              </button>
            ))}
          </div>

          {/* Views stay mounted (like the original's display:none panels) so each keeps its own filters and paging. */}
          <div hidden={tab !== "meetings"}>
            <MeetingsPipelineView
              hit={hit}
              approved={approvedReviews}
              onDay={(key) => setOpen({ kind: "day", key })}
              onReview={(id, review) => setOpen({ kind: "review", id, review })}
            />
          </div>
          <div hidden={tab !== "schedules"}>
            <SchedulesView
              hit={hit}
              checklists={checklists}
              onSchedule={(id) => setOpen({ kind: "schedule", id })}
              onChecklist={(id) => setOpen({ kind: "checklist", id })}
            />
          </div>
          <div hidden={tab !== "reports"}>
            <ReportsView
              visit={reportsVisit}
              reports={reports}
              hit={hit}
              onOpen={(id) => setOpen({ kind: "report", id })}
              onStatus={setReportStatus}
            />
          </div>
          <div hidden={tab !== "team"}>
            <CapacityPanel />
          </div>
          <div hidden={tab !== "summaries"}>
            <SummariesView
              checklists={checklists.filter((c) => hit(c.member, c.checklistId, ...c.items.map((i) => i.label)))}
              onReview={(id) => setOpen({ kind: "summary", id })}
            />
          </div>

          <PageFooter meta="Data reflects Airtable Intranet base · Active roster only · Week of Sep 21–25, 2026 · edits stay local until synced" />
        </div>
      </main>

      <SidePanel title="Productivity" feedTitle="Active roster · Week 39">
        {ACTIVE_MEMBERS.filter((m) => hit(m.name, m.role, m.dept)).map((m) => {
          const sch = SCHEDULES.find((x) => x.memberId === m.id);
          const cl = checklists.find((c) => c.checklistId === sch?.checklistId);
          return (
            <FeedItem
              key={m.id}
              initials={m.initials}
              name={m.name}
              text={`${m.role} · ${sch?.hours != null ? `${sch.hours}h scheduled` : "no hours logged"}${cl ? ` · checklist ${cl.submitted ? "submitted" : "draft"}` : ""}`}
              badge={sch?.tasks.length || undefined}
              online={!!sch?.hours}
              onClick={sch ? () => setOpen({ kind: "schedule", id: sch.id }) : undefined}
            />
          );
        })}
      </SidePanel>

      {openSchedule && (
        <ScheduleModal
          s={openSchedule}
          checklist={checklists.find((c) => c.checklistId === openSchedule.checklistId)}
          onClose={close}
          onOpenChecklist={(id) => setOpen({ kind: "checklist", id })}
        />
      )}
      {open?.kind === "checklist" && openChecklist && (
        <ChecklistModal
          c={openChecklist}
          onClose={close}
          onSave={(next, submit) => {
            setChecklists((cs) =>
              cs.map((c) => (c.id === next.id ? { ...next, ...(submit ? { submitted: true, submittedAt: new Date().toISOString() } : {}) } : c)),
            );
            close();
            toast(submit ? "Checklist submitted for summary generation & review" : "Saved to this session — Airtable not updated yet");
          }}
        />
      )}
      {open?.kind === "summary" && openChecklist && (
        <SummaryModal
          c={openChecklist}
          onClose={close}
          onSummary={(text) => {
            patchChecklist(openChecklist.id, (c) => void (c.summary = text));
            toast("Summary report generated");
          }}
          onDecide={(status, feedback) => {
            patchChecklist(openChecklist.id, (c) => {
              c.approval = status;
              c.managerNotes = feedback;
            });
            close();
            toast(`Checklist ${status.toLowerCase()}`);
          }}
        />
      )}
      {openReport && <ReportModal r={openReport} onClose={close} onStatus={(st) => setReportStatus(openReport.id, st)} />}
      {open?.kind === "day" && <DayMeetingsModal dateKey={open.key} onClose={close} />}
      {open?.kind === "review" && openReview && (
        <ReviewDetailsModal
          mt={openReview}
          kind={open.review}
          approved={approvedReviews.has(`${open.review}:${openReview.id}`)}
          onApprove={() => {
            setApprovedReviews((s) => new Set(s).add(`${open.review}:${openReview.id}`));
            close();
            toast(`${open.review === "agenda" ? "Agenda" : "Recap"} approved for this session`);
          }}
          onClose={close}
        />
      )}
    </div>
  );
}
