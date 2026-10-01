"use client";

import { useState, type ReactNode } from "react";
import { Donut, DonutLegend, HEAT, SERIES, type DonutDatum } from "@/components/charts";
import { IconChevron, IconPie } from "@/components/icons";
import { Avatar, CardHead, Select } from "@/components/ui";
import { ACTIVE_MEMBERS, DAILY_LOAD, TASKS_BY_MEMBER } from "@/lib/productivity-data";
import type { Member } from "@/lib/types";
import { cx, plural } from "@/lib/utils";

export const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const WEEK_SUBLABELS = ["Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25"];

const DEPTS = [...new Set(ACTIVE_MEMBERS.map((m) => m.dept))].sort();
const DEPT_OPTIONS = [{ value: "all", label: "All departments" }, ...DEPTS.map((d) => ({ value: d, label: d }))];

/* Color follows the member, never their rank — fixed by roster order. */
const MEMBER_COLOR = Object.fromEntries(ACTIVE_MEMBERS.map((m, i) => [m.id, SERIES[i % SERIES.length]]));

const membersIn = (dept: string) => (dept === "all" ? ACTIVE_MEMBERS : ACTIVE_MEMBERS.filter((m) => m.dept === dept));
const shortName = (n: string) =>
  n
    .split(" ")
    .map((w, i) => (i === 0 ? w : w[0] + "."))
    .join(" ");

export function CapacityPanel() {
  const [tab, setTab] = useState<"overview" | "heatmap" | "availability">("overview");
  return (
    <section className="card p-6">
      <CardHead
        icon={<IconPie width={20} height={20} />}
        eyebrow="Active roster · Week 39"
        title="Team Capacity"
        sub="Task counts and scheduled hours for the people currently working."
        right={
          <div className="flex items-center gap-2" title="The snapshot covers Week 39 only — other weeks load once the Airtable sync is live">
            <button type="button" className="btn btn-sm" disabled aria-disabled="true">
              Today
            </button>
            <button type="button" disabled aria-label="Previous week" className="grid size-8 place-items-center rounded-full bg-plane text-muted">
              <IconChevron width={14} height={14} className="rotate-90" />
            </button>
            <span className="chip bg-ink text-white">Sep 21 – Sep 25</span>
            <button type="button" disabled aria-label="Next week" className="grid size-8 place-items-center rounded-full bg-plane text-muted">
              <IconChevron width={14} height={14} className="-rotate-90" />
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
      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "heatmap" && <LoadHeatmap />}
        {tab === "availability" && <Availability />}
      </div>
    </section>
  );
}

