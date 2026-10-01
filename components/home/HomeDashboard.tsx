"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FeedItem, PageFooter, SidePanel, TopBar, AIRTABLE_BASE_URL } from "@/components/AppShell";
import { Donut, GroupedBars, PAIR, StatTile, type DonutDatum } from "@/components/charts";
import { IconCalendar, IconExternal, IconFlag, IconLayers, IconPie, IconPlay, IconUsers, IconVideo } from "@/components/icons";
import { Avatar, CardHead } from "@/components/ui";
import { PICS_SEED } from "@/lib/pics-records";
import { PHASE_ORDER, TYPE_TONE } from "@/lib/pics";
import { ACTIVE_MEMBERS, CHECKLISTS, SCHEDULES, TASKS_THIS_MONTH } from "@/lib/productivity-data";
import { cx, fmt, fmtDT, plural } from "@/lib/utils";

const BUILD = PICS_SEED.find((r) => r.id === "p2")!;

const TYPE_CARDS = [
  { type: "Project", Icon: IconLayers, blurb: "Multi-phase builds" },
  { type: "Initiative", Icon: IconFlag, blurb: "Strategic pushes" },
  { type: "Campaign", Icon: IconUsers, blurb: "Outreach & marketing" },
  { type: "Sprint", Icon: IconPie, blurb: "Time-boxed delivery" },
] as const;

