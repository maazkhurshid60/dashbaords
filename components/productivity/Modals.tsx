"use client";

import { useState, type ReactNode } from "react";
import { Modal, StatusPill } from "@/components/ui";
import { ACTIVE_MEMBERS, MEETINGS_THIS_WEEK, REPORT_CONTENT } from "@/lib/productivity-data";
import type { Checklist, MasterReport, Schedule, StatusCode } from "@/lib/types";
import { cx, fmt, fmtDT, plural } from "@/lib/utils";

export const REPORT_STATUS = ["Not Started", "In Progress", "Ready for Review", "Approved"];

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
export const codeOf = (it: Checklist["items"][number]): StatusCode => it.statusCode ?? (it.done ? "C" : "NC");

const SESSION_NOTE =
  "Changes are kept in this browser session. Writing back to Airtable needs the server sync (API route + Airtable token).";

function InfoGrid({ cells }: { cells: [string, ReactNode][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cells.map(([l, v]) => (
        <div key={l} className="rounded-2xl bg-plane px-3.5 py-3">
          <div className="field-label">{l}</div>
          <div className="text-[12.5px] font-semibold leading-snug">{v}</div>
        </div>
      ))}
    </div>
  );
}

function H({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <h4 className="mb-3 mt-7 flex items-baseline gap-2 text-[13px] font-extrabold">
      {children}
      {count != null && <span className="text-[11px] font-semibold text-muted">{count}</span>}
    </h4>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-plane px-4 py-5 text-center text-[12.5px] text-muted">{children}</div>;
}

export function approvalTone(a: string) {
  return a === "Approved" ? "Approved" : a === "Rejected" ? "Rejected" : a;
}

/* ---------------- Schedule ---------------- */

export function ScheduleModal({
  s,
  checklist,
  onClose,
  onOpenChecklist,
}: {
  s: Schedule;
  checklist?: Checklist;
  onClose: () => void;
  onOpenChecklist: (id: string) => void;
}) {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const mt = MEETINGS_THIS_WEEK.find((m) => m.id === meetingId);

  if (mt) {
    const names = mt.attendees.map((id) => ACTIVE_MEMBERS.find((m) => m.id === id)?.name ?? id);
    return (
      <Modal
        open
        onClose={() => setMeetingId(null)}
        title={mt.title}
        subtitle="Meetings Master"
        footer={
          <button type="button" className="btn" onClick={() => setMeetingId(null)}>
            ← Back to schedule
          </button>
        }
      >
        <InfoGrid cells={[["Date & time", fmtDT(mt.dt)], ["Attendees", names.length]]} />
        <H count={names.length}>Attendees</H>
        {names.length ? (
          <ul className="space-y-1.5">
            {names.map((n) => (
              <li key={n} className="rounded-xl bg-plane px-3 py-2 text-[12.5px] font-semibold">
                {n}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No attendees linked in Meetings Master for this record.</Empty>
        )}
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={`${s.member} — schedule`} subtitle={s.weekId} wide>
      <InfoGrid
        cells={[
          ["Week", s.weekId],
          ["Week starting", fmt(s.weekStart)],
          ["Team member", s.member],
          ["Scheduled hours", s.hours != null ? `${s.hours}h` : "—"],
        ]}
      />
      <H count={plural(s.tasks.length, "task")}>Seeds</H>
      {s.tasks.length ? (
        <ul className="space-y-2">
          {s.tasks.map((t, i) => (
            <li key={i} className="rounded-2xl border border-line p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[12.5px] font-semibold leading-snug">{t.label}</div>
                <StatusPill status={t.status} />
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {t.type} · {t.priority} priority · due {fmt(t.due)}
              </div>
              {(t.details || t.notes) && <p className="mt-1.5 text-[12px] leading-snug text-ink-2">{t.details || t.notes}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No tasks linked to this schedule.</Empty>
      )}
      <H count={plural(MEETINGS_THIS_WEEK.length, "meeting")}>This week&apos;s meetings</H>
      <ul className="space-y-2">
        {MEETINGS_THIS_WEEK.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl bg-plane px-4 py-3">
            <div>
              <div className="text-[12.5px] font-bold">{m.title}</div>
              <div className="text-[11px] text-muted">{fmtDT(m.dt)}</div>
            </div>
            <button type="button" className="btn btn-sm bg-white" onClick={() => setMeetingId(m.id)}>
              View
            </button>
          </li>
        ))}
      </ul>
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
  );
}

/* ---------------- Checklist details ---------------- */

export function ChecklistModal({
  c,
  onClose,
  onSave,
}: {
  c: Checklist;
  onClose: () => void;
  onSave: (next: Checklist, submit: boolean) => void;
}) {
  const [draft, setDraft] = useState<Checklist>(() => structuredClone(c));
  const [editing, setEditing] = useState<number | null>(null);

  const setItem = (i: number, fn: (it: Checklist["items"][number]) => void) =>
    setDraft((d) => {
      const n = structuredClone(d);
      fn(n.items[i]);
      return n;
    });

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
          ["Status", <StatusPill key="s" status={approvalTone(c.approval)} />],
          ["Team member", c.member],
          ["Submission", c.submitted ? `Submitted ${fmtDT(c.submittedAt)}` : "Draft"],
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
              <button
                type="button"
                className="mt-2.5 text-left text-[13px] font-semibold leading-snug hover:text-brand"
                onClick={() => setEditing(editing === i ? null : i)}
                aria-expanded={editing === i}
              >
                {it.label}
              </button>
              <div className="mt-0.5 text-[11px] text-muted">
                {it.edit ? `${it.edit.status} · ${it.edit.priority} priority · due ${fmt(it.edit.due)} — ` : ""}
                click the title to edit
              </div>
              {editing === i && (
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
              <span className={cx("rounded-full px-2 py-0.5 text-[10.5px] font-extrabold", STATUS_ACTIVE[codeOf(it)])}>
                {codeOf(it)}
              </span>
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
      <p className="mt-4 text-[11.5px] leading-relaxed text-muted">{SESSION_NOTE}</p>
    </Modal>
  );
}

const emptyEdit = { status: "Not Started", priority: "Medium", due: "", notes: "" };

/* ---------------- Review (Checklist Summaries) ---------------- */

export function SummaryModal({
  c,
  onClose,
  onDecide,
  onSummary,
}: {
  c: Checklist;
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
              <StatusPill status={STATUS_LABEL[codeOf(it)]} className={it.done ? "bg-good-soft text-good" : undefined} />
              <span className="text-[12.5px] font-semibold leading-snug">{it.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No linked tasks.</Empty>
      )}
      <H>Related goals</H>
      <Empty>No linked goals for this checklist record.</Empty>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            onSummary(
              c.summary ||
                `Weekly Task Checklist Summary for ${c.member}:\n\n- ${c.items.map((i) => `${i.label}: ${STATUS_LABEL[codeOf(i)]}`).join("\n- ")}`,
            )
          }
        >
          Run summary report
        </button>
      </div>
      {c.summary && (
        <div className="mt-3 whitespace-pre-line rounded-2xl bg-brand-soft/60 p-4 text-[12.5px] leading-relaxed text-ink-2">{c.summary}</div>
      )}
      <label className="mt-6 block">
        <span className="field-label">Feedback</span>
        <textarea
          className="field"
          rows={3}
          placeholder={`Feedback for ${c.member}…`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>
    </Modal>
  );
}

/* ---------------- Master report ---------------- */

export function ReportModal({
  r,
  onClose,
  onStatus,
}: {
  r: MasterReport;
  onClose: () => void;
  onStatus: (s: string) => void;
}) {
  const content = r.hasContent && r.contentKey ? REPORT_CONTENT[r.contentKey] : null;
  return (
    <Modal open onClose={onClose} wide title={r.title} subtitle="Master Reports">
      <InfoGrid
        cells={[
          ["Report type", r.type],
          ["Department", r.dept],
          ["Date created", fmt(r.date)],
          ["Prepared by", r.preparedBy],
        ]}
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-plane px-3.5 py-3">
          <div className="field-label">Week number</div>
          <div className="text-[12.5px] font-semibold">{r.weekNumber ?? "—"}</div>
        </div>
        <div className="rounded-2xl bg-plane px-3.5 py-3">
          <div className="field-label">Approved</div>
          <div className="text-[12.5px] font-semibold">{r.status === "Approved" ? "☑ Checked" : "☐ Unchecked"}</div>
        </div>
        <div className="rounded-2xl bg-plane px-3.5 py-3">
          <div className="field-label">Reporting period</div>
          <div className="text-[12.5px] font-semibold">{r.reportingPeriod}</div>
        </div>
        <label className="rounded-2xl bg-plane px-3.5 py-3">
          <span className="field-label">Status</span>
          <select className="field h-9 py-1" value={r.status} onChange={(e) => onStatus(e.target.value)}>
            {REPORT_STATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">
        Editable at any time, including moving a report back out of Approved. The Approved checkbox follows Status.
      </p>
      <H>Report</H>
      {content ? (
        // Report text is generated by ANT and stored as HTML in the Master Reports table.
        <div className="report-html" dangerouslySetInnerHTML={{ __html: content.html }} />
      ) : (
        <Empty>No generated report text in Airtable yet (status: {r.status}). Once ANT generates it, it will appear here.</Empty>
      )}
    </Modal>
  );
}
