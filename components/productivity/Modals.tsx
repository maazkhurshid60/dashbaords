"use client";

import { useState } from "react";
import { Modal, StatusPill } from "@/components/ui";
import { REPORT_CONTENT, REPORT_STATUS_OPTIONS } from "@/lib/productivity-data";
import { fmtKey, meetingById, meetingsThisWeek } from "@/lib/productivity-logic";
import type { ChecklistRecord, MasterReport, Schedule, StatusCode, TaskChecklistItem } from "@/lib/productivity-types";
import { cx, fmt, fmtDT, plural } from "@/lib/utils";
import { MeetingModal, TaskDetailsModal } from "./MeetingModals";
import { Empty, H, InfoGrid, SESSION_NOTE } from "./shared";

/* 6-way task status model used on checklists. */
export const STATUS_CODES: StatusCode[] = ["NS", "P", "C", "NC", "D", "O"];
export const STATUS_LABEL: Record<StatusCode, string> = {
  NS: "Not Started",
  P: "Paused",
  C: "Completed",
  NC: "Not Completed",
  D: "Delayed",
  O: "Overdue",
};
const STATUS_ACTIVE: Record<StatusCode, string> = {
  NS: "bg-ink-2 text-white",
  P: "bg-[#8a5a00] text-white",
  C: "bg-good text-white",
  NC: "bg-bad text-white",
  D: "bg-[#b4461a] text-white",
  O: "bg-[#8b1d1d] text-white",
};
export const codeOf = (it: TaskChecklistItem): StatusCode => it.statusCode ?? (it.done ? "C" : "NC");

/* ---------------- Schedule details ---------------- */

type ScheduleNested = { kind: "task"; label: string } | { kind: "meeting"; id: string } | null;

