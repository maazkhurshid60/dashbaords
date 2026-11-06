"use client";

import { useState } from "react";
import { CardHead, Select, StatusPill } from "@/components/ui";
import type { ChecklistRecord } from "@/lib/productivity-types";
import { fmtDT, plural } from "@/lib/utils";
import { isoWeekOfKey, weekRangeText } from "@/lib/productivity-logic";
import { useProductivity } from "./context";

const PENDING = "pending";
import { STATUS_LABEL, codeOf } from "./Modals";

/** AI weekly summary: every submitted checklist's task statuses (6-way codes) plus notes. */
function buildAiWeeklySummary(list: ChecklistRecord[]) {
  return list
    .map((c) => {
      const lines = c.items.length
        ? c.items.map((it) => `- ${it.label}: ${STATUS_LABEL[codeOf(it)]}`).join("\n")
        : "- No tasks linked to this checklist.";
      return `${c.member} (${c.checklistId}) — submitted ${c.submittedAt ? fmtDT(c.submittedAt) : ""}:\n${lines}${c.managerNotes ? `\nNotes: ${c.managerNotes}` : ""}`;
    })
    .join("\n\n");
}

export function SummariesView({ checklists, onReview }: { checklists: ChecklistRecord[]; onReview: (id: string) => void }) {
  const [member, setMember] = useState("all");
  const { week } = useProductivity();
  /** A week's Monday (YYYY-MM-DD), or PENDING for every week's unapproved submissions. */
  const [weekKey, setWeekKey] = useState(week.start);
  const weekOptions = [...new Set([week.start, ...checklists.map((c) => c.weekStart).filter((k): k is string => !!k)])]
    .sort()
    .reverse()
    .map((k) => ({ value: k, label: `Week ${isoWeekOfKey(k)} · ${weekRangeText(k)}` }));
  const pendingCount = checklists.filter((c) => c.submitted && c.approval !== "Approved").length;
  const inScope = checklists.filter((c) => (weekKey === PENDING ? c.approval !== "Approved" : c.weekStart === weekKey));
  const submitted = inScope.filter((c) => c.submitted);
  const members = [...new Set(submitted.map((c) => c.member))].sort();
  const list = submitted.filter((c) => member === "all" || c.member === member);
  const pending = list.filter((c) => c.approval !== "Approved");
  const approved = list.filter((c) => c.approval === "Approved");

  return (
    <div className="space-y-6">
      <p className="rounded-2xl bg-brand-soft px-4 py-3 text-[12px] font-medium leading-relaxed text-brand">
        Only checklists a team member has explicitly submitted (from Checklist details) appear here. A saved-but-unsubmitted checklist
        is a draft and stays out of this review queue.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Select label="Member" value={member} onChange={setMember} options={[{ value: "all", label: "All members" }, ...members.map((m) => ({ value: m, label: m }))]} />
        <Select
          label="Week"
          value={weekKey}
          onChange={setWeekKey}
          options={[{ value: PENDING, label: `All pending review (${pendingCount})` }, ...weekOptions]}
        />
        <span className="chip">{plural(list.length, "submitted checklist")}</span>
      </div>

      <section className="card p-6">
        <CardHead eyebrow="AI weekly summary" title="Submitted checklists — team summary" />
        <div className="mt-4 whitespace-pre-line rounded-2xl bg-plane p-4 text-[12.5px] leading-relaxed text-ink-2">
          {list.length
            ? buildAiWeeklySummary(list)
            : "No submitted checklists yet for this filter — this summary fills in once team members submit their checklists for review."}
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
                : weekKey === PENDING
                  ? "Nothing awaiting review in any week."
                  : "No checklists submitted for this week yet — submit one from Checklist details to appear here."}
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
              {weekKey === PENDING
                ? "Pick a week to see its approved summaries."
                : "No approved checklists for this week yet — approve one from the review queue."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ c, onReview }: { c: ChecklistRecord; onReview: (id: string) => void }) {
  const done = c.items.filter((i) => i.done).length;
  return (
    <div className="rounded-[20px] border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] font-bold text-muted">{c.checklistId}</span>
        <StatusPill status={c.approval} />
      </div>
      <div className="mt-2 text-[14px] font-extrabold">{c.member}</div>
      <div className="mt-1 text-[11.5px] text-ink-2">
        {done}/{c.items.length} tasks complete{c.summary ? " · AI summary available" : ""} · submitted {fmtDT(c.submittedAt)}
      </div>
      <button type="button" className="btn btn-brand btn-sm mt-4" onClick={() => onReview(c.id)}>
        Review
      </button>
    </div>
  );
}
