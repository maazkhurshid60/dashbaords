"use client";

import { useMemo, useState } from "react";
import { FeedItem, PageFooter, SidePanel, TopBar } from "@/components/AppShell";
import { Donut, DonutLegend, SERIES, type DonutDatum } from "@/components/charts";
import { IconCalendar, IconCheck, IconFlag, IconLayers } from "@/components/icons";
import { Avatar, CardHead } from "@/components/ui";
import { PICS_SEED } from "@/lib/pics-records";
import { PICS_TYPES, STAGES, STAGE_COLOR, TYPE_TONE, phaseCount, relationship } from "@/lib/pics";
import type { PicsRecord } from "@/lib/types";
import { cx, fmt, fmtDT, pctElapsed } from "@/lib/utils";
import { PicsCalendar } from "./PicsCalendar";
import { RecordDetail } from "./RecordDetail";

const VISIBLE_STAGES = 7;

export function PicsOperations() {
  const [records, setRecords] = useState<PicsRecord[]>(() => structuredClone(PICS_SEED));
  const [type, setType] = useState<(typeof PICS_TYPES)[number]>("Project");
  const [stage, setStage] = useState<string | null>(null);
  const [allStages, setAllStages] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const byId = useMemo(() => Object.fromEntries(records.map((r) => [r.id, r])), [records]);
  const updateRecord = (id: string, fn: (r: PicsRecord) => void) =>
    setRecords((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const copy = structuredClone(r);
        fn(copy);
        return copy;
      }),
    );

  const q = query.trim().toLowerCase();
  const matches = (r: PicsRecord) =>
    !q || [r.name, r.type, r.stage, ...r.depts, ...r.leads.map((l) => l.i)].some((v) => v.toLowerCase().includes(q));
  const list = records.filter((r) => (type === "All" || r.type === type) && (!stage || r.stage === stage) && matches(r));

  const typeMix: DonutDatum[] = (["Project", "Initiative", "Campaign", "Sprint"] as const).map((t, i) => ({
    key: t,
    label: t,
    value: records.filter((r) => r.type === t).length,
    color: SERIES[i],
  }));

  const stageCounts = STAGES.map((s) => ({ s, n: records.filter((r) => r.stage === s).length }));
  const shownStages = allStages ? stageCounts : stageCounts.slice(0, VISIBLE_STAGES);

  const todayISO = new Date().toISOString().slice(0, 10);
  const upcomingAll = records
    .flatMap((r) => (r.meetings ?? []).map((m) => ({ ...m, parent: r.name })))
    .filter((m) => m.date.slice(0, 10) >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = upcomingAll.slice(0, 5);

  const checklistOpen = records.reduce((s, r) => s + r.checklist.filter((c) => !c.done).length, 0);
  const overdue = records.reduce((s, r) => s + r.checklist.filter((c) => c.status === "overdue").length, 0);

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="min-w-0 flex-1">
        <TopBar title="P.I.C.S Operations" search="Search P.I.C.S…" query={query} onQuery={setQuery} />

        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8">
          {/* Overview row */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <section className="card p-6">
              <CardHead
                icon={<IconLayers width={20} height={20} />}
                title="P.I.C.S Mix"
                sub="Active records by type — Projects, Initiatives, Campaigns and Sprints."
              />
              <div className="mt-6">
                <Donut data={typeMix} size={190} centerLabel="active P.I.C.S" />
              </div>
              <div className="mt-6">
                <DonutLegend data={typeMix} unit="records" />
              </div>
            </section>

            <div className="flex min-w-0 flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <SummaryTile label="Active P.I.C.S" value={records.length} chip={`${list.length} in view`} tone="brand" />
                <SummaryTile label="Open checklist items" value={checklistOpen} chip={`${overdue} overdue`} tone="bad" />
                <SummaryTile label="Upcoming meetings" value={upcomingAll.length} chip="from today" tone="good" />
              </div>

              <section className="card flex-1 p-6">
                <CardHead
                  title="Stages"
                  sub="Click a stage to filter the records below. Colors match the Stage field in Airtable."
                  right={
                    stage && (
                      <button type="button" className="btn btn-sm" onClick={() => setStage(null)}>
                        Clear filter
                      </button>
                    )
                  }
                />
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                  {shownStages.map(({ s, n }) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={stage === s}
                      onClick={() => setStage(stage === s ? null : s)}
                      className={cx(
                        "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                        stage === s ? "border-brand bg-brand-soft" : "border-line hover:border-line-2 hover:bg-plane",
                      )}
                    >
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-[14px] font-extrabold text-white"
                        style={{ background: STAGE_COLOR[s] }}
                      >
                        {n}
                      </span>
                      <span className="text-[12px] font-semibold leading-tight text-ink">{s}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAllStages((v) => !v)}
                  className="mt-4 text-[12px] font-bold text-brand hover:underline"
                >
                  {allStages ? "Show fewer stages" : `Show all stages (+${STAGES.length - VISIBLE_STAGES})`}
                </button>
              </section>
            </div>
          </div>

          {/* Records */}
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="eyebrow">
                  Active · {type}
                  {stage ? ` · ${stage}` : ""}
                  {q ? ` · “${query.trim()}”` : ""}
                </div>
                <h2 className="mt-1 text-[22px] font-medium tracking-tight">P.I.C.S Records ({list.length})</h2>
              </div>
              <div className="seg" role="group" aria-label="Filter by type">
                {PICS_TYPES.map((t) => (
                  <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {list.length ? (
              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {list.map((r) => (
                  <RecordCard key={r.id} r={r} rel={relationship(r, byId)} onOpen={() => setOpenId(r.id)} />
                ))}
              </div>
            ) : (
              <div className="card p-10 text-center text-[13px] text-muted">
                No active P.I.C.S records match this filter.
                {(q || stage || type !== "All") && (
                  <button
                    type="button"
                    className="btn btn-sm ml-3"
                    onClick={() => {
                      setQuery("");
                      setStage(null);
                      setType("All");
                    }}
                  >
                    Show all
                  </button>
                )}
              </div>
            )}
          </section>

          <PicsCalendar records={records} />

          <PageFooter meta="VCG Intranet — Master Design System · P.I.C.S base snapshot" />
        </div>
      </main>

      <SidePanel title="Operations" feedTitle="Upcoming meetings">
        {upcoming.length ? (
          upcoming.map((m, i) => (
            <FeedItem
              key={i}
              initials={m.facilitator ? initialsOf(m.facilitator) : "MT"}
              name={m.label}
              text={`${fmtDT(m.date)} · ${m.parent}`}
              online={!!m.link}
              onClick={m.link ? () => window.open(m.link, "_blank", "noopener") : undefined}
            />
          ))
        ) : (
          <li className="py-4 text-[12.5px] text-muted">No upcoming meetings.</li>
        )}
      </SidePanel>

      {openId && byId[openId] && (
        <RecordDetail
          record={byId[openId]}
          relationship={relationship(byId[openId], byId)}
          onClose={() => setOpenId(null)}
          onUpdate={(fn) => updateRecord(openId, fn)}
        />
      )}
    </div>
  );
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

function SummaryTile({
  label,
  value,
  chip,
  tone,
}: {
  label: string;
  value: number;
  chip: string;
  tone: "brand" | "bad" | "good";
}) {
  const tones = { brand: "bg-brand-soft text-brand", bad: "bg-bad-soft text-bad", good: "bg-good-soft text-good" };
  return (
    <div className="card p-5">
      <div className="text-[13px] font-bold">{label}</div>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <span className="text-[40px] font-extrabold leading-none tracking-tight">{value}</span>
        <span className={cx("mb-1 rounded-lg px-2 py-1 text-[11px] font-bold", tones[tone])}>{chip}</span>
      </div>
    </div>
  );
}

function RecordCard({ r, rel, onOpen }: { r: PicsRecord; rel: string | null; onOpen: () => void }) {
  const pct = pctElapsed(r.start, r.end, new Date(new Date().toISOString().slice(0, 10)).getTime());
  const counts = [
    { Icon: IconFlag, n: r.roadmapRows.length, l: "Tasks" },
    { Icon: IconCheck, n: r.checklist.length, l: "Checklist" },
    { Icon: IconCalendar, n: r.meetingCount, l: "Meetings" },
    { Icon: IconLayers, n: phaseCount(r), l: "Phases" },
  ];
  return (
    <article className="card group flex flex-col p-5 transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-bold", TYPE_TONE[r.type])}>{r.type}</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-plane px-2.5 py-1 text-[11px] font-bold"
          style={{ color: STAGE_COLOR[r.stage] }}
        >
          <span className="size-1.5 rounded-full" style={{ background: STAGE_COLOR[r.stage] }} />
          {r.stage}
        </span>
      </div>
      <h3 className="mt-3 text-[16px] font-extrabold leading-snug">{r.name}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {r.depts.map((d) => (
          <span key={d} className="chip">
            {d}
          </span>
        ))}
        <span className="text-[11.5px] font-medium text-muted">
          {fmt(r.start)} → {fmt(r.end)}
        </span>
      </div>
      {rel && <div className="mt-2 text-[11.5px] font-semibold text-violet">⤷ {rel}</div>}

      <div className="mt-4">
        <div className="flex justify-between text-[11px] font-semibold text-muted">
          <span>Timeline</span>
          <span className="tabular-nums text-ink-2">{pct}% elapsed</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-plane">
          <div className="h-full rounded-full bg-linear-to-r from-brand to-violet" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {counts.map(({ Icon, n, l }) => (
          <div key={l} className="flex flex-col items-center rounded-2xl bg-plane py-2.5">
            <Icon width={16} height={16} className="text-muted" />
            <span className="mt-1 text-[15px] font-extrabold tabular-nums">{n}</span>
            <span className="text-[10px] font-semibold text-muted">{l}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-5">
        <div className="flex -space-x-2">
          {r.leads.map((l) => (
            <Avatar key={l.i} initials={l.i} size={32} className="rounded-full ring-2 ring-white" />
          ))}
        </div>
        <button type="button" onClick={onOpen} className="btn btn-dark btn-sm">
          Open roadmap
        </button>
      </div>
    </article>
  );
}
