"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Donut, DonutLegend, GroupedBars, HEAT, PAIR, SERIES, type DonutDatum } from "@/components/charts";
import { IconChevron, IconChevronLeft, IconPie } from "@/components/icons";
import { Avatar, CardHead, Select } from "@/components/ui";
import type { Member } from "@/lib/productivity-types";
import { cx, plural } from "@/lib/utils";
import { useProductivity } from "./context";
import { IconChevronRight } from "./shared";

/** Roster-derived lookups: department filter options, member colors, members per department. */
function useRoster() {
  const { members } = useProductivity();
  return useMemo(() => {
    const depts = [...new Set(members.map((m) => m.dept))].sort();
    return {
      members,
      DEPT_OPTIONS: [{ value: "all", label: "All departments" }, ...depts.map((d) => ({ value: d, label: d }))],
      /* Color follows the member, never their rank — fixed by roster order (7 members, 7 series colors). */
      MEMBER_COLOR: Object.fromEntries(members.map((m, i) => [m.id, SERIES[Math.min(i, SERIES.length - 1)]])) as Record<string, string>,
      membersIn: (dept: string) => (dept === "all" ? members : members.filter((m) => m.dept === dept)),
    };
  }, [members]);
}
const shortName = (n: string) =>
  n
    .split(" ")
    .map((w, i) => (i === 0 ? w : w[0] + "."))
    .join(" ");

type CapTab = "overview" | "heatmap" | "availability";

/** Team Capacity Dashboard — navigable Mon–Fri weeks relative to the dataset's "today" (offset 0 = the current week).
    Every week reads the real records: tasks by Tasks Planning Due Date, meetings by date, and hours from
    that week's Weekly Schedules "Scheduled Hours" (falling back to the member's Weekly Scheduled Hours). */
export function CapacityPanel() {
  const [tab, setTab] = useState<CapTab>("overview");
  const [week, setWeek] = useState(0);
  const { capWeekRangeLabel } = useProductivity();
  const range = capWeekRangeLabel(week);
  return (
    <section className="card p-6">
      <CardHead
        icon={<IconPie width={20} height={20} />}
        eyebrow="Active roster"
        title="Team Capacity Dashboard"
        sub="Task counts & hours, by week."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-sm" disabled={week === 0} onClick={() => setWeek(0)}>
              Today
            </button>
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => setWeek((w) => w - 1)}
              className="grid size-8 place-items-center rounded-full bg-plane text-ink-2 hover:bg-lav"
            >
              <IconChevronLeft width={14} height={14} />
            </button>
            <span className="chip bg-ink text-white" aria-live="polite">
              {range}
            </span>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => setWeek((w) => w + 1)}
              className="grid size-8 place-items-center rounded-full bg-plane text-ink-2 hover:bg-lav"
            >
              <IconChevronRight width={14} height={14} />
            </button>
          </div>
        }
      />
      <div className="seg mt-5" role="group" aria-label="Capacity view">
        {(
          [
            ["overview", "Overview"],
            ["heatmap", "Weekly heatmap"],
            ["availability", "Team availability"],
          ] as const
        ).map(([id, l]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
            {l}
          </button>
        ))}
      </div>
      {/* Mounted together so each sub-tab keeps its department filter and collapsed groups. */}
      <div className="mt-6">
        <div hidden={tab !== "overview"}>
          <Overview week={week} />
        </div>
        <div hidden={tab !== "heatmap"}>
          <LoadHeatmap week={week} />
        </div>
        <div hidden={tab !== "availability"}>
          <Availability week={week} />
        </div>
      </div>
    </section>
  );
}

