"use client";

import { useState } from "react";
import { FeedItem, PageFooter, SidePanel, TopBar } from "@/components/AppShell";
import { StatTile } from "@/components/charts";
import { DataSourceBadge, type Source } from "@/components/DataSource";
import { useToast } from "@/components/ui";
import { CODE_TO_TASK_STATUS, type ChecklistPatch, type TaskPatch } from "@/lib/productivity-fields";
import type { ChecklistRecord, MasterReport, ProductivityData, ReviewKind } from "@/lib/productivity-types";
import { CapacityPanel } from "./Capacity";
import { ProductivityProvider, patchApi, useProductivity } from "./context";
import { DayMeetingsModal, ReviewDetailsModal } from "./MeetingModals";
import { MeetingsPipelineView } from "./MeetingsPipeline";
import { ChecklistModal, ReportModal, ScheduleModal, SummaryModal, codeOf } from "./Modals";
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

const errText = (r: PromiseSettledResult<unknown>[]) =>
  r
    .filter((x): x is PromiseRejectedResult => x.status === "rejected")
    .map((x) => (x.reason instanceof Error ? x.reason.message : String(x.reason)))[0];

export function ProductivityCenter({ data, source }: { data: ProductivityData; source: Source }) {
  return (
    <ProductivityProvider data={data}>
      <Center data={data} source={source} />
    </ProductivityProvider>
  );
}