function Overview() {
  const [dept, setDept] = useState("all");
  const dist: DonutDatum[] = membersIn(dept)
    .map((m) => ({ key: m.id, label: m.name, sub: m.dept, value: TASKS_BY_MEMBER[m.id] ?? 0, color: MEMBER_COLOR[m.id] }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = dist.reduce((s, d) => s + d.value, 0);

  const tasksMax = Math.max(...ACTIVE_MEMBERS.map((m) => TASKS_BY_MEMBER[m.id] ?? 0));
  const hoursMax = Math.max(...ACTIVE_MEMBERS.map((m) => m.weeklyHours ?? 0));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14px] font-extrabold">Task distribution by member</div>
            <div className="text-[12px] text-muted">Tasks due this month · {total} tasks</div>
          </div>
          <Select label="Department" value={dept} onChange={setDept} options={DEPT_OPTIONS} />
        </div>
        {dist.length ? (
          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
            <Donut data={dist} size={200} centerLabel="tasks this month" />
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
          <div className="mt-6 rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">No tasks for this department.</div>
        )}
      </div>

      {/* Two single-series charts instead of one mixed-unit chart */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        <BarList
          title="Tasks assigned"
          unit="tasks"
          color={SERIES[0]}
          rows={ACTIVE_MEMBERS.map((m) => ({ m, v: TASKS_BY_MEMBER[m.id] ?? 0 }))}
          max={tasksMax}
        />
        <BarList
          title="Weekly hours scheduled"
          unit="h"
          color="#a3a5f5"
          rows={ACTIVE_MEMBERS.map((m) => ({ m, v: m.weeklyHours }))}
          max={hoursMax}
        />
      </div>
    </div>
  );
}

function BarList({
  title,
  unit,
  color,
  rows,
  max,
}: {
  title: string;
  unit: string;
  color: string;
  rows: { m: Member; v: number | null }[];
  max: number;
}) {
  return (
    <div>
      <div className="text-[14px] font-extrabold">{title}</div>
      <ul className="mt-4 space-y-2.5">
        {[...rows]
          .sort((a, b) => (b.v ?? -1) - (a.v ?? -1))
          .map(({ m, v }) => (
            <li key={m.id} className="grid grid-cols-[84px_minmax(0,1fr)_44px] items-center gap-2.5" title={`${m.name}: ${v ?? "not set"}${v != null ? " " + unit : ""}`}>
              <span className="truncate text-[11.5px] font-semibold text-ink-2">{shortName(m.name)}</span>
              <span className="h-3 overflow-hidden rounded-full bg-plane">
                <span className="block h-full rounded-full" style={{ width: `${((v ?? 0) / max) * 100}%`, background: color }} />
              </span>
              <span className="text-right text-[11.5px] font-bold tabular-nums">{v == null ? "—" : `${v}${unit === "h" ? "h" : ""}`}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function loadTone(n: number) {
  return n === 0 ? HEAT[0] : n <= 2 ? HEAT[1] : n <= 4 ? HEAT[2] : HEAT[3];
}

function DeptTable({
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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
          <div className="text-[14px] font-extrabold">{title}</div>
          <div className="text-[12px] text-muted">{sub}</div>
        </div>
        <Select label="Department" value={dept} onChange={setDept} options={DEPT_OPTIONS} />
      </div>
      <div className="scroll-thin mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="w-[200px]" />
              {WEEK_LABELS.map((l, i) => (
                <th key={l} className="text-center">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider">{l}</div>
                  <div className="text-[10.5px] font-medium text-muted">{colSub(i)}</div>
                </th>
              ))}
              <th className="text-center text-[11px] font-extrabold uppercase tracking-wider">Week</th>
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
                    {WEEK_LABELS.map((_, i) => (
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

function DeptRows({
  dept,
  count,
  open,
  onToggle,
  rows,
}: {
  dept: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  rows: ReactNode[];
}) {
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

function LoadHeatmap() {
  const [dept, setDept] = useState("all");
  return (
    <DeptTable
      dept={dept}
      setDept={setDept}
      title="Weekly load heatmap"
      sub="Each cell is a plain count of tasks due plus meetings that day."
      colSub={(i) => WEEK_SUBLABELS[i]}
      memberSub={(m) => {
        const t = (DAILY_LOAD[m.id] ?? []).reduce((a, b) => a + b, 0);
        return t ? `${t} this week` : "Nothing due";
      }}
      total={(m) => (DAILY_LOAD[m.id] ?? []).reduce((a, b) => a + b, 0)}
      cell={(m, i) => {
        const n = (DAILY_LOAD[m.id] ?? [0, 0, 0, 0, 0])[i];
        const t = loadTone(n);
        return (
          <div
            className="grid h-12 place-items-center rounded-xl text-[14px] font-extrabold tabular-nums"
            style={{ background: t.bg, color: t.fg }}
            title={`${m.name} · ${WEEK_LABELS[i]}: ${n}`}
          >
            {n || "–"}
          </div>
        );
      }}
      legend={
        <>
          <span>Load:</span>
          {[
            ["0", HEAT[0]],
            ["1–2", HEAT[1]],
            ["3–4", HEAT[2]],
            ["5+", HEAT[3]],
          ].map(([l, t]) => (
            <span key={l as string} className="flex items-center gap-1.5">
              <span className="size-3 rounded" style={{ background: (t as (typeof HEAT)[number]).bg }} />
              {l as string}
            </span>
          ))}
        </>
      }
    />
  );
}

function Availability() {
  const [dept, setDept] = useState("all");
  return (
    <div>
      <DeptTable
        dept={dept}
        setDept={setDept}
        title="Team availability"
        sub="Recurring Monday–Friday hours (EST) from the Team Availability table."
        colSub={() => "Recurring"}
        memberSub={() => "No hours set"}
        total={() => 0}
        cell={() => (
          <div className="grid h-12 place-items-center rounded-xl border border-dashed border-line-2 text-[10.5px] font-semibold text-muted">
            No hours
          </div>
        )}
        legend={<span>Availability bands: 1–4h · 5–8h · 9h+ per day</span>}
      />
      <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-[12px] leading-relaxed text-warn">
        No active member has a Start Time / End Time on their Team Availability record in Airtable yet, so every cell reads
        &quot;No hours&quot;. This mirrors the base as it stands today.
      </p>
    </div>
  );
}