function Overview({ week }: { week: number }) {
  const [dept, setDept] = useState("all");
  const { tasksByMemberInWeek, capWeekRangeLabel, capWeekDayKeys, schedules } = useProductivity();
  const { members, DEPT_OPTIONS, MEMBER_COLOR, membersIn } = useRoster();
  const counts = tasksByMemberInWeek(week);
  const monday = capWeekDayKeys(week)[0];
  const schedHours = new Map(schedules.filter((x) => x.weekStart === monday && x.hours != null).map((x) => [x.memberId, x.hours!]));
  const hoursOf = (m: Member) => schedHours.get(m.id) ?? m.weeklyHours;
  const dist: DonutDatum[] = membersIn(dept)
    .map((m) => ({ key: m.id, label: m.name, sub: m.dept, value: counts[m.id] ?? 0, color: MEMBER_COLOR[m.id] }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = dist.reduce((s, d) => s + d.value, 0);
  const barMembers = members.filter((m) => (counts[m.id] ?? 0) > 0 || hoursOf(m));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14px] font-extrabold">Task distribution by member</div>
            <div className="text-[12px] text-muted">
              Tasks due {capWeekRangeLabel(week)} · {plural(total, "task")}
            </div>
          </div>
          <Select label="Department" value={dept} onChange={setDept} options={DEPT_OPTIONS} />
        </div>
        {dist.length ? (
          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
            <Donut data={dist} size={200} centerLabel="tasks this week" />
            {dept === "all" ? (
              <div className="space-y-3">
                {[...new Set(dist.map((d) => d.sub!))].map((dp) => (
                  <div key={dp}>
                    <div className="eyebrow mb-1.5">{dp}</div>
                    <DonutLegend data={dist.filter((d) => d.sub === dp)} unit="tasks" total={total} />
                  </div>
                ))}
              </div>
            ) : (
              <DonutLegend data={dist} unit="tasks" />
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No tasks due this week for this department.</div>
        )}
      </div>

      <div className="min-w-0">
        <div className="text-[14px] font-extrabold">Tasks assigned vs. weekly hours</div>
        <div className="mb-4 text-[12px] text-muted">Tasks due that week next to its scheduled hours (Weekly Schedules, else the member&apos;s default weekly hours) — plain counts, no ratio. Hover a pair for exact numbers.</div>
        {barMembers.length ? (
          <GroupedBars
            series={["Tasks due this week", "Weekly hours"]}
            colors={[...PAIR]}
            groups={barMembers.map((m) => {
              const t = counts[m.id] ?? 0;
              const h = hoursOf(m) ?? 0;
              const fromSchedule = schedHours.has(m.id);
              return {
                key: m.id,
                label: shortName(m.name),
                values: [t, h],
                tip: (
                  <>
                    <div className="font-bold">{m.name}</div>
                    <div>{plural(t, "task")} assigned</div>
                    <div>
                      {h}h/week {fromSchedule ? "scheduled (Weekly Schedules)" : "default (Team Members)"}
                    </div>
                  </>
                ),
              };
            })}
          />
        ) : (
          <div className="rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No tasks or hours this week.</div>
        )}
      </div>
    </div>
  );
}

function loadTone(n: number) {
  return n === 0 ? HEAT[0] : n <= 2 ? HEAT[1] : n <= 4 ? HEAT[2] : HEAT[3];
}

function DeptTable({
  week,
  dept,
  setDept,
  title,
  sub,
  colSub,
  cell,
  total,
  memberSub,
  legend,
}: {
  week: number;
  dept: string;
  setDept: (v: string) => void;
  title: string;
  sub: string;
  colSub: (i: number) => string;
  cell: (m: Member, i: number) => ReactNode;
  total: (m: Member) => number;
  memberSub: (m: Member) => string;
  legend: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const { capWeekLabels, capWeekRangeLabel } = useProductivity();
  const { DEPT_OPTIONS, membersIn } = useRoster();
  const labels = capWeekLabels(week);
  const members = membersIn(dept);
  const groups = [...new Set(members.map((m) => m.dept))].sort().map((d) => ({ d, ms: members.filter((m) => m.dept === d) }));
  const toggle = (d: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-extrabold">
            {title} — {capWeekRangeLabel(week)}
          </div>
          <div className="text-[12px] text-muted">{sub}</div>
        </div>
        <Select label="Department" value={dept} onChange={setDept} options={DEPT_OPTIONS} />
      </div>
      <div className="scroll-thin mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="w-[200px]" />
              {labels.map((l, i) => (
                <th key={i} className="text-center">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider">{l}</div>
                  <div className="text-[10.5px] font-medium text-muted">{colSub(i)}</div>
                </th>
              ))}
              <th className="text-center">
                <div className="text-[11px] font-extrabold uppercase tracking-wider">Week</div>
                <div className="text-[10.5px] font-medium text-muted">Total</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ d, ms }) => (
              <DeptRows
                key={d}
                dept={d}
                count={ms.length}
                open={!collapsed.has(d)}
                onToggle={() => toggle(d)}
                rows={ms.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={m.initials} size={34} />
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] font-bold">{m.name}</div>
                          <div className="text-[11px] text-muted">{memberSub(m)}</div>
                        </div>
                      </div>
                    </td>
                    {labels.map((_, i) => (
                      <td key={i}>{cell(m, i)}</td>
                    ))}
                    <td className="text-center text-[15px] font-extrabold tabular-nums">{total(m)}</td>
                  </tr>
                ))}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-ink-2">{legend}</div>
    </div>
  );
}