export function ScheduleModal({
  s,
  checklist,
  onClose,
  onOpenChecklist,
}: {
  s: Schedule;
  checklist?: ChecklistRecord;
  onClose: () => void;
  onOpenChecklist: (id: string) => void;
}) {
  const [nested, setNested] = useState<ScheduleNested>(null);
  const meetings = meetingsThisWeek();
  const back = "← Back to schedule details";
  const nestedMeeting = nested?.kind === "meeting" ? meetingById(nested.id) : undefined;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Schedule details"
        subtitle={`${s.member} · ${s.weekId}`}
        wide
        footer={
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        }
      >
        <InfoGrid
          cells={[
            ["Week", s.weekId],
            ["Week starting date", fmtKey(s.weekStart, { month: "long", day: "numeric", year: "numeric" })],
            ["Team member", s.member],
            ["Scheduled hours", <span key="h" className="text-[16px] font-extrabold text-brand">{s.hours ?? "—"}</span>],
          ]}
        />
        <H count={plural(s.tasks.length, "task")}>Seeds</H>
        {s.tasks.length ? (
          <ul className="space-y-2">
            {s.tasks.map((t, i) => (
              <li key={i} className="rounded-2xl border border-line p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[12.5px] font-semibold leading-snug">{t.label}</div>
                  <button
                    type="button"
                    className="shrink-0 text-[11.5px] font-bold text-brand hover:underline"
                    onClick={() => setNested({ kind: "task", label: t.label })}
                  >
                    Details
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPill status={t.status} />
                  <span className="text-[11px] text-muted">
                    {t.type} · {t.priority} priority · due {fmt(t.due)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No tasks linked to this schedule.</Empty>
        )}

        <H count={plural(meetings.length, "meeting")}>This week&apos;s meetings</H>
        {meetings.length ? (
          <ul className="space-y-2">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl bg-plane px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-bold leading-snug">{m.title}</div>
                  <div className="text-[11px] text-muted">{fmtDT(m.dt)}</div>
                </div>
                <button type="button" className="btn btn-sm shrink-0 bg-white" onClick={() => setNested({ kind: "meeting", id: m.id })}>
                  View
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No Meetings Master records fall in this week.</Empty>
        )}

        {checklist ? (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-brand-soft px-4 py-3">
            <div>
              <div className="field-label text-brand">Related checklist</div>
              <div className="text-[14px] font-extrabold">{checklist.checklistId}</div>
            </div>
            <button type="button" className="btn btn-brand btn-sm" onClick={() => onOpenChecklist(checklist.id)}>
              Open checklist
            </button>
          </div>
        ) : (
          <p className="mt-6 text-[12px] text-muted">No related checklist for this schedule.</p>
        )}
      </Modal>
      {nested?.kind === "task" && <TaskDetailsModal label={nested.label} onClose={() => setNested(null)} backLabel={back} />}
      {nestedMeeting && <MeetingModal mt={nestedMeeting} onClose={() => setNested(null)} backLabel={back} />}
    </>
  );
}

/* ---------------- Checklist details ---------------- */

const emptyEdit = { status: "Not Started", priority: "Medium", due: "", notes: "" };

export function ChecklistModal({
  c,
  onClose,
  onSave,
}: {
  c: ChecklistRecord;
  onClose: () => void;
  onSave: (next: ChecklistRecord, submit: boolean) => void;
}) {
  const [draft, setDraft] = useState<ChecklistRecord>(() => structuredClone(c));
  const [editing, setEditing] = useState<Set<number>>(() => new Set());
  const [taskLabel, setTaskLabel] = useState<string | null>(null);

  const setItem = (i: number, fn: (it: TaskChecklistItem) => void) =>
    setDraft((d) => {
      const n = structuredClone(d);
      fn(n.items[i]);
      return n;
    });
  const toggleEdit = (i: number) =>
    setEditing((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  // Live: updates as status circles are clicked, before Save / Submit.
  const flagged = draft.items.filter((it) => ["NC", "D", "O"].includes(codeOf(it)));

  const commit = (submit: boolean) => {
    const n = structuredClone(draft);
    n.items.forEach((it) => {
      it.statusCode = codeOf(it);
      it.done = it.statusCode === "C";
    });
    onSave(n, submit);
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        wide
        title="Checklist details"
        subtitle={`${c.checklistId} · ${c.member}`}
        footer={
          <>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={() => commit(false)}>
              Save changes
            </button>
            <button type="button" className="btn btn-brand" onClick={() => commit(true)}>
              {c.submitted ? "Re-submit" : "Submit for review"}
            </button>
          </>
        }
      >
        <InfoGrid
          cells={[
            ["Checklist ID", c.checklistId],
            ["Status", <StatusPill key="s" status={c.approval} />],
            ["Team member", c.member],
            ["Submission", c.submitted ? `Submitted ${fmtDT(c.submittedAt)}` : "Draft — not yet submitted"],
          ]}
        />

        <H count={draft.items.length}>Assigned tasks</H>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          {STATUS_CODES.map((s) => (
            <span key={s}>
              <b className="text-ink-2">{s}</b> {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
        {draft.items.length ? (
          <ul className="space-y-2.5">
            {draft.items.map((it, i) => (
              <li key={i} className="rounded-2xl border border-line p-3.5">
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Status for ${it.label}`}>
                  {STATUS_CODES.map((code) => {
                    const active = codeOf(it) === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={STATUS_LABEL[code]}
                        onClick={() => setItem(i, (x) => void (x.statusCode = code))}
                        className={cx(
                          "grid size-8 place-items-center rounded-full text-[10.5px] font-extrabold transition",
                          active ? STATUS_ACTIVE[code] : "bg-plane text-muted hover:bg-lav",
                        )}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="text-left text-[13px] font-semibold leading-snug hover:text-brand"
                    onClick={() => toggleEdit(i)}
                    aria-expanded={editing.has(i)}
                  >
                    {it.label}
                  </button>
                  <button type="button" className="shrink-0 text-[11.5px] font-bold text-brand hover:underline" onClick={() => setTaskLabel(it.label)}>
                    Details
                  </button>
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {it.edit ? `${it.edit.status} · ${it.edit.priority} priority · due ${fmt(it.edit.due)} — ` : ""}
                  click the title to edit
                </div>
                {editing.has(i) && (
                  <div className="mt-3 grid gap-3 rounded-2xl bg-plane p-3.5 sm:grid-cols-3">
                    <label>
                      <span className="field-label">Status</span>
                      <select
                        className="field"
                        value={it.edit?.status ?? "Not Started"}
                        onChange={(e) => setItem(i, (x) => void (x.edit = { ...emptyEdit, ...x.edit, status: e.target.value }))}
                      >
                        {["Not Started", "In Progress", "Completed", "At Risk", "Planning"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="field-label">Priority</span>
                      <select
                        className="field"
                        value={it.edit?.priority ?? "Medium"}
                        onChange={(e) => setItem(i, (x) => void (x.edit = { ...emptyEdit, ...x.edit, priority: e.target.value }))}
                      >
                        {["Low", "Medium", "High"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="field-label">Due date</span>
                      <input
                        type="date"
                        className="field"
                        value={it.edit?.due ?? ""}
                        onChange={(e) => setItem(i, (x) => void (x.edit = { ...emptyEdit, ...x.edit, due: e.target.value }))}
                      />
                    </label>
                    <label className="sm:col-span-3">
                      <span className="field-label">Notes</span>
                      <textarea
                        className="field"
                        rows={2}
                        value={it.edit?.notes ?? ""}
                        onChange={(e) => setItem(i, (x) => void (x.edit = { ...emptyEdit, ...x.edit, notes: e.target.value }))}
                      />
                    </label>
                    <p className="text-[11px] leading-relaxed text-muted sm:col-span-3">
                      Edits the Airtable columns behind this task — Status, Priority, Due Date, Notes — for this session.
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No checklist items linked yet.</Empty>
        )}

        <H count={flagged.length || undefined}>
          <span className="text-bad">Tasks not completed</span>
        </H>
        {flagged.length ? (
          <ul className="space-y-1.5">
            {flagged.map((it, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl bg-bad-soft/60 px-3 py-2">
                <span className={cx("rounded-full px-2 py-0.5 text-[10.5px] font-extrabold", STATUS_ACTIVE[codeOf(it)])}>{codeOf(it)}</span>
                <span className="text-[12.5px] font-semibold leading-snug">{it.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No tasks marked as not completed, delayed, or overdue.</Empty>
        )}

        <label className="mt-6 block">
          <span className="field-label">Team member notes & observations</span>
          <textarea
            className="field"
            rows={3}
            placeholder="Add any notes or comments…"
            value={draft.managerNotes}
            onChange={(e) => setDraft({ ...draft, managerNotes: e.target.value })}
          />
        </label>
        <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
          Status circles update the list above immediately and are kept once you Save or Submit. {SESSION_NOTE}
        </p>
      </Modal>
      {taskLabel && <TaskDetailsModal label={taskLabel} onClose={() => setTaskLabel(null)} backLabel="← Back to checklist details" />}
    </>
  );
}

/* ---------------- Review (Checklist Summaries) ---------------- */

export function SummaryModal({
  c,
  onClose,
  onDecide,
  onSummary,
}: {
  c: ChecklistRecord;
  onClose: () => void;
  onDecide: (status: "Approved" | "Rejected", feedback: string) => void;
  onSummary: (text: string) => void;
}) {
  const [feedback, setFeedback] = useState(c.managerNotes);
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title="Checklist summary"
      subtitle={c.checklistId}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn bg-bad-soft text-bad hover:bg-bad hover:text-white" onClick={() => onDecide("Rejected", feedback)}>
            Reject
          </button>
          <button type="button" className="btn btn-brand" onClick={() => onDecide("Approved", feedback)}>
            Approve
          </button>
        </>
      }
    >
      <InfoGrid
        cells={[
          ["Team member", c.member],
          ["Week", "Week 39"],
          ["Approver", "Eloisa Melchor"],
          ["Status", <StatusPill key="s" status={c.approval} />],
        ]}
      />
      <H>Assigned tasks</H>
      {c.items.length ? (
        <ul className="space-y-1.5">
          {c.items.map((it, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-xl bg-plane px-3 py-2">
              <StatusPill status={it.done ? "Done" : "Open"} className={it.done ? "bg-good-soft text-good" : "bg-white text-ink-2"} />
              <span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug">{it.label}</span>
              <span className="shrink-0 text-[11px] text-muted">{STATUS_LABEL[codeOf(it)]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No linked tasks.</Empty>
      )}
      <H>Related goals</H>
      <Empty>No linked goals for this checklist record.</Empty>
      <button
        type="button"
        className="btn btn-sm mt-5"
        onClick={() =>
          onSummary(
            c.summary ||
              `Weekly Task Checklist Summary for ${c.member}:\n\n- ${c.items.map((i) => `${i.label}: ${i.done ? "Completed" : "Not Started"}`).join("\n- ")}`,
          )
        }
      >
        Run summary report
      </button>
      {c.summary && <div className="mt-3 whitespace-pre-line rounded-2xl bg-brand-soft/60 p-4 text-[12.5px] leading-relaxed text-ink-2">{c.summary}</div>}
      <label className="mt-6 block">
        <span className="field-label">Feedback</span>
        <textarea className="field" rows={3} placeholder={`Feedback for ${c.member}…`} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </label>
      <p className="mt-4 text-[11.5px] leading-relaxed text-muted">Feedback and approval are kept in this session only.</p>
    </Modal>
  );
}

/* ---------------- Master report ---------------- */

export function ReportModal({ r, onClose, onStatus }: { r: MasterReport; onClose: () => void; onStatus: (s: string) => void }) {
  const content = r.hasContent && r.contentKey ? REPORT_CONTENT[r.contentKey] : null;
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={r.title}
      subtitle="Master Reports · Report Title"
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <InfoGrid
        cols={3}
        cells={[
          ["Report type", r.type],
          ["Related department(s)", r.dept],
          ["Date created", fmt(r.date)],
          ["Reporting period", r.reportingPeriod],
          ["Week number", r.weekNumber ?? "—"],
          ["Prepared by", r.preparedBy],
        ]}
      />
      <H>Status</H>
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Status" className="field h-9 w-auto py-1" value={r.status} onChange={(e) => onStatus(e.target.value)}>
          {REPORT_STATUS_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="text-[12px] font-semibold text-ink-2">Approved: {r.approved ? "☑ checked" : "☐ unchecked"}</span>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">
        Editable at any time, including moving a report back out of Approved. The Approved checkbox follows Status.
      </p>
      <H>{content ? "This week's activity & Weekly Pulse" : "Report text"}</H>
      {content ? (
        // Report text is generated by ANT and stored as HTML in the Master Reports table (trusted source).
        <div className="report-html" dangerouslySetInnerHTML={{ __html: content.html }} />
      ) : (
        <Empty>No generated report text in Airtable yet (status: {r.status}). Once ANT generates it, it will appear here.</Empty>
      )}
    </Modal>
  );
}