export function HomeDashboard() {
  const rows = BUILD.roadmapRows;
  const done = rows.filter((r) => r.status === "Completed").length;
  const active = rows.filter((r) => r.status === "In Progress" || r.status === "In Review" || r.status === "At Risk").length;
  const pct = Math.round((done / rows.length) * 100);
  const progress: DonutDatum[] = [
    { key: "done", label: "Completed", value: done, color: "#2f3335" },
    { key: "active", label: "In progress / at risk", value: active, color: "#9b4dca" },
    { key: "open", label: "Not started", value: rows.length - done - active, color: "#d4d3f3" },
  ];

  const phases = PHASE_ORDER.filter((p) => rows.some((r) => r.phase === p));
  const byPhase = phases.map((p) => {
    const ph = rows.filter((r) => r.phase === p);
    const d = ph.filter((r) => r.status === "Completed").length;
    return { key: p, label: p, values: [d, ph.length - d] };
  });

  const now = new Date().toISOString();
  const meetings = PICS_SEED.flatMap((r) => (r.meetings ?? []).map((m) => ({ ...m, parent: r.name })))
    .filter((m) => m.date.length > 10 && m.date >= now.slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date));
  const [nowMeeting, nextMeeting] = meetings;
  const review = BUILD.reviewRounds?.[0];

  const submitted = CHECKLISTS.filter((c) => c.submitted).length;

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      {/* Left column */}
      <div className="order-2 w-full shrink-0 space-y-6 bg-plane px-5 py-8 sm:px-8 lg:order-none xl:w-[380px]">
        <section className="card p-6">
          <CardHead
            icon={<IconLayers width={20} height={20} />}
            title="MVP Build Progress"
            sub="ACRYLICS MVP Build roadmap — sprints, tasks, milestones and meetings."
          />
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
            {progress.map((p) => (
              <span key={p.key} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
                <span className="h-2.5 w-5 rounded-full" style={{ background: p.color }} />
                {p.label}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <Donut data={progress} size={210} thickness={44} centerValue={`${pct}%`} centerLabel={`${done} of ${rows.length} done`} />
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar initials="ID" size={46} />
              <div className="leading-tight">
                <div className="text-[15px] font-semibold">Isis Darks</div>
                <div className="text-[11.5px] text-muted">Project lead</div>
              </div>
            </div>
            <Link href="/pics" className="btn btn-dark">
              Roadmap
            </Link>
          </div>
        </section>

        <StatTile
          label="Tasks due this month"
          value={TASKS_THIS_MONTH.total}
          delta={`${TASKS_THIS_MONTH.byStatus["Completed"]} completed`}
          tone="good"
        />
        <StatTile label="Active P.I.C.S" value={PICS_SEED.length} delta={`${BUILD.checklist.length} checklist items`} tone="brand" />
      </div>

      {/* Center column */}
      <main className="order-1 min-w-0 flex-1 lg:order-none">
        <TopBar title="Home" />
        <div className="space-y-10 px-5 pb-10 pt-6 sm:px-8">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[22px] font-medium tracking-tight">This Week</h2>
              <div className="flex gap-3">
                <Link href="/productivity" className="btn h-11 px-6 shadow-card">
                  Productivity
                </Link>
                <a href={AIRTABLE_BASE_URL} target="_blank" rel="noopener" className="btn h-11 px-6 shadow-card">
                  + Open Airtable
                </a>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <MediaCard caption="Up next">
                {nowMeeting ? (
                  <div className="flex items-center gap-4">
                    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#ffe7c2] text-[#b4461a]">
                      <IconVideo width={28} height={28} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold">{nowMeeting.label}</div>
                      <div className="mt-1 truncate text-[11px] text-muted">{fmtDT(nowMeeting.date)}</div>
                    </div>
                    {nowMeeting.link && (
                      <a
                        href={nowMeeting.link}
                        target="_blank"
                        rel="noopener"
                        aria-label="Join meeting"
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-plane hover:bg-lav"
                      >
                        <IconPlay width={14} height={14} />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-[12.5px] text-muted">No upcoming meetings.</div>
                )}
              </MediaCard>
              <MediaCard caption="Next">
                <div className="flex flex-col items-center text-center">
                  <span className="grid size-10 place-items-center rounded-full bg-plane">
                    <IconCalendar width={18} height={18} />
                  </span>
                  <div className="mt-2 line-clamp-2 text-[12px] font-semibold">{nextMeeting ? nextMeeting.label : "—"}</div>
                  <div className="text-[10.5px] text-muted">{nextMeeting ? fmt(nextMeeting.date) : ""}</div>
                </div>
              </MediaCard>
              <MediaCard caption="Review">
                {review ? (
                  <a href={review.reviewUrl} target="_blank" rel="noopener" className="flex flex-col items-center text-center">
                    <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-[#eb6834] via-[#9b4dca] to-[#2a78d6] text-white">
                      <IconExternal width={18} height={18} />
                    </span>
                    <div className="mt-2 line-clamp-2 text-[12px] font-semibold">{review.name}</div>
                    <div className="text-[10.5px] text-muted">Due {fmt(review.due)}</div>
                  </a>
                ) : (
                  <span className="text-[12px] text-muted">No review open</span>
                )}
              </MediaCard>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-medium tracking-tight">P.I.C.S by Type</h2>
            <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {TYPE_CARDS.map(({ type, Icon, blurb }) => {
                const n = PICS_SEED.filter((r) => r.type === type).length;
                return (
                  <Link
                    key={type}
                    href="/pics"
                    className="card group flex flex-col items-center px-4 pb-5 pt-6 text-center transition hover:-translate-y-1"
                  >
                    <span className={cx("grid size-20 place-items-center rounded-[26px] transition group-hover:scale-105", TYPE_TONE[type])}>
                      <Icon width={34} height={34} strokeWidth={1.6} />
                    </span>
                    <span className="mt-4 text-[15px] font-semibold">{type}s</span>
                    <span className="mt-0.5 text-[11.5px] text-muted">
                      {plural(n, "record")} · {blurb}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="card p-6">
            <CardHead
              title="Roadmap Status by Phase"
              sub="ACRYLICS MVP Build — roadmap items completed vs. still open in each phase."
            />
            <div className="mt-5">
              <GroupedBars groups={byPhase} series={["Completed", "Open"]} colors={[PAIR[0], PAIR[1]]} />
            </div>
          </section>

          <PageFooter meta="VCG Intranet — snapshot of the Airtable Intranet base" />
        </div>
      </main>

      <SidePanel title="Team" feedTitle="Active roster · Week 39" footnote={`${submitted} of ${CHECKLISTS.length} checklists submitted · snapshot`}>
        {ACTIVE_MEMBERS.map((m) => {
          const sch = SCHEDULES.find((s) => s.memberId === m.id);
          const first = sch?.tasks[0];
          return (
            <FeedItem
              key={m.id}
              initials={m.initials}
              name={m.name}
              text={first ? first.label : `${m.role} · no tasks on this week's schedule`}
              badge={sch?.tasks.length || undefined}
              online={!!sch?.hours}
            />
          );
        })}
      </SidePanel>
    </div>
  );
}

function MediaCard({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="card flex h-[124px] items-center p-5">
        <div className="w-full">{children}</div>
      </div>
      <div className="mt-3 text-center text-[11.5px] font-semibold text-ink-2">{caption}</div>
    </div>
  );
}
