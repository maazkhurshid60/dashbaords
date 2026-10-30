"use client";

import { useState } from "react";
import { IconCalendar, IconExternal, IconVideo } from "@/components/icons";
import { Modal, StatusPill } from "@/components/ui";
import { TEAM_MEMBER_DIRECTORY } from "@/lib/productivity-data";
import {
  findTaskPlanningByLabel,
  fmtFullDate,
  fmtFullDateWithWeekday,
  fmtFullTime,
  fmtKey,
  meetingById,
  meetingsOnDay,
  parseLocationLink,
} from "@/lib/productivity-logic";
import { TASKS_PLANNING } from "@/lib/productivity-tasks";
import type { Meeting, ReviewKind } from "@/lib/productivity-types";
import { cx, fmtDT } from "@/lib/utils";
import { Empty, H, IconClock, IconTimer, SESSION_NOTE, Tag } from "./shared";

const SOURCE = "Meetings Master · synced from Airtable";

function Muted({ children }: { children: string }) {
  return <span className="text-[12px] text-muted">{children}</span>;
}

/* ---------------- Shared meeting body (general / agenda / recap) ---------------- */

export function MeetingDetailBody({
  mt,
  highlight,
  emptyLinkText = "Not available",
}: {
  mt: Meeting;
  highlight?: ReviewKind;
  emptyLinkText?: string;
}) {
  const loc = parseLocationLink(mt.locationLink);
  const arCard = (kind: ReviewKind, url: string | null, assignee: string | null, approver: string | null) => {
    const label = kind === "agenda" ? "Agenda" : "Recap";
    return (
      <div className={cx("rounded-2xl border p-4", highlight === kind ? "border-brand bg-brand-soft/50" : "border-line")}>
        <div className="field-label">{label}</div>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand hover:underline">
            Open {label} <IconExternal width={14} height={14} />
          </a>
        ) : (
          <div className="text-[12px] text-muted">{emptyLinkText}</div>
        )}
        {assignee && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-2">
            Assignee: <Tag className="bg-white">{assignee}</Tag>
          </div>
        )}
        {approver && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-2">
            Approver: <Tag className="bg-white">{approver}</Tag>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="rounded-[20px] bg-plane p-4">
        <div className="text-[15px] font-extrabold leading-snug">{mt.title}</div>
        {mt.meetingType && <span className="chip mt-2 bg-brand-soft text-brand">{mt.meetingType}</span>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-semibold text-ink-2">
          <span className="flex items-center gap-1.5">
            <IconCalendar width={15} height={15} className="text-muted" />
            {fmtFullDateWithWeekday(mt.dt)}
          </span>
          <span className="flex items-center gap-1.5">
            <IconClock className="text-muted" />
            {fmtFullTime(mt.dt)}
          </span>
          {mt.durationMinutes ? (
            <span className="flex items-center gap-1.5">
              <IconTimer className="text-muted" />
              {mt.durationMinutes} min
            </span>
          ) : null}
        </div>
      </div>

      {mt.objectives && (
        <>
          <H>Meeting objectives</H>
          <blockquote className="rounded-r-2xl border-l-[3px] border-brand bg-plane/60 px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
            {mt.objectives}
          </blockquote>
        </>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="field-label">Departments</div>
          <div className="flex flex-wrap gap-1.5">{mt.depts.length ? mt.depts.map((d) => <Tag key={d}>{d}</Tag>) : <Muted>None linked</Muted>}</div>
        </div>
        <div>
          <div className="field-label">Facilitator</div>
          <div className="flex flex-wrap gap-1.5">{mt.facilitator ? <Tag>{mt.facilitator}</Tag> : <Muted>—</Muted>}</div>
        </div>
      </div>

      <H count={mt.attendees.length}>Attendees</H>
      <div className="flex flex-wrap gap-1.5">
        {mt.attendees.length ? mt.attendees.map((n) => <Tag key={n}>{n}</Tag>) : <Muted>No attendees linked</Muted>}
      </div>

      <H>Location / link</H>
      {loc.joinUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          <a href={loc.joinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-sm">
            <IconVideo width={15} height={15} /> Join meeting
          </a>
          {loc.text && loc.text !== loc.joinUrl && !loc.joinUrl.endsWith(loc.text) && <span className="text-[12px] text-ink-2">{loc.text}</span>}
        </div>
      ) : loc.text ? (
        <div className="text-[12.5px] font-semibold text-ink-2">{loc.text}</div>
      ) : (
        <Muted>No location or link on file</Muted>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {arCard("agenda", mt.agendaUrl, mt.agendaAssignee, mt.agendaApprover)}
        {arCard("recap", mt.recapUrl, mt.recapAssignee, mt.recapApprover)}
      </div>

      <H count={mt.actionItems.length}>Action items</H>
      {mt.actionItems.length ? (
        <ul className="space-y-1.5">
          {mt.actionItems.map((a, i) => (
            <li key={i} className="rounded-xl bg-plane px-3 py-2 text-[12.5px] font-semibold leading-snug">
              {a}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No action items linked in Meetings Master for this record.</Empty>
      )}
    </>
  );
}

/* ---------------- Meeting Details (nested; closing returns to the opener) ---------------- */

export function MeetingModal({ mt, onClose, backLabel = "Close" }: { mt: Meeting; onClose: () => void; backLabel?: string }) {
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title="Meeting details"
      subtitle={SOURCE}
      footer={
        <button type="button" className="btn" onClick={onClose}>
          {backLabel}
        </button>
      }
    >
      <MeetingDetailBody mt={mt} />
    </Modal>
  );
}

/* ---------------- Meetings on a calendar day ---------------- */

export function DayMeetingsModal({ dateKey, onClose }: { dateKey: string; onClose: () => void }) {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const list = meetingsOnDay(dateKey);
  const label = fmtKey(dateKey, { month: "long", day: "numeric", year: "numeric" });
  const mt = meetingId ? meetingById(meetingId) : undefined;
  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Meetings on ${label}`}
        subtitle={SOURCE}
        footer={
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        }
      >
        {list.length ? (
          <ul className="space-y-2.5">
            {list.map((m) => (
              <li key={m.id} className="rounded-2xl border border-line p-4">
                <div className="text-[13px] font-extrabold leading-snug">{m.title}</div>
                <div className="mt-0.5 text-[11.5px] text-muted">{fmtDT(m.dt)}</div>
                {m.depts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.depts.map((d) => (
                      <Tag key={d}>{d}</Tag>
                    ))}
                  </div>
                )}
                <button type="button" className="btn btn-sm mt-3" onClick={() => setMeetingId(m.id)}>
                  View full details →
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No meetings scheduled on {label} in Meetings Master.</Empty>
        )}
      </Modal>
      {mt && <MeetingModal mt={mt} onClose={() => setMeetingId(null)} backLabel="← Back to day" />}
    </>
  );
}

/* ---------------- Agenda / recap review ---------------- */

export function ReviewDetailsModal({
  mt,
  kind,
  approved,
  onApprove,
  onClose,
}: {
  mt: Meeting;
  kind: ReviewKind;
  approved: boolean;
  onApprove: () => void;
  onClose: () => void;
}) {
  const label = kind === "agenda" ? "Agenda" : "Recap";
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`Meeting ${label.toLowerCase()} details`}
      subtitle={SOURCE}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-brand" onClick={onApprove} disabled={approved}>
            {approved ? `${label} approved` : `Approve ${label.toLowerCase()}`}
          </button>
        </>
      }
    >
      <MeetingDetailBody mt={mt} highlight={kind} emptyLinkText="Source fields are empty or unavailable" />
      <p className="mt-5 text-[11.5px] leading-relaxed text-muted">
        Approving moves this {label.toLowerCase()} out of &quot;Ready for review&quot; in this view. {SESSION_NOTE}
      </p>
    </Modal>
  );
}

/* ---------------- Task Details (Tasks Planning + Team Members) ---------------- */

function PersonCard({ id }: { id: string }) {
  const dir = TEAM_MEMBER_DIRECTORY[id];
  return (
    <div className="rounded-2xl border border-line p-3.5">
      <div className="text-[13px] font-extrabold">{dir?.name ?? id}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-2">
        Team Member ID: {dir?.teamMemberId != null ? <Tag>{dir.teamMemberId}</Tag> : <Muted>—</Muted>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-2">
        Email: {dir?.email ? <Tag className="break-all">{dir.email}</Tag> : <Muted>—</Muted>}
      </div>
    </div>
  );
}

const PRIORITY_TONE: Record<string, string> = {
  High: "bg-bad-soft text-bad",
  Medium: "bg-warn-soft text-warn",
  Low: "bg-good-soft text-good",
};

/** Opened from a schedule seed or checklist row. Those only carry a label, so the record is matched by label. */
export function TaskDetailsModal({
  label,
  taskId,
  onClose,
  backLabel = "Close",
}: {
  label?: string;
  taskId?: string;
  onClose: () => void;
  backLabel?: string;
}) {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const t = taskId ? TASKS_PLANNING.find((x) => x.id === taskId) : label ? findTaskPlanningByLabel(label) : null;
  const related = (t?.relatedMeetings ?? []).map(meetingById).filter((m): m is Meeting => !!m);
  const mt = meetingId ? meetingById(meetingId) : undefined;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        wide
        title="Task details"
        subtitle="Tasks Planning · synced from Airtable"
        footer={
          <button type="button" className="btn" onClick={onClose}>
            {backLabel}
          </button>
        }
      >
        {!t ? (
          <Empty>No matching Tasks Planning record found in Airtable for &quot;{label}&quot;.</Empty>
        ) : (
          <>
            <div className="rounded-[20px] bg-plane p-4 text-[15px] font-extrabold leading-snug">{t.task}</div>

            <H count={related.length}>Related meetings</H>
            <div className="flex flex-wrap gap-1.5">
              {related.length ? (
                related.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMeetingId(m.id)}
                    className="rounded-full bg-brand-soft px-2.5 py-1 text-left text-[11.5px] font-bold text-brand hover:bg-lav"
                  >
                    {m.title}
                  </button>
                ))
              ) : (
                <Muted>None linked</Muted>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="field-label">Due date</div>
                <div className="text-[12.5px] font-semibold">{t.due ? fmtFullDate(t.due + "T12:00:00.000Z") : "—"}</div>
              </div>
              <div>
                <div className="field-label">Priority</div>
                {t.priority ? <StatusPill status={t.priority} className={PRIORITY_TONE[t.priority]} /> : <Muted>—</Muted>}
              </div>
              <div>
                <div className="field-label">Status</div>
                {t.status ? <StatusPill status={t.status} /> : <Muted>—</Muted>}
              </div>
            </div>

            <H count={t.assignees.length}>Assigned to</H>
            {t.assignees.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {t.assignees.map((id) => (
                  <PersonCard key={id} id={id} />
                ))}
              </div>
            ) : (
              <Empty>No assignee linked in Tasks Planning for this record.</Empty>
            )}

            <H>Task details</H>
            <blockquote className="rounded-r-2xl border-l-[3px] border-brand bg-plane/60 px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
              {t.taskDetails || "No task details on file."}
            </blockquote>
          </>
        )}
      </Modal>
      {mt && <MeetingModal mt={mt} onClose={() => setMeetingId(null)} backLabel="← Back to task details" />}
    </>
  );
}
