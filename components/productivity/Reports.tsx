"use client";

import { useState } from "react";
import { IconChevron, IconDoc } from "@/components/icons";
import { CardHead, Select } from "@/components/ui";
import { REPORT_CONTENT, REPORT_STATUS_OPTIONS } from "@/lib/productivity-data";
import type { MasterReport } from "@/lib/productivity-types";
import { cx, fmt, plural } from "@/lib/utils";
import type { Hit } from "./shared";

const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (k: string) =>
  new Date(k + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const weekNum = (t: string) => Number(t.match(/Week (\d+)/)?.[1] ?? 0);
const toggleIn = (set: Set<string>, key: string) => {
  const n = new Set(set);
  if (n.has(key)) n.delete(key);
  else n.add(key);
  return n;
};

export function ReportsView({
  visit,
  reports,
  hit,
  onOpen,
  onStatus,
}: {
  /** Changes every time the Reports tab is opened; resets the month/department groups to collapsed. */
  visit: number;
  reports: MasterReport[];
  hit: Hit;
  onOpen: (id: string) => void;
  onStatus: (id: string, s: string) => void;
}) {
  const [month, setMonth] = useState("all");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");

  const months = [...new Set(reports.map((r) => monthKey(r.date)))].sort();
  const depts = [...new Set(reports.map((r) => r.dept))].sort();
  const statuses = [...new Set(reports.map((r) => r.status))];
  const list = reports.filter(
    (r) =>
      hit(r.title, r.type, r.dept, r.preparedBy) &&
      (month === "all" || monthKey(r.date) === month) &&
      (dept === "all" || r.dept === dept) &&
      (status === "all" || r.status === status),
  );
  const withContent = reports.filter((r) => r.hasContent).length;
  const inReview = reports.filter((r) => r.status !== "Approved").length;

  return (
    <div className="space-y-6">
      <ComprehensiveReport />

      <section className="card p-6">
        <CardHead
          icon={<IconDoc width={20} height={20} />}
          eyebrow="Master Reports table"
          title="All team productivity reports"
          right={
            <span className="chip">
              {reports.length} records · {withContent} with generated content · {inReview} in review
            </span>
          }
        />
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Select label="Month" value={month} onChange={setMonth} options={[{ value: "all", label: "All months" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]} />
          <Select label="Department" value={dept} onChange={setDept} options={[{ value: "all", label: "All departments" }, ...depts.map((d) => ({ value: d, label: d }))]} />
          <Select label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, ...statuses.map((s) => ({ value: s, label: s }))]} />
          <span className="chip">{list.length} shown</span>
        </div>

        <ReportGroups key={visit} list={list} onOpen={onOpen} onStatus={onStatus} />

        <p className="mt-5 text-[11.5px] leading-relaxed text-muted">
          Every row opens its full field breakdown. Only the {withContent} rows marked &quot;full report&quot; have ANT-generated text in
          Airtable; the rest are real placeholder records. Status changes — including moving a report back out of Approved — stay in
          this session until the Airtable sync is connected.
        </p>
      </section>
    </div>
  );
}

/** Month (newest first) → department (A–Z); both levels start collapsed. */
function ReportGroups({
  list,
  onOpen,
  onStatus,
}: {
  list: MasterReport[];
  onOpen: (id: string) => void;
  onStatus: (id: string, s: string) => void;
}) {
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set());
  const [openDepts, setOpenDepts] = useState<Set<string>>(() => new Set());
  const groups = [...new Set(list.map((r) => monthKey(r.date)))].sort().reverse();

  return (
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
                                {REPORT_STATUS_OPTIONS.map((s) => (
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
  );
}

/** Week 39's Weekly Pulse isn't generated yet, so this shows the latest generated Pulse + ANT observations. */
function ComprehensiveReport() {
  const [open, setOpen] = useState(false);
  const pulse = REPORT_CONTENT.pulse32;
  const ant = REPORT_CONTENT.ant28;
  return (
    <section className="card p-6">
      <CardHead
        icon={<IconDoc width={20} height={20} />}
        eyebrow="Reporting · Master Reports table"
        title="Comprehensive productivity report"
        sub={`Weekly Pulse (${fmt(pulse.reportDate)}) + ANT Observations (${fmt(ant.reportDate)}) — Week 39's own report isn't generated yet.`}
        right={
          <button type="button" className="btn btn-dark btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Collapse" : "Expand"}
            <IconChevron width={14} height={14} className={cx("transition-transform", open && "rotate-180")} />
          </button>
        }
      />
      {open && (
        <div className="mt-5">
          <p className="rounded-2xl bg-warn-soft px-4 py-3 text-[12px] leading-relaxed text-warn">
            Week 39 (Sep 21–25, 2026)&apos;s Weekly Pulse record in Master Reports has not been generated yet (status: Not Started).
            Showing the most recently generated report instead: Weekly Pulse from {fmt(pulse.reportDate)} plus ANT Observations &amp;
            Suggestions from {fmt(ant.reportDate)}.
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <article className="min-w-0 rounded-[20px] bg-plane p-5">
              <div className="eyebrow text-brand">Weekly Pulse · {pulse.reportTitle}</div>
              <div className="report-html mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: pulse.html }} />
            </article>
            <article className="min-w-0 rounded-[20px] bg-plane p-5">
              <div className="eyebrow text-violet">ANT observations &amp; suggestions · {ant.reportTitle}</div>
              <div className="report-html mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: ant.html }} />
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
