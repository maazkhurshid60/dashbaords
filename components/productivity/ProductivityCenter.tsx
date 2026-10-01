"use client";

import { useState } from "react";
import { FeedItem, PageFooter, SidePanel, TopBar } from "@/components/AppShell";
import { StatTile } from "@/components/charts";
import { IconArrowRight, IconCheck, IconChevron, IconDoc, IconUsers } from "@/components/icons";
import { Avatar, CardHead, Select, StatusPill, useToast } from "@/components/ui";
import {
  ACTIVE_MEMBERS,
  CHECKLISTS,
  MASTER_REPORTS,
  REPORT_CONTENT,
  SCHEDULES,
  TASKS_THIS_MONTH,
} from "@/lib/productivity-data";
import type { Checklist, MasterReport } from "@/lib/types";
import { cx, fmt, fmtDT, plural } from "@/lib/utils";
import { CapacityPanel } from "./Capacity";
import { ChecklistModal, REPORT_STATUS, ReportModal, STATUS_LABEL, ScheduleModal, SummaryModal, codeOf } from "./Modals";

type Tab = "dashboard" | "reports" | "summaries";
type Open =
  | { kind: "schedule"; id: string }
  | { kind: "checklist"; id: string }
  | { kind: "summary"; id: string }
  | { kind: "report"; id: string }
  | null;

export function ProductivityCenter() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [checklists, setChecklists] = useState<Checklist[]>(() => structuredClone(CHECKLISTS));
  const [reports, setReports] = useState<MasterReport[]>(() => structuredClone(MASTER_REPORTS));
  const [open, setOpen] = useState<Open>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hit = (...vals: (string | null | undefined)[]) => !q || vals.some((v) => v?.toLowerCase().includes(q));

  const patchChecklist = (id: string, fn: (c: Checklist) => void) =>
    setChecklists((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c;
        const n = structuredClone(c);
        fn(n);
        return n;
      }),
    );
  const setReportStatus = (id: string, status: string) => {
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status, approved: status === "Approved" } : r)));
    toast(`Status set to ${status}`);
  };

  const s = TASKS_THIS_MONTH.byStatus;
  const pctDone = Math.round((s["Completed"] / TASKS_THIS_MONTH.total) * 100);

  const openSchedule = open?.kind === "schedule" ? SCHEDULES.find((x) => x.id === open.id) : undefined;
  const openChecklist = open?.kind === "checklist" || open?.kind === "summary" ? checklists.find((x) => x.id === open.id) : undefined;
  const openReport = open?.kind === "report" ? reports.find((x) => x.id === open.id) : undefined;

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
              <StatTile label="Completed" value={s["Completed"]} delta={`${pctDone}%`} tone="good" />
            </div>
            <p className="mt-3 text-[11.5px] text-muted">
              Tasks Planning · due this month only, so the board doesn&apos;t show all 500+ open tasks at once.
            </p>
          </div>

          <div className="seg" role="group" aria-label="View">
            {(
              [
                ["dashboard", "Dashboard"],
                ["reports", "Reports"],
                ["summaries", "Checklist summaries"],
              ] as const
            ).map(([id, l]) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
                {l}
              </button>
            ))}
          </div>

          {tab === "dashboard" && (
            <DashboardView
              hit={hit}
              checklists={checklists}
              onSchedule={(id) => setOpen({ kind: "schedule", id })}
              onChecklist={(id) => setOpen({ kind: "checklist", id })}
              onAllReports={() => setTab("reports")}
            />
          )}
          {tab === "reports" && (
            <ReportsView reports={reports.filter((r) => hit(r.title, r.type, r.dept, r.preparedBy))} onOpen={(id) => setOpen({ kind: "report", id })} onStatus={setReportStatus} />
          )}
          {tab === "summaries" && (
            <SummariesView checklists={checklists.filter((c) => hit(c.member, c.checklistId, ...c.items.map((i) => i.label)))} onReview={(id) => setOpen({ kind: "summary", id })} />
          )}

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
          onClose={() => setOpen(null)}
          onOpenChecklist={(id) => setOpen({ kind: "checklist", id })}
        />
      )}
      {open?.kind === "checklist" && openChecklist && (
        <ChecklistModal
          c={openChecklist}
          onClose={() => setOpen(null)}
          onSave={(next, submit) => {
            setChecklists((cs) =>
              cs.map((c) => (c.id === next.id ? { ...next, ...(submit ? { submitted: true, submittedAt: new Date().toISOString() } : {}) } : c)),
            );
            setOpen(null);
            toast(submit ? "Checklist submitted for review" : "Checklist saved to this session");
          }}
        />
      )}
      {open?.kind === "summary" && openChecklist && (
        <SummaryModal
          c={openChecklist}
          onClose={() => setOpen(null)}
          onSummary={(text) => {
            patchChecklist(openChecklist.id, (c) => void (c.summary = text));
            toast("Summary report generated");
          }}
          onDecide={(status, feedback) => {
            patchChecklist(openChecklist.id, (c) => {
              c.approval = status;
              c.managerNotes = feedback;
            });
            setOpen(null);
            toast(`Checklist ${status.toLowerCase()}`);
          }}
        />
      )}
      {openReport && (
        <ReportModal r={openReport} onClose={() => setOpen(null)} onStatus={(st) => setReportStatus(openReport.id, st)} />
      )}
    </div>
  );
}

