"use client";

import { useRef, useState } from "react";
import { Donut, SERIES, type DonutDatum } from "@/components/charts";
import { IconArrowRight, IconCalendar, IconChevron, IconChevronLeft } from "@/components/icons";
import { CardHead } from "@/components/ui";
import {
  TODAY_KEY,
  buildCalendarCells,
  fmtKey,
  groupReviewMeetingsByDept,
  meetingsByDay,
  meetingsInMonth,
  monthLabel,
  pipelineMonth,
} from "@/lib/productivity-logic";
import { MEETINGS_MASTER } from "@/lib/productivity-meetings";
import type { Meeting, ReviewKind } from "@/lib/productivity-types";
import { cx, fmtDT, plural } from "@/lib/utils";
import { IconChevronRight, SmallTile, type Hit } from "./shared";

/* Department colors are fixed by overall meeting volume, so a department keeps its color
   in every month. More than 7 departments would fold the tail into "Other". */
const DEPT_ORDER = (() => {
  const counts: Record<string, number> = {};
  MEETINGS_MASTER.forEach((m) => m.depts.forEach((d) => (counts[d] = (counts[d] ?? 0) + 1)));
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
})();
const OTHER = "Other";
const FOLD = DEPT_ORDER.length > SERIES.length;
const deptBucket = (d: string) => (FOLD && DEPT_ORDER.indexOf(d) >= SERIES.length - 1 ? OTHER : d);
const deptColor = (d: string) => (d === OTHER ? SERIES[SERIES.length - 1] : SERIES[DEPT_ORDER.indexOf(d)]);

const PER_PAGE = 3;

