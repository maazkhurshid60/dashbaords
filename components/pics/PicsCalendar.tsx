"use client";

import { useState } from "react";
import { IconCalendar, IconChevron } from "@/components/icons";
import { CardHead } from "@/components/ui";
import type { PicsRecord } from "@/lib/types";
import { cx, plural } from "@/lib/utils";

interface CalItem {
  date: string;
  label: string;
  parent: string;
  kind: "checklist" | "meeting";
  overdue?: boolean;
}

const KIND_COLOR = { meeting: "#0e8f82", checklist: "#5b2be0", overdue: "#d03b3b" };
const pad = (n: number) => String(n).padStart(2, "0");

/* Month view of open checklist due dates and meetings across Active P.I.C.S. */
export function PicsCalendar({ records }: { records: PicsRecord[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(today);

  const items: CalItem[] = records.flatMap((r) => [
    ...r.checklist
      .filter((c) => !c.done && c.due)
      .map((c) => ({ date: c.due!, label: c.item, parent: r.name, kind: "checklist" as const, overdue: c.status === "overdue" })),
    ...(r.meetings ?? []).map((m) => ({ date: m.date.slice(0, 10), label: m.label, parent: r.name, kind: "meeting" as const })),
  ]);
  const byDate: Record<string, CalItem[]> = {};
  items.forEach((it) => (byDate[it.date] ??= []).push(it));

  const first = new Date(ym.y, ym.m, 1);
  const offset = first.getDay();
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => `${ym.y}-${pad(ym.m + 1)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);

  const nav = (delta: number) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const dayItems = byDate[selected] ?? [];
  const colorOf = (it: CalItem) => (it.kind === "meeting" ? KIND_COLOR.meeting : it.overdue ? KIND_COLOR.overdue : KIND_COLOR.checklist);

  return (
    <section className="card p-6">
      <CardHead
        icon={<IconCalendar width={20} height={20} />}
        eyebrow="Active P.I.C.S"
        title="Calendar"
        sub="Checklist due dates and meetings. Pick a day to see what's on it."
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

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10.5px] font-bold uppercase tracking-wider text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {cells.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const its = byDate[iso] ?? [];
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelected(iso)}
                  aria-pressed={selected === iso}
                  aria-label={`${iso}: ${plural(its.length, "item")}`}
                  className={cx(
                    "flex h-16 flex-col items-start rounded-2xl p-2 text-left transition sm:h-20",
                    selected === iso ? "bg-ink text-white" : "bg-plane hover:bg-lav",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-6 place-items-center rounded-full text-[12px] font-bold",
                      iso === today && selected !== iso && "bg-brand text-white",
                    )}
                  >
                    {Number(iso.slice(8))}
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

        <div className="rounded-2xl bg-plane p-4">
          <div className="text-[13px] font-extrabold">
            {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="text-[11.5px] text-muted">{plural(dayItems.length, "item")}</div>
          <ul className="scroll-thin mt-3 max-h-[340px] space-y-2 overflow-y-auto">
            {dayItems.length ? (
              dayItems.map((it, i) => (
                <li key={i} className="flex gap-2.5 rounded-xl bg-white p-3">
                  <span className="mt-1 h-8 w-1 shrink-0 rounded-full" style={{ background: colorOf(it) }} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold leading-snug">{it.label}</div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {it.parent} · {it.kind === "meeting" ? "Meeting" : it.overdue ? "Overdue checklist item" : "Checklist item"}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-[12px] text-muted">Nothing scheduled on this day.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
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