function DeptRows({ dept, count, open, onToggle, rows }: { dept: string; count: number; open: boolean; onToggle: () => void; rows: ReactNode[] }) {
  return (
    <>
      <tr>
        <td colSpan={7}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex w-full items-center gap-2 rounded-xl bg-plane px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wider"
          >
            <IconChevron width={14} height={14} className={cx("transition-transform", !open && "-rotate-90")} />
            {dept}
            <span className="font-semibold normal-case tracking-normal text-muted">{plural(count, "member")}</span>
          </button>
        </td>
      </tr>
      {open && rows}
    </>
  );
}

function LoadHeatmap({ week }: { week: number }) {
  const [dept, setDept] = useState("all");
  const { dailyLoadInWeek, capWeekSublabels, capWeekLabels } = useProductivity();
  const loads = dailyLoadInWeek(week);
  const sublabels = capWeekSublabels(week);
  const labels = capWeekLabels(week);
  const sum = (m: Member) => (loads[m.id] ?? []).reduce((a, b) => a + b, 0);
  return (
    <DeptTable
      week={week}
      dept={dept}
      setDept={setDept}
      title="Weekly load heatmap"
      sub="Each cell is a plain count of tasks due plus meetings that day — no formula. Grouped by department."
      colSub={(i) => sublabels[i]}
      memberSub={(m) => (sum(m) ? `${sum(m)} this week` : "Nothing due")}
      total={sum}
      cell={(m, i) => {
        const n = (loads[m.id] ?? [0, 0, 0, 0, 0])[i];
        const t = loadTone(n);
        return (
          <div
            className="grid h-12 place-items-center rounded-xl text-[14px] font-extrabold tabular-nums"
            style={{ background: t.bg, color: t.fg }}
            title={`${m.name} · ${labels[i]} ${sublabels[i]}: ${n}`}
          >
            {n || "–"}
          </div>
        );
      }}
      legend={
        <>
          <span>Load:</span>
          {(
            [
              ["0", HEAT[0]],
              ["1–2", HEAT[1]],
              ["3–4", HEAT[2]],
              ["5+", HEAT[3]],
            ] as const
          ).map(([l, t]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="size-3 rounded" style={{ background: t.bg }} />
              {l}
            </span>
          ))}
        </>
      }
    />
  );
}

const availTone = (h: number) => (h <= 0 ? HEAT[0] : h <= 4 ? HEAT[1] : h <= 8 ? HEAT[2] : HEAT[3]);

function Availability({ week }: { week: number }) {
  const [dept, setDept] = useState("all");
  const { availability, availabilitySet } = useProductivity();
  const hoursOf = (m: Member) => availability[m.id] ?? [];
  const sum = (m: Member) => Math.round(hoursOf(m).reduce<number>((a, b) => a + (b ?? 0), 0) * 10) / 10;
  return (
    <div>
      <DeptTable
        week={week}
        dept={dept}
        setDept={setDept}
        title="Team availability"
        sub="Each cell is that person's recurring Monday–Friday hours (EST) from the Team Availability table."
        colSub={() => "Recurring"}
        memberSub={(m) => (sum(m) ? `${sum(m)}h/week available` : "No hours set")}
        total={sum}
        cell={(m, i) => {
          const h = hoursOf(m)[i];
          if (h == null)
            return (
              <div className="grid h-12 place-items-center rounded-xl border border-dashed border-line-2 text-[10.5px] font-semibold text-muted">No hours set</div>
            );
          const t = availTone(h);
          return (
            <div className="grid h-12 place-items-center rounded-xl text-[14px] font-extrabold tabular-nums" style={{ background: t.bg, color: t.fg }}>
              {h}h
            </div>
          );
        }}
        legend={
          <>
            <span>Availability:</span>
            {(
              [
                ["No hours set", HEAT[0]],
                ["1–4h/day", HEAT[1]],
                ["5–8h/day", HEAT[2]],
                ["9h+/day", HEAT[3]],
              ] as const
            ).map(([l, t]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="size-3 rounded" style={{ background: t.bg }} />
                {l}
              </span>
            ))}
          </>
        }
      />
      {!availabilitySet && (
        <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-[12px] leading-relaxed text-warn">
          No active member has a Start Time / End Time on their Team Availability record in Airtable yet, so every cell reads &quot;No
          hours set&quot;. This mirrors the base as it stands today.
        </p>
      )}
    </div>
  );
}