export function MeetingsPipelineView({
  hit,
  approved,
  onDay,
  onReview,
}: {
  hit: Hit;
  approved: Set<string>;
  onDay: (key: string) => void;
  onReview: (id: string, kind: ReviewKind) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [pages, setPages] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<ReviewKind, Set<string>>>(() => ({ agenda: new Set(), recap: new Set() }));
  const agendasRef = useRef<HTMLDivElement>(null);
  const recapsRef = useRef<HTMLDivElement>(null);

  const { year, month } = pipelineMonth(offset);
  const next = pipelineMonth(offset + 1);
  const label = monthLabel(year, month);
  const meetings = meetingsInMonth(year, month);
  const agendas = meetings.filter((m) => m.agendaReady && !m.agendaApproved && !approved.has(`agenda:${m.id}`));
  const recaps = meetings.filter((m) => m.recapReady && !m.recapApproved && !approved.has(`recap:${m.id}`));

  // Department split: share of department tags across the month (meetings with none are excluded).
  const withDept = meetings.filter((m) => m.depts.length);
  const byDept: Record<string, Meeting[]> = {};
  withDept.forEach((m) => m.depts.forEach((d) => (byDept[deptBucket(d)] ??= []).push(m)));
  const dist: DonutDatum[] = Object.entries(byDept)
    .map(([d, ms]) => ({ key: d, label: d, value: ms.length, color: deptColor(d), sub: plural(ms.length, "meeting") }))
    .sort((a, b) => b.value - a.value);
  const tagTotal = dist.reduce((s, d) => s + d.value, 0);

  const searchable = (m: Meeting) => hit(m.title, m.objectives, m.agendaApprover, m.recapApprover, ...m.depts);
  const toggleDept = (kind: ReviewKind, dept: string) =>
    setExpanded((e) => {
      const n = new Set(e[kind]);
      if (n.has(dept)) n.delete(dept);
      else n.add(dept);
      return { ...e, [kind]: n };
    });
  const page = (kind: ReviewKind, dept: string, delta: number) =>
    setPages((p) => ({ ...p, [`${kind}::${dept}`]: (p[`${kind}::${dept}`] ?? 0) + delta }));

  const reviewSection = (kind: ReviewKind, list: Meeting[]) => {
    const shown = list.filter(searchable);
    const groups = groupReviewMeetingsByDept(shown);
    return groups.length ? (
      <div className="space-y-2">
        {groups.map((g) => {
          const key = `${kind}::${g.dept}`;
          const totalPages = Math.max(1, Math.ceil(g.meetings.length / PER_PAGE));
          const p = (((pages[key] ?? 0) % totalPages) + totalPages) % totalPages;
          const isOpen = expanded[kind].has(g.dept);
          return (
            <div key={g.dept} className="rounded-[20px] border border-line">
              <div className="flex items-center justify-between gap-2 pr-3">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleDept(kind, g.dept)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 text-left"
                >
                  <IconChevron width={14} height={14} className={cx("shrink-0 text-muted transition-transform", !isOpen && "-rotate-90")} />
                  <span className="truncate text-[13px] font-extrabold">{g.dept}</span>
                  <span className="text-[11.5px] font-semibold text-muted">{g.meetings.length}</span>
                </button>
                {isOpen && totalPages > 1 && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Previous ${g.dept} page`}
                      onClick={() => page(kind, g.dept, -1)}
                      className="grid size-7 place-items-center rounded-full bg-plane text-ink-2 hover:bg-lav"
                    >
                      <IconChevronLeft width={13} height={13} />
                    </button>
                    <span className="text-[11px] font-bold tabular-nums text-ink-2">
                      {p + 1}/{totalPages}
                    </span>
                    <button
                      type="button"
                      aria-label={`Next ${g.dept} page`}
                      onClick={() => page(kind, g.dept, 1)}
                      className="grid size-7 place-items-center rounded-full bg-plane text-ink-2 hover:bg-lav"
                    >
                      <IconChevronRight width={13} height={13} />
                    </button>
                  </div>
                )}
              </div>
              {isOpen && (
                <div className="grid gap-3 px-4 pb-4 md:grid-cols-3">
                  {g.meetings.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE).map((m) => (
                    <ReviewCard key={m.id} m={m} kind={kind} onOpen={() => onReview(m.id, kind)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">
        {list.length ? "Nothing matches your search." : `No ${kind}s ready for review in ${label}.`}
      </div>
    );
  };

  return (
    <section className="card p-6">
      <CardHead
        icon={<IconCalendar width={20} height={20} />}
        eyebrow="Meetings Master · synced from Airtable"
        title="Meetings Pipeline"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-sm" onClick={() => setOffset((o) => o - 1)}>
              <IconChevronLeft width={14} height={14} /> Prev
            </button>
            <span className="chip bg-ink text-white" aria-live="polite">
              {label}
            </span>
            <button type="button" className="btn btn-sm" onClick={() => setOffset((o) => o + 1)}>
              Next <IconChevronRight width={14} height={14} />
            </button>
          </div>
        }
      />
      <p className="mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-[12px] font-medium leading-relaxed text-brand">
        The success pipeline for meeting agendas and recaps in {label}. Agendas and recaps ready for review are listed below — open one to
        see its full details and approve it. Approvals update this view for the session only, not Airtable.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SmallTile label="Total meetings this month" value={meetings.length} />
        <SmallTile label="Agendas ready for review" value={agendas.length} tone="text-warn" />
        <SmallTile label="Recaps ready for review" value={recaps.length} tone="text-teal" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-[20px] border border-line p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-[14px] font-extrabold">Meetings by department this month</div>
            <span className="text-[11.5px] font-semibold text-muted">{plural(withDept.length, "meeting")}</span>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            Share of department tags across {label}&apos;s meetings (a meeting can link more than one department; meetings with none are
            excluded). Hover for the meetings behind each slice.
          </p>
          {dist.length ? (
            <div className="mt-5 grid items-center gap-6 sm:grid-cols-[170px_minmax(0,1fr)]">
              <Donut data={dist} size={170} thickness={28} centerLabel="department tags" />
              <ul className="grid gap-1.5">
                {dist.map((d) => (
                  <DeptLegendRow key={d.key} d={d} total={tagTotal} meetings={byDept[d.key]} />
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No department-linked meetings this month.</div>
          )}
        </div>

        <div className="min-w-0 rounded-[20px] border border-line p-5">
          <div className="text-[14px] font-extrabold">Quick access</div>
          <p className="mt-1 text-[12px] text-muted">Jump straight to the review lists below.</p>
          <div className="mt-4 grid gap-3">
            {(
              [
                ["Access meeting agendas", agendas.length, agendasRef],
                ["Access meeting recaps", recaps.length, recapsRef],
              ] as const
            ).map(([t, n, ref]) => (
              <button
                key={t}
                type="button"
                onClick={() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="flex items-center justify-between gap-3 rounded-2xl bg-plane px-4 py-3.5 text-left transition hover:bg-lav"
              >
                <span>
                  <span className="block text-[13px] font-extrabold">{t}</span>
                  <span className="text-[11.5px] text-ink-2">{n} ready for review</span>
                </span>
                <IconArrowRight width={16} height={16} className="shrink-0 text-brand" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <MiniCalendar year={year} month={month} heading={`Meetings schedule: ${label}`} onDay={onDay} />
        <MiniCalendar year={next.year} month={next.month} heading={`A look ahead: ${monthLabel(next.year, next.month)}`} onDay={onDay} />
      </div>

      <div ref={agendasRef} className="scroll-mt-6">
        <h4 className="mb-3 mt-8 flex items-baseline gap-2 text-[15px] font-extrabold">
          Meeting agendas ready for review <span className="text-[12px] font-semibold text-muted">{agendas.length}</span>
        </h4>
        {reviewSection("agenda", agendas)}
      </div>
      <div ref={recapsRef} className="scroll-mt-6">
        <h4 className="mb-3 mt-8 flex items-baseline gap-2 text-[15px] font-extrabold">
          Meeting recaps ready for review <span className="text-[12px] font-semibold text-muted">{recaps.length}</span>
        </h4>
        {reviewSection("recap", recaps)}
      </div>

      <p className="mt-6 text-[11.5px] text-muted">
        Pulled from Meetings Master (Airtable) — {MEETINGS_MASTER.length} records synced. Click a meeting card or a calendar day for full
        details.
      </p>
    </section>
  );
}

function DeptLegendRow({ d, total, meetings }: { d: DonutDatum; total: number; meetings: Meeting[] }) {
  return (
    <li className="group relative">
      <div
        tabIndex={0}
        className="flex cursor-default items-center gap-2.5 rounded-lg px-1 py-0.5 text-[12.5px] outline-none hover:bg-plane focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="h-2.5 w-4 shrink-0 rounded-full" style={{ background: d.color }} />
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{d.label}</span>
        <span className="tabular-nums text-ink-2">
          {d.value} · {total ? Math.round((d.value / total) * 100) : 0}%
        </span>
      </div>
      <div className="pointer-events-none absolute left-0 right-0 top-full z-20 mt-1 hidden rounded-xl bg-ink px-3 py-2 text-[11.5px] leading-snug text-white shadow-pop group-focus-within:block group-hover:block">
        <div className="font-bold">{d.label}</div>
        <div className="text-white/70">{plural(meetings.length, "meeting")}</div>
        {meetings.slice(0, 5).map((m) => (
          <div key={m.id} className="truncate">
            {m.title}
          </div>
        ))}
        {meetings.length > 5 && <div className="italic text-white/70">+{meetings.length - 5} more</div>}
      </div>
    </li>
  );
}

function MiniCalendar({ year, month, heading, onDay }: { year: number; month: number; heading: string; onDay: (key: string) => void }) {
  const byDay = meetingsByDay(meetingsInMonth(year, month));
  const cells = buildCalendarCells(year, month);
  return (
    <div className="rounded-[20px] border border-line p-4">
      <div className="mb-3 text-[13px] font-extrabold">{heading}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold uppercase text-muted">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) return <div key={`e${i}`} />;
          const n = byDay[key]?.length ?? 0;
          const isToday = key === TODAY_KEY;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDay(key)}
              title={`${plural(n, "meeting")} — click to view`}
              aria-label={`${fmtKey(key, { weekday: "long", month: "long", day: "numeric" })}: ${plural(n, "meeting")}`}
              className={cx(
                "flex aspect-square min-h-9 flex-col items-center justify-center gap-0.5 rounded-xl text-[12px] font-bold tabular-nums transition",
                isToday ? "bg-brand text-white" : n ? "bg-brand-soft/60 text-ink hover:bg-lav" : "text-ink-2 hover:bg-plane",
              )}
            >
              {Number(key.slice(8))}
              {n > 0 && (
                <span className="flex gap-0.5" aria-hidden>
                  {Array.from({ length: Math.min(n, 5) }, (_, j) => (
                    <span key={j} className={cx("size-1 rounded-full", isToday ? "bg-white" : "bg-brand")} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewCard({ m, kind, onOpen }: { m: Meeting; kind: ReviewKind; onOpen: () => void }) {
  const approver = kind === "agenda" ? m.agendaApprover : m.recapApprover;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-col rounded-2xl bg-plane p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-card"
    >
      <div className="text-[13px] font-extrabold leading-snug">{m.title}</div>
      <div className="mt-1.5 line-clamp-3 text-[12px] leading-snug text-ink-2">{m.objectives || "No objectives noted for this meeting yet."}</div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-3 text-[11px] text-muted">
        <span>{fmtDT(m.dt)}</span>
        <span className="font-semibold text-ink-2">Approver: {approver || "Unassigned"}</span>
      </div>
    </button>
  );
}