function Center({ data, source }: { data: ProductivityData; source: Source }) {
  const toast = useToast();
  const { members, schedules, tasksThisMonth, week, writable, meetingById } = useProductivity();
  const [tab, setTabState] = useState<Tab>("meetings");
  // Bumped each time Reports is opened, so its month/department groups start collapsed again (as in the original).
  const [reportsVisit, setReportsVisit] = useState(0);
  const [checklists, setChecklists] = useState<ChecklistRecord[]>(() => structuredClone(data.checklists));
  const [reports, setReports] = useState<MasterReport[]>(() => structuredClone(data.reports));
  /** Agenda/recap approvals made in this view, keyed `${kind}:${meetingId}` (written to Airtable when live). */
  const [approvedReviews, setApprovedReviews] = useState<Set<string>>(() => new Set());
  // Fresh server data (Refresh badge / revalidation) replaces the editable copies.
  const [base, setBase] = useState(data);
  if (base !== data) {
    setBase(data);
    setChecklists(structuredClone(data.checklists));
    setReports(structuredClone(data.reports));
    setApprovedReviews(new Set());
  }
  const [open, setOpen] = useState<Open>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hit: Hit = (...vals) => !q || vals.some((v) => v?.toLowerCase().includes(q));

  const setTab = (t: Tab) => {
    if (t === "reports" && tab !== "reports") setReportsVisit((n) => n + 1);
    setTabState(t);
  };

  const replaceChecklist = (next: ChecklistRecord) => setChecklists((cs) => cs.map((c) => (c.id === next.id ? next : c)));
  const patchChecklist = (id: string, fn: (c: ChecklistRecord) => void) =>
    setChecklists((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c;
        const n = structuredClone(c);
        fn(n);
        return n;
      }),
    );

  /* ---------------- writes: optimistic, then Airtable; revert on failure ---------------- */

  const setReportStatus = async (id: string, status: string) => {
    const prev = reports.find((x) => x.id === id);
    if (!prev || prev.status === status) return;
    setReports((rs) => rs.map((x) => (x.id === id ? { ...x, status, approved: status === "Approved" } : x)));
    if (!writable) return toast(`"${prev.title}" status set to ${status} (this session only)`);
    try {
      await patchApi(`reports/${id}`, { status });
      toast(`"${prev.title}" status set to ${status} in Airtable`);
    } catch (e) {
      setReports((rs) => rs.map((x) => (x.id === id ? prev : x)));
      toast(`Couldn't update Airtable — status reverted (${e instanceof Error ? e.message : e})`);
    }
  };

  const saveChecklist = async (next: ChecklistRecord, submit: boolean) => {
    const prev = checklists.find((c) => c.id === next.id);
    if (!prev) return;
    const final: ChecklistRecord = submit
      ? {
          ...next,
          submitted: true,
          submittedAt: new Date().toISOString(),
          approval: writable && prev.approval !== "Approved" ? "In Review" : next.approval,
        }
      : next;
    replaceChecklist(final);
    setOpen(null);
    if (!writable) {
      toast(submit ? "Checklist submitted for summary generation & review (this session only)" : "Saved to this session — Airtable not updated");
      return;
    }

    const calls: Promise<void>[] = [];
    const localOnly: string[] = [];
    next.items.forEach((it, i) => {
      const old = prev.items[i];
      if (!old || !it.taskId || old.taskId !== it.taskId) return;
      const body: TaskPatch = {};
      const ne = it.edit;
      const oe = old.edit;
      if (ne && ne.status !== oe?.status) body.status = ne.status;
      else if (codeOf(it) !== codeOf(old) && !CODE_TO_TASK_STATUS[codeOf(it)]) localOnly.push(it.label);
      if (ne && ne.priority !== oe?.priority) body.priority = ne.priority;
      if (ne && ne.due !== oe?.due) body.due = ne.due;
      if (ne && ne.notes !== oe?.notes) body.notes = ne.notes;
      if (Object.keys(body).length) calls.push(patchApi(`tasks/${it.taskId}`, body));
    });
    const cBody: ChecklistPatch = {};
    if (next.managerNotes !== prev.managerNotes) cBody.notes = next.managerNotes;
    if (submit) cBody.submit = true;
    if (Object.keys(cBody).length) calls.push(patchApi(`checklists/${next.id}`, cBody));

    if (!calls.length) {
      toast(localOnly.length ? "\"Paused\" has no Tasks Planning status — kept in this session only" : "No changes to save");
      return;
    }
    const results = await Promise.allSettled(calls);
    const err = errText(results);
    if (err) {
      replaceChecklist(prev);
      toast(`Couldn't save to Airtable — changes reverted (${err})`);
      return;
    }
    toast(
      (submit ? "Checklist submitted for review — saved to Airtable" : "Checklist saved to Airtable") +
        (localOnly.length ? " · \"Paused\" kept in this session only" : ""),
    );
  };

  const decideChecklist = async (id: string, status: "Approved" | "Rejected", feedback: string) => {
    const prev = checklists.find((c) => c.id === id);
    if (!prev) return;
    patchChecklist(id, (c) => {
      c.approval = status;
      if (writable) c.feedback = feedback;
      else c.managerNotes = feedback;
    });
    setOpen(null);
    if (!writable) return toast(`Checklist ${status.toLowerCase()} (this session only)`);
    try {
      await patchApi(`checklists/${id}`, { decision: status, feedback } satisfies ChecklistPatch);
      toast(`Checklist ${status.toLowerCase()} — saved to Airtable`);
    } catch (e) {
      replaceChecklist(prev);
      toast(`Couldn't update Airtable — decision reverted (${e instanceof Error ? e.message : e})`);
    }
  };

  const runSummary = async (id: string, text: string) => {
    const prev = checklists.find((c) => c.id === id);
    if (!prev) return;
    patchChecklist(id, (c) => void (c.summary = text));
    if (!writable) return toast("Summary report generated");
    try {
      await patchApi(`checklists/${id}`, { generateSummary: true } satisfies ChecklistPatch);
      toast("Summary generation requested in Airtable — refresh shortly for the AI summary");
    } catch (e) {
      replaceChecklist(prev);
      toast(`Couldn't reach Airtable (${e instanceof Error ? e.message : e})`);
    }
  };

  const approveReview = async (id: string, kind: ReviewKind) => {
    const key = `${kind}:${id}`;
    const label = kind === "agenda" ? "Agenda" : "Recap";
    setApprovedReviews((s) => new Set(s).add(key));
    setOpen(null);
    if (!writable) return toast(`${label} approved for this session`);
    try {
      await patchApi(`meetings/${id}`, { approve: kind });
      toast(`${label} approved — saved to Airtable`);
    } catch (e) {
      setApprovedReviews((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
      toast(`Couldn't update Airtable — approval reverted (${e instanceof Error ? e.message : e})`);
    }
  };

  const s = tasksThisMonth.byStatus;
  const n = (k: string) => s[k] ?? 0;
  const close = () => setOpen(null);
  const openSchedule = open?.kind === "schedule" ? schedules.find((x) => x.id === open.id) : undefined;
  const openChecklist = open?.kind === "checklist" || open?.kind === "summary" ? checklists.find((x) => x.id === open.id) : undefined;
  const openReport = open?.kind === "report" ? reports.find((x) => x.id === open.id) : undefined;
  const openReview = open?.kind === "review" ? meetingById(open.id) : undefined;

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="min-w-0 flex-1">
        <TopBar title="Productivity Center" search="Search tasks, members, checklists…" query={query} onQuery={setQuery} />

        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DataSourceBadge source={source} />
              <span className="text-[11.5px] text-muted">
                {week.label} · {week.range}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-6">
              <StatTile label="Total tasks" value={tasksThisMonth.total} delta={week.monthShort} tone="plain" />
              <StatTile label="Not started" value={n("Not Started")} tone="plain" />
              <StatTile label="In progress" value={n("In Progress")} tone="brand" delta="active" />
              <StatTile label="At risk" value={n("At Risk")} tone="bad" delta="flagged" />
              <StatTile label="Planning" value={n("Planning")} tone="warn" delta="queued" />
              <StatTile
                label="Completed"
                value={n("Completed")}
                delta={`${tasksThisMonth.total ? Math.round((n("Completed") / tasksThisMonth.total) * 100) : 0}%`}
                tone="good"
              />
            </div>
            <p className="mt-3 text-[11.5px] text-muted">
              Tasks Planning · due this month ({week.monthLong}) · {tasksThisMonth.total} tasks — filtered to this month so the board
              doesn&apos;t show every open task at once.
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

          <PageFooter
            meta={
              source.live
                ? `Live from the Airtable Intranet base · Active roster only · ${week.label} (${week.range}) · edits save to Airtable`
                : `Snapshot of the Airtable Intranet base (Airtable unavailable) · Active roster only · ${week.label} (${week.range}) · edits stay local`
            }
          />
        </div>
      </main>

      <SidePanel title="Productivity" feedTitle={`Active roster · ${week.label}`}>
        {members
          .filter((m) => hit(m.name, m.role, m.dept))
          .map((m) => {
            const sch = schedules.find((x) => x.memberId === m.id && x.weekStart === week.start);
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
      {open?.kind === "checklist" && openChecklist && <ChecklistModal c={openChecklist} onClose={close} onSave={saveChecklist} />}
      {open?.kind === "summary" && openChecklist && (
        <SummaryModal
          c={openChecklist}
          onClose={close}
          onSummary={(text) => runSummary(openChecklist.id, text)}
          onDecide={(status, feedback) => decideChecklist(openChecklist.id, status, feedback)}
        />
      )}
      {openReport && <ReportModal r={openReport} onClose={close} onStatus={(st) => setReportStatus(openReport.id, st)} />}
      {open?.kind === "day" && <DayMeetingsModal dateKey={open.key} onClose={close} />}
      {open?.kind === "review" && openReview && (
        <ReviewDetailsModal
          mt={openReview}
          kind={open.review}
          approved={approvedReviews.has(`${open.review}:${openReview.id}`)}
          onApprove={() => approveReview(openReview.id, open.review)}
          onClose={close}
        />
      )}
    </div>
  );
}
