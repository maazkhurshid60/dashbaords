"use client";

import { useState } from "react";
import { IconCalendar, IconChevron } from "@/components/icons";
import { CardHead } from "@/components/ui";
import { CAL_CHECKLIST_PAGE_SIZE, todayISO } from "@/lib/pics";
import type { PicsRecord } from "@/lib/types";
import { cx, plural } from "@/lib/utils";
import { ChecklistRow, Pager } from "./pics-ui";

interface CalItem {
  date: string;
  label: string;
  parent: string;
  kind: "checklist" | "meeting";
  overdue?: boolean;
  recId?: string;
  idx?: number;
  complete?: boolean;
  status?: string;
}

const KIND_COLOR = { meeting: "#0e8f82", checklist: "#5b2be0", overdue: "#d03b3b" };
const pad = (n: number) => String(n).padStart(2, "0");

/* calendarItems(): open checklist due dates + meetings across Active P.I.C.S. */
function calendarItems(records: PicsRecord[]): CalItem[] {
  return records.flatMap((r) => [
    ...r.checklist.flatMap((c, idx) =>
      !c.done && c.due
        ? [{ date: c.due, label: c.item, parent: r.name, kind: "checklist" as const, overdue: c.status === "overdue", recId: r.id, idx, complete: c.complete, status: c.status }]
        : [],
    ),
    ...(r.meetings ?? []).map((m) => ({ date: m.date.slice(0, 10), label: m.label, parent: r.name, kind: "meeting" as const })),
  ]);
}

/* Interactive month view; the selected day lists its meetings and (10 at a time) its checklist items. */
export function PicsCalendar({ records, onEditChecklist }: { records: PicsRecord[]; onEditChecklist: (recId: string, idx: number) => void }) {
  const today = todayISO();
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(today);
  const [page, setPage] = useState(0);

  const byDate: Record<string, CalItem[]> = {};
  calendarItems(records).forEach((it) => (byDate[it.date] ??= []).push(it));

  const first = new Date(ym.y, ym.m, 1);
  const offset = first.getDay();
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const prevDays = new Date(ym.y, ym.m, 0).getDate();
  const cells: { day: number; iso: string | null }[] = [
    ...Array.from({ length: offset }, (_, i) => ({ day: prevDays - offset + 1 + i, iso: null })),
    ...Array.from({ length: days }, (_, i) => ({ day: i + 1, iso: `${ym.y}-${pad(ym.m + 1)}-${pad(i + 1)}` })),
  ];
  for (let d = 1; cells.length % 7; d++) cells.push({ day: d, iso: null });

  const nav = (delta: number) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const selectDay = (iso: string) => {
    setSelected(iso);
    setPage(0);
  };

  const dayItems = byDate[selected] ?? [];
  const meetings = dayItems.filter((it) => it.kind === "meeting");
  const checklist = dayItems.filter((it) => it.kind === "checklist");
  const maxPage = Math.max(0, Math.ceil(checklist.length / CAL_CHECKLIST_PAGE_SIZE) - 1);
  const curPage = Math.min(page, maxPage);
  const pageItems = checklist.slice(curPage * CAL_CHECKLIST_PAGE_SIZE, (curPage + 1) * CAL_CHECKLIST_PAGE_SIZE);
  const colorOf = (it: CalItem) => (it.kind === "meeting" ? KIND_COLOR.meeting : it.overdue ? KIND_COLOR.overdue : KIND_COLOR.checklist);

  return (
    <section className="card p-5 sm:p-6">
      <CardHead
        icon={<IconCalendar width={20} height={20} />}
        eyebrow="Active P.I.C.S"
        title="Meetings & checklist due dates"
        sub="Pick a day to see its meetings and checklist items. Click a checklist row to edit it."
        right={
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous month" onClick={() => nav(-1)} className="grid size-9 place-items-center rounded-full bg-plane hover:bg-lav">
              <IconChevron width={16} height={16} className="rotate-90" />
            </button>
            <span className="min-w-[130px] text-center text-[13px] font-bold">
              {first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button type="button" aria-label="Next month" onClick={() => nav(1)} className="grid size-9 place-items-center rounded-full bg-plane hover:bg-lav">
              <IconChevron width={16} height={16} className="-rotate-90" />
            </button>
          </div>
        }
      />

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-muted sm:gap-1.5">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
            {cells.map((c, i) => {
              if (!c.iso)
                return (
                  <div key={`o${i}`} className="flex h-14 items-start p-2 text-[12px] font-semibold text-muted/50 sm:h-20">
                    {c.day}
                  </div>
                );
              const iso = c.iso;
              const its = byDate[iso] ?? [];
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(iso)}
                  aria-pressed={selected === iso}
                  aria-label={`${iso}: ${plural(its.length, "item")}`}
                  className={cx(
                    "flex h-14 min-w-0 flex-col items-start rounded-xl p-1.5 text-left transition sm:h-20 sm:rounded-2xl sm:p-2",
                    selected === iso ? "bg-ink text-white" : "bg-plane hover:bg-lav",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-6 place-items-center rounded-full text-[12px] font-bold",
                      iso === today && selected !== iso && "bg-brand text-white",
                    )}
                  >
                    {c.day}
                  </span>
                  <span className="mt-auto flex flex-wrap items-center gap-1">
                    {its.slice(0, 4).map((it, j) => (
                      <span key={j} className="size-1.5 rounded-full sm:size-2" style={{ background: colorOf(it) }} />
                    ))}
                    {its.length > 4 && <span className="text-[9.5px] font-bold">+{its.length - 4}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-semibold text-ink-2">
            <Legend color={KIND_COLOR.checklist} label="Checklist due" />
            <Legend color={KIND_COLOR.overdue} label="Overdue" />
            <Legend color={KIND_COLOR.meeting} label="Meeting" />
          </div>
        </div>

        <div className="min-w-0 rounded-2xl bg-plane p-4">
          <div className="text-[13px] font-extrabold">
            {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="text-[11.5px] text-muted">{plural(dayItems.length, "item")}</div>
          {!dayItems.length && <p className="py-6 text-center text-[12px] text-muted">No checklist items or meetings on this day.</p>}

          {meetings.length > 0 && (
            <div className="mt-3">
              <SubHead label="Meetings" n={meetings.length} />
              <ul className="space-y-2">
                {meetings.map((it, i) => (
                  <li key={i} className="flex gap-2.5 rounded-xl bg-white p-3">
                    <span className="mt-1 h-8 w-1 shrink-0 rounded-full" style={{ background: KIND_COLOR.meeting }} />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold leading-snug">{it.label}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{it.parent} · Meeting</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {checklist.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <SubHead label="Checklist" n={checklist.length} />
                <Pager page={curPage} maxPage={maxPage} total={checklist.length} size={CAL_CHECKLIST_PAGE_SIZE} onPage={setPage} />
              </div>
              <div className="space-y-1.5">
                {pageItems.map((it) => (
                  <ChecklistRow
                    key={`${it.recId}-${it.idx}`}
                    item={it.label}
                    due={it.date}
                    status={it.status ?? "upcoming"}
                    checked={!!it.complete || it.status === "done"}
                    sub={it.parent}
                    onEdit={() => onEditChecklist(it.recId!, it.idx!)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SubHead({ label, n }: { label: string; n: number }) {
  return (
    <div className="mb-2 flex items-baseline gap-2 text-[12.5px] font-extrabold">
      {label} <span className="text-[11px] font-semibold text-muted">{plural(n, "item")}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
