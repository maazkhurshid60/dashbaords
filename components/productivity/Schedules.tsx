"use client";

import { useState } from "react";
import { IconArrowRight, IconCheck, IconChevronLeft, IconUsers } from "@/components/icons";
import { Avatar, CardHead, StatusPill } from "@/components/ui";
import type { ChecklistRecord } from "@/lib/productivity-types";
import { isoWeekOfKey } from "@/lib/productivity-logic";
import { cx, plural } from "@/lib/utils";
import { useProductivity } from "./context";
import { IconChevronRight, NoMatch, SmallTile, type Hit } from "./shared";

/* Order follows the original: checklist status tiles, team schedules, then Checklist Quick Access.
   Prev/Next walks the Weekly Schedules / Task Checklists records week by week (Mon–Fri, today = offset 0). */
export function SchedulesView({
  hit,
  checklists: allChecklists,
  onSchedule,
  onChecklist,
}: {
  hit: Hit;
  checklists: ChecklistRecord[];
  onSchedule: (id: string) => void;
  onChecklist: (id: string) => void;
}) {
  const { schedules: allSchedules, capWeekDayKeys, capWeekRangeLabel } = useProductivity();
  const [offset, setOffset] = useState(0);
  const monday = capWeekDayKeys(offset)[0];
  const SCHEDULES = allSchedules.filter((s) => s.weekStart === monday);
  const checklists = allChecklists.filter((c) => c.weekStart === monday);
  const weekLabel = `Week ${isoWeekOfKey(monday)}`;
  const submitted = checklists.filter((c) => c.submitted).length;
  const approved = checklists.filter((c) => c.approval === "Approved").length;
  const awaiting = checklists.filter((c) => ["Not Started", "In Progress", "In Review"].includes(c.approval)).length;
  const schedules = SCHEDULES.filter((s) => hit(s.member, s.weekId, s.checklistId, ...s.tasks.map((t) => t.label)));
  const shown = checklists.filter((c) => hit(c.member, c.checklistId, ...c.items.map((i) => i.label)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm" disabled={offset === 0} onClick={() => setOffset(0)}>
          This week
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setOffset((o) => o - 1)}>
          <IconChevronLeft width={14} height={14} /> Prev
        </button>
        <span className="chip bg-ink text-white" aria-live="polite">
          {weekLabel} · {capWeekRangeLabel(offset)}
        </span>
        <button type="button" className="btn btn-sm" onClick={() => setOffset((o) => o + 1)}>
          Next <IconChevronRight width={14} height={14} />
        </button>
      </div>
      <section className="card p-6">
        <CardHead icon={<IconCheck width={20} height={20} />} eyebrow="Task Checklists" title="Checklist activity" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SmallTile label={offset === 0 ? "Checklists this week" : "Checklists that week"} value={checklists.length} />
          <SmallTile label="Submitted" value={submitted} tone="text-brand" />
          <SmallTile label="Approved" value={approved} tone="text-good" />
          <SmallTile label="Awaiting review" value={awaiting} tone="text-warn" />
        </div>
      </section>

      <section className="card p-6">
        <CardHead
          icon={<IconUsers width={20} height={20} />}
          eyebrow="Weekly Schedules"
          title={`Team schedules — ${weekLabel} (active roster)`}
          right={<span className="chip">{plural(SCHEDULES.length, "active member")}</span>}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {schedules.length === 0 && <NoMatch>{SCHEDULES.length ? undefined : "No Weekly Schedules records for this week in Airtable."}</NoMatch>}
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
        <CardHead icon={<IconCheck width={20} height={20} />} eyebrow="Task Checklists" title="Checklist quick access" />
        <div className="scroll-thin -mx-1 mt-5 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
          {shown.length === 0 && <NoMatch>{checklists.length ? undefined : "No Task Checklists records for this week in Airtable."}</NoMatch>}
          {shown.map((c) => {
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
                    {done}/{c.items.length} items complete · {pct}%
                  </span>
                  <span className={cx("rounded-full px-2 py-0.5 text-[10.5px] font-bold", c.submitted ? "bg-brand-soft text-brand" : "bg-plane text-muted")}>
                    {c.submitted ? "Submitted" : "Draft"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