/* ================= Dashboard ================= */

function DashboardView({
  hit,
  checklists,
  onSchedule,
  onChecklist,
  onAllReports,
}: {
  hit: (...vals: (string | null | undefined)[]) => boolean;
  checklists: Checklist[];
  onSchedule: (id: string) => void;
  onChecklist: (id: string) => void;
  onAllReports: () => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const submitted = checklists.filter((c) => c.submitted).length;
  const approved = checklists.filter((c) => c.approval === "Approved").length;
  const awaiting = checklists.filter((c) => c.approval === "Not Started" || c.approval === "In Review").length;
  const pulse = REPORT_CONTENT.pulse32;
  const ant = REPORT_CONTENT.ant28;
  const schedules = SCHEDULES.filter((s) => hit(s.member, s.weekId, s.checklistId, ...s.tasks.map((t) => t.label)));
  const shownChecklists = checklists.filter((c) => hit(c.member, c.checklistId, ...c.items.map((i) => i.label)));

  return (
    <div className="space-y-6">
      <CapacityPanel />

      <section className="card p-6">
        <CardHead
          icon={<IconUsers width={20} height={20} />}
          eyebrow="Weekly Schedules"
          title="Team schedules — Week 39"
          right={<span className="chip">{plural(SCHEDULES.length, "member")}</span>}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {schedules.length === 0 && <NoMatch />}
          {schedules.map((s) => {
            const empty = !s.hours && !s.tasks.length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSchedule(s.id)}
                className={cx(
                  "flex flex-col rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card",
                  empty ? "border-dashed border-line-2 bg-plane/50" : "border-line bg-white",
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar initials={s.initials} size={40} />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-extrabold">{s.member}</div>
                    <div className="text-[11.5px] text-muted">{s.weekId}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="chip">{s.hours != null ? `${s.hours}h scheduled` : "No hours logged"}</span>
                  {s.checklistId && <span className="chip">Checklist {s.checklistId}</span>}
                </div>
                <div className="mt-4 flex items-center justify-between text-[12px] font-bold">
                  <span className="text-ink-2">{plural(s.tasks.length, "task")} assigned</span>
                  <span className="flex items-center gap-1 text-brand">
                    View <IconArrowRight width={14} height={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <CardHead icon={<IconCheck width={20} height={20} />} eyebrow="Task Checklists" title="Checklist activity" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Checklists this week", checklists.length, "text-ink"],
            ["Submitted", submitted, "text-brand"],
            ["Approved", approved, "text-good"],
            ["Awaiting review", awaiting, "text-warn"],
          ].map(([l, n, c]) => (
            <div key={l as string} className="rounded-2xl bg-plane px-4 py-3.5">
              <div className={cx("text-[28px] font-extrabold leading-none tabular-nums", c as string)}>{n}</div>
              <div className="mt-1.5 text-[11.5px] font-semibold text-ink-2">{l}</div>
            </div>
          ))}
        </div>
        <div className="scroll-thin -mx-1 mt-5 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
          {shownChecklists.length === 0 && <NoMatch />}
          {shownChecklists.map((c) => {
            const done = c.items.filter((i) => i.done).length;
            const pct = c.items.length ? Math.round((done / c.items.length) * 100) : 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChecklist(c.id)}
                className="w-[240px] shrink-0 snap-start rounded-[20px] border border-line bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-bold text-muted">{c.checklistId}</span>
                  <StatusPill status={c.approval} />
                </div>
                <div className="mt-2 text-[14px] font-extrabold">{c.member}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-plane">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-2">
                  <span>
                    {done}/{c.items.length} done · {pct}%
                  </span>
                  <span
                    className={cx(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                      c.submitted ? "bg-brand-soft text-brand" : "bg-plane text-muted",
                    )}
                  >
                    {c.submitted ? "Submitted" : "Draft"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <CardHead
          icon={<IconDoc width={20} height={20} />}
          eyebrow="Master Reports"
          title="Comprehensive productivity report"
          sub={`Weekly Pulse (${fmt(pulse.reportDate)}) + ANT Observations (${fmt(ant.reportDate)}). Week 39's own report isn't generated yet.`}
          right={
            <>
              <button type="button" className="btn btn-sm" onClick={onAllReports}>
                All reports
              </button>
              <button type="button" className="btn btn-dark btn-sm" onClick={() => setReportOpen((o) => !o)} aria-expanded={reportOpen}>
                {reportOpen ? "Collapse" : "Expand"}
                <IconChevron width={14} height={14} className={cx("transition-transform", reportOpen && "rotate-180")} />
              </button>
            </>
          }
        />
        {reportOpen && (
          <div className="mt-5">
            <p className="rounded-2xl bg-warn-soft px-4 py-3 text-[12px] leading-relaxed text-warn">
              Week 39 (Sep 21–25, 2026)&apos;s Weekly Pulse record has not been generated yet (status: Not Started). Showing the most
              recently generated report instead.
            </p>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <article className="rounded-[20px] bg-plane p-5">
                <div className="eyebrow text-brand">Weekly Pulse · {pulse.reportTitle}</div>
                <div className="report-html mt-3" dangerouslySetInnerHTML={{ __html: pulse.html }} />
              </article>
              <article className="rounded-[20px] bg-plane p-5">
                <div className="eyebrow text-violet">ANT observations & suggestions · {ant.reportTitle}</div>
                <div className="report-html mt-3" dangerouslySetInnerHTML={{ __html: ant.html }} />
              </article>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ================= Reports ================= */

const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (k: string) =>
  new Date(k + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const weekNum = (t: string) => Number(t.match(/Week (\d+)/)?.[1] ?? 0);

function ReportsView({
  reports,
  onOpen,
  onStatus,
}: {
  reports: MasterReport[];
  onOpen: (id: string) => void;
  onStatus: (id: string, s: string) => void;
}) {
  const [month, setMonth] = useState("all");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [openDepts, setOpenDepts] = useState<Set<string>>(new Set());
  const toggleIn = (set: Set<string>, key: string) => {
    const n = new Set(set);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    return n;
  };

  const months = [...new Set(reports.map((r) => monthKey(r.date)))].sort();
  const depts = [...new Set(reports.map((r) => r.dept))].sort();
  const statuses = [...new Set(reports.map((r) => r.status))];
  const list = reports.filter(
    (r) =>
      (month === "all" || monthKey(r.date) === month) &&
      (dept === "all" || r.dept === dept) &&
      (status === "all" || r.status === status),
  );
  const groups = [...new Set(list.map((r) => monthKey(r.date)))].sort().reverse();
  const withContent = reports.filter((r) => r.hasContent).length;
  const inReview = reports.filter((r) => r.status !== "Approved").length;

  return (
    <section className="card p-6">
      <CardHead
        icon={<IconDoc width={20} height={20} />}
        eyebrow="Master Reports table"
        title="All team productivity reports"
        right={
          <span className="chip">
            {reports.length} records · {withContent} with content · {inReview} in review
          </span>
        }
      />
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Select label="Month" value={month} onChange={setMonth} options={[{ value: "all", label: "All months" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]} />
        <Select label="Department" value={dept} onChange={setDept} options={[{ value: "all", label: "All departments" }, ...depts.map((d) => ({ value: d, label: d }))]} />
        <Select label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, ...statuses.map((s) => ({ value: s, label: s }))]} />
        <span className="chip">{list.length} shown</span>
      </div>

      <div className="mt-5 space-y-2">
        {groups.length === 0 && <div className="rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No reports match this filter.</div>}
        {groups.map((mk) => {
          const items = list.filter((r) => monthKey(r.date) === mk);
          const isOpen = openMonths.has(mk);
          return (
            <div key={mk} className="rounded-[20px] border border-line">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenMonths((s) => toggleIn(s, mk))}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              >
                <span className="text-[14px] font-extrabold">
                  {monthLabel(mk)} <span className="ml-1 text-[11.5px] font-semibold text-muted">{plural(items.length, "report")}</span>
                </span>
                <IconChevron width={16} height={16} className={cx("text-muted transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="space-y-4 px-4 pb-4">
                  {[...new Set(items.map((r) => r.dept))].sort().map((dp) => {
                    let rows = items.filter((r) => r.dept === dp);
                    // Weekly Pulse series reads in week order; everything else newest first.
                    rows = rows.every((r) => r.type === "WEEKLY PULSE")
                      ? rows.sort((a, b) => weekNum(a.title) - weekNum(b.title))
                      : rows.sort((a, b) => b.date.localeCompare(a.date));
                    const dk = `${mk}::${dp}`;
                    const deptOpen = openDepts.has(dk);
                    return (
                      <div key={dp}>
                        <button
                          type="button"
                          aria-expanded={deptOpen}
                          onClick={() => setOpenDepts((s) => toggleIn(s, dk))}
                          className="flex w-full items-center gap-2 rounded-xl bg-plane px-3 py-2 text-left"
                        >
                          <IconChevron width={14} height={14} className={cx("text-muted transition-transform", !deptOpen && "-rotate-90")} />
                          <span className="eyebrow text-ink-2">{dp}</span>
                          <span className="text-[11px] font-semibold text-muted">{plural(rows.length, "report")}</span>
                        </button>
                        {deptOpen && (
                        <ul className="mt-1.5 space-y-1.5">
                          {rows.map((r) => (
                            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-plane px-4 py-3 sm:flex-nowrap">
                              <button type="button" onClick={() => onOpen(r.id)} className="min-w-0 flex-1 text-left">
                                <div className="truncate text-[13px] font-bold hover:text-brand">
                                  {r.title}
                                  {r.hasContent && <span className="ml-2 text-[10.5px] font-bold text-brand">full report</span>}
                                </div>
                                <div className="mt-0.5 text-[11px] text-muted">
                                  {r.type} · {fmt(r.date)} · Prepared by {r.preparedBy}
                                </div>
                              </button>
                              <select
                                aria-label={`Status of ${r.title}`}
                                value={r.status}
                                onChange={(e) => onStatus(r.id, e.target.value)}
                                className={cx(
                                  "h-8 shrink-0 cursor-pointer rounded-full px-3 text-[11.5px] font-bold outline-none",
                                  r.status === "Approved"
                                    ? "bg-good-soft text-good"
                                    : r.status === "Ready for Review" || r.status === "In Progress"
                                      ? "bg-brand-soft text-brand"
                                      : "bg-white text-ink-2",
                                )}
                              >
                                {REPORT_STATUS.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </li>
                          ))}
                        </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[11.5px] leading-relaxed text-muted">
        Only rows marked &quot;full report&quot; have ANT-generated text in Airtable; the rest are real placeholder records. Status changes
        stay in this session until the Airtable sync is connected.
      </p>
    </section>
  );
}

/* ================= Checklist summaries ================= */

function SummariesView({ checklists, onReview }: { checklists: Checklist[]; onReview: (id: string) => void }) {
  const [member, setMember] = useState("all");
  const submitted = checklists.filter((c) => c.submitted);
  const members = [...new Set(submitted.map((c) => c.member))].sort();
  const list = submitted.filter((c) => member === "all" || c.member === member);
  const pending = list.filter((c) => c.approval !== "Approved");
  const approved = list.filter((c) => c.approval === "Approved");

  const aiSummary = list
    .map((c) => {
      const lines = c.items.length
        ? c.items.map((it) => `- ${it.label}: ${STATUS_LABEL[codeOf(it)]}`).join("\n")
        : "- No tasks linked to this checklist.";
      return `${c.member} (${c.checklistId}) — submitted ${fmtDT(c.submittedAt)}:\n${lines}${c.managerNotes ? `\nNotes: ${c.managerNotes}` : ""}`;
    })
    .join("\n\n");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select label="Member" value={member} onChange={setMember} options={[{ value: "all", label: "All members" }, ...members.map((m) => ({ value: m, label: m }))]} />
        <Select label="Week" value="39" onChange={() => {}} options={[{ value: "39", label: "Week 39" }]} />
        <span className="chip">{plural(list.length, "submitted checklist")}</span>
      </div>
      <p className="rounded-2xl bg-brand-soft px-4 py-3 text-[12px] font-medium leading-relaxed text-brand">
        Only checklists a team member has explicitly submitted appear here. A saved-but-unsubmitted checklist is a draft and stays out
        of this queue.
      </p>

      <section className="card p-6">
        <CardHead eyebrow="AI weekly summary" title="Submitted checklists — team summary" />
        <div className="mt-4 whitespace-pre-line rounded-2xl bg-plane p-4 text-[12.5px] leading-relaxed text-ink-2">
          {aiSummary || "No submitted checklists yet — this fills in once team members submit their checklists."}
        </div>
      </section>

      <section className="card p-6">
        <CardHead eyebrow="Review queue" title="Submitted checklists" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {pending.length ? (
            pending.map((c) => <SummaryCard key={c.id} c={c} onReview={onReview} />)
          ) : (
            <div className="col-span-full rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">
              {submitted.length
                ? "Nothing awaiting review for this filter."
                : "No checklists submitted yet this week — submit one from Checklist activity on the Dashboard."}
            </div>
          )}
        </div>
      </section>

      <section className="card p-6">
        <CardHead eyebrow="Sign-off" title="Approved summaries" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {approved.length ? (
            approved.map((c) => <SummaryCard key={c.id} c={c} onReview={onReview} />)
          ) : (
            <div className="col-span-full rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">
              No approved checklists yet — approve one from the review queue.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ c, onReview }: { c: Checklist; onReview: (id: string) => void }) {
  const done = c.items.filter((i) => i.done).length;
  return (
    <div className="rounded-[20px] border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] font-bold text-muted">{c.checklistId}</span>
        <StatusPill status={c.approval} />
      </div>
      <div className="mt-2 text-[14px] font-extrabold">{c.member}</div>
      <div className="mt-1 text-[11.5px] text-ink-2">
        {done}/{c.items.length} tasks complete{c.summary ? " · AI summary" : ""} · {fmtDT(c.submittedAt)}
      </div>
      <button type="button" className="btn btn-brand btn-sm mt-4" onClick={() => onReview(c.id)}>
        Review
      </button>
    </div>
  );
}

function NoMatch() {
  return <div className="col-span-full w-full rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">Nothing matches your search.</div>;
}
