"use client";

/* ROADMAP (vRoadmap, hierarchyStrip, roadmapDetail, msGroups) and LAUNCH (vLaunch,
   launchDetail) plus the shared P.I.C.S card helpers (picsCardHtml, clSummaryChips,
   clCards, paged, workRow, viewPicsBtn). */
import Link from "next/link";
import type { ReactNode } from "react";
import { DAY, TODAY } from "@/lib/product-data";
import type { Pics } from "@/lib/product-types";
import { cx } from "@/lib/utils";
import { fmtD, shortPics, STAGE, trunc } from "../format";
import {
  checklistsFor, clStats, clWork, in14, isDone, isLate, isOpenP, matchQ, msGroups, picsTree, roadRows, rowStats, todayIso,
  type Stats, type WorkRow,
} from "../logic";
import { Empty, H5, Item, Kpi, KpiRow, Pill, Prog, pcTone, Seg, Small, Stat, StagePill, StatusPill2, selectCls } from "../primitives";
import { Legend } from "../SuiteCharts";
import { useSuite } from "../useSuite";

/** Deep link into P.I.C.S Operations (the original linked ./VCG_PICS_Operations.html#pics=<id>). */
export const picsLink = (id: string) => `/pics?open=${encodeURIComponent(id)}`;
const daysLeft = (end: string | null | undefined) => (end ? Math.ceil((new Date(end).getTime() - TODAY.getTime()) / DAY) : null);

function PicsCard({ p, st, sel, onPick, unit, extra }: { p: Pics; st: Stats; sel: boolean; onPick: () => void; unit: string; extra?: ReactNode }) {
  const pc = st.total ? Math.round((100 * st.done) / st.total) : 0;
  const days = daysLeft(p.end);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={sel}
      onClick={onPick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick())}
      className={cx("card min-w-0 cursor-pointer p-4 transition hover:-translate-y-0.5", sel && "ring-2 ring-brand")}
    >
      <div className="flex items-center justify-between gap-2">
        <Pill tone="info">{p.type.toUpperCase()}</Pill>
        <Small>{isOpenP(p) ? "Active" : "Closed"}</Small>
      </div>
      <div className="mb-0.5 mt-2.5 text-[14.5px] font-bold">{shortPics(p.name)}</div>
      <Small>
        {fmtD(p.start)} – {fmtD(p.end)}
        {days != null && days >= 0 ? ` · ${days} days left` : ""}
      </Small>
      <div className="mt-3 flex justify-between text-[12px]">
        <span>
          {st.done} of {st.total} {unit} done
        </span>
        <b className={pcTone(pc)}>{pc}%</b>
      </div>
      <Prog pc={pc} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {st.late ? <Pill tone="bad">! {st.late} overdue</Pill> : <Pill tone="good">✓ nothing overdue</Pill>}
        {st.soon > 0 && <Pill>{st.soon} due soon</Pill>}
      </div>
      {extra}
    </div>
  );
}

function ClSummaryChips({ nodeId }: { nodeId: string }) {
  const { D } = useSuite();
  const cls = checklistsFor(D, nodeId);
  if (!cls.length) return null;
  const done = cls.reduce((a, c) => a + c.st.done, 0),
    tot = cls.reduce((a, c) => a + c.st.total, 0),
    late = cls.reduce((a, c) => a + c.st.late, 0);
  return (
    <div className="mt-3 border-t border-dashed border-line-2 pt-2.5">
      <div className="flex justify-between text-[12px]">
        <b>
          ☑ {cls.length} checklist{cls.length > 1 ? "s" : ""}
        </b>
        <span>
          <b className={done === tot ? "text-good" : "text-brand"}>
            {done}/{tot}
          </b>{" "}
          checked
          {late ? (
            <>
              {" · "}
              <b className="text-bad">{late} late</b>
            </>
          ) : null}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {cls.slice(0, 4).map((c) => (
          <Pill key={c.key} className="h-5 text-[10px]">
            {c.phase || "Checklist"} · {trunc(c.name, 26)} {c.st.done}/{c.st.total}
          </Pill>
        ))}
        {cls.length > 4 && <Pill className="h-5 text-[10px]">+{cls.length - 4}</Pill>}
      </div>
    </div>
  );
}

function ClCards({ nodeId }: { nodeId: string }) {
  const { D, act } = useSuite();
  const cls = checklistsFor(D, nodeId);
  if (!cls.length)
    return (
      <>
        <H5>Checklists · P.I.C.S Checklist</H5>
        <Small>No checklist items are linked to this P.I.C.S yet.</Small>
      </>
    );
  return (
    <>
      <H5>Checklists · P.I.C.S Checklist · {cls.length} — click one to view or edit</H5>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cls.map((c) => {
          const pc = c.st.total ? Math.round((100 * c.st.done) / c.st.total) : 0;
          const nxt = c.items.filter((i) => i.status !== "Completed" && i.due).sort((a, b) => (a.due as string).localeCompare(b.due as string))[0];
          const blk = c.items.filter((i) => i.status === "Blocked").length;
          return (
            <button key={c.key} type="button" onClick={() => act.clOpen(c.key)} className="min-w-0 rounded-2xl border border-line bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card">
              <div className="flex items-center justify-between gap-2">
                <Pill tone="info" className="h-5 text-[10px]">
                  {c.phase || "Checklist"}
                </Pill>
                <Small className="truncate">{shortPics(c.pics.name)}</Small>
              </div>
              <div className="mb-0.5 mt-2 text-[13px] font-bold">{c.name}</div>
              <Small>
                {c.st.total} item{c.st.total > 1 ? "s" : ""}
                {nxt ? " · next due " + fmtD(nxt.due) : ""}
              </Small>
              <div className="mt-3 flex justify-between text-[12px]">
                <span>
                  {c.st.done} of {c.st.total} done
                </span>
                <b className={pcTone(pc)}>{pc}%</b>
              </div>
              <Prog pc={pc} />
              <div className="mt-3 flex flex-wrap gap-1">
                {c.st.late ? <Pill tone="bad">! {c.st.late} late</Pill> : <Pill tone="good">✓ on time</Pill>}
                {blk > 0 && <Pill tone="warn">{blk} blocked</Pill>}
                {c.st.soon > 0 && <Pill>{c.st.soon} due soon</Pill>}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** 5 at a time, with Prev / Next */
function Paged({ kind, arr, empty }: { kind: "late" | "soon"; arr: WorkRow[]; empty: string }) {
  const { S, act } = useSuite();
  const per = 5,
    pages = Math.max(1, Math.ceil(arr.length / per));
  const pg = Math.min(S.pg[kind] || 0, pages - 1);
  const slice = arr.slice(pg * per, pg * per + per);
  return (
    <>
      {slice.length ? slice.map((r, i) => <WorkRowView key={pg * per + i} r={r} />) : <Empty>{empty}</Empty>}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-[12px]">
          <span className="text-muted">
            {pg * per + 1}–{Math.min(arr.length, pg * per + per)} of {arr.length}
          </span>
          <span className="flex gap-1.5">
            <button type="button" className="btn btn-sm" disabled={!pg} onClick={() => act.pg(kind, -1)}>
              ‹ Prev
            </button>
            <button type="button" className="btn btn-sm" disabled={pg >= pages - 1} onClick={() => act.pg(kind, 1)}>
              Next ›
            </button>
          </span>
        </div>
      )}
    </>
  );
}
function WorkRowView({ r }: { r: WorkRow }) {
  const { act } = useSuite();
  return (
    <Item d={fmtD(r.date)} dTone={r.date < todayIso && !isDone(r) ? "text-bad" : undefined} right={<StatusPill2 s={r.status} />} onClick={r.ck ? () => act.clOpen(r.ck as string) : undefined}>
      <span className="font-semibold">{r.clean ?? r.label}</span>
      <Small>
        {r.type} · {shortPics(r.pics)}
      </Small>
    </Item>
  );
}
const ViewPicsBtn = ({ id }: { id: string }) => (
  <div className="mt-5 flex justify-end">
    <Link className="btn btn-brand" href={picsLink(id)}>
      View P.I.C.S →
    </Link>
  </div>
);

/* ---------------- ROADMAP ---------------- */
export function RoadmapView() {
  const { D, S, q, app, act } = useSuite();
  const tagged = D.pics.filter((p) => p.tagged !== false);
  const roots = tagged.filter((p) => !p.parentId || !tagged.some((x) => x.id === p.parentId));
  const cards = roots.filter((p) => S.rmAll || isOpenP(p)).filter((p) => matchQ(q, p.name));
  const root = roots.find((p) => p.id === S.pics);
  const nodeP = D.pics.find((p) => p.id === S.picsNode);
  const node = root && (nodeP && picsTree(D, root.id).some((x) => x.id === S.picsNode) ? nodeP : root);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Small>{app.dept} P.I.C.S — pick one to see its progress. Several can run at once.</Small>
        <Seg
          label="Which P.I.C.S"
          value={S.rmAll ? "all" : "active"}
          onChange={(v) => act.rmAll(v === "all")}
          options={[
            { id: "active", label: `Active (${roots.filter(isOpenP).length})` },
            { id: "all", label: `All (${roots.length})` },
          ]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.length ? (
          cards.map((p) => (
            <PicsCard key={p.id} p={p} st={rowStats(roadRows(D, p.id))} sel={S.pics === p.id} onPick={() => act.picsPick(p.id)} unit="roadmap items" extra={<ClSummaryChips nodeId={p.id} />} />
          ))
        ) : (
          <Empty className="sm:col-span-2 xl:col-span-3">
            No {app.dept} P.I.C.S here. Tag a P.I.C.S with the {app.dept} department in Airtable to see it.
          </Empty>
        )}
      </div>
      <div id="suite-detail" className="scroll-mt-6">
        {root && node ? <RoadmapDetail root={root} node={node} /> : <Empty>Select a P.I.C.S card above to see its milestones, overdue items and what&apos;s coming up.</Empty>}
      </div>
    </div>
  );
}

function HierarchyStrip({ root, node }: { root: Pics; node: Pics }) {
  const { D, act } = useSuite();
  const lvl = (p: Pics, d: number): ReactNode[] => [
    <button
      key={p.id}
      type="button"
      aria-pressed={p.id === node.id}
      onClick={() => act.picsNode(p.id)}
      className={cx("flex w-full items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-[12px] font-semibold", p.id === node.id ? "bg-brand-soft text-ink" : "hover:bg-plane")}
      style={{ paddingLeft: 10 + d * 18 }}
    >
      {d > 0 && <span className="text-muted">└</span>}
      <Pill className="h-5 text-[9.5px]">{p.type}</Pill>
      <span className="min-w-0 truncate">{shortPics(p.name)}</span>
    </button>,
    ...D.pics.filter((x) => x.parentId === p.id).flatMap((c) => lvl(c, d + 1)),
  ];
  return (
    <>
      <H5 first>View level · parent to child</H5>
      <div className="grid gap-0.5">{lvl(root, 0)}</div>
    </>
  );
}

function RoadmapDetail({ root, node }: { root: Pics; node: Pics }) {
  const { D, app, act } = useSuite();
  const rows = roadRows(D, node.id);
  const st = rowStats(rows);
  const work = [...rows, ...clWork(D, node.id)].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const late = work.filter(isLate);
  const soon = work.filter((r) => !isDone(r) && r.date >= todayIso && r.date <= in14);
  const ms = rows.filter((r) => r.type === "Milestone");
  const s0 = new Date(node.start || "2026-07-01").getTime(),
    s1 = new Date(node.end || "2026-12-31").getTime(),
    span = Math.max(1, s1 - s0);
  const X = (d: string | Date) => Math.max(0, Math.min(100, (100 * (new Date(d).getTime() - s0)) / span));
  const phases = [...new Set(rows.map((r) => r.phase).filter(Boolean))] as string[];
  const tree = picsTree(D, node.id).map((p) => p.id);
  const reqs =
    app.key !== "product"
      ? []
      : D.features
          .filter((f) => !f.pics && f.status !== "Live")
          .map((f) => ({ f, n: D.feedback.filter((x) => x.feature === f.id).length }))
          .filter((x) => x.n > 0)
          .sort((a, b) => b.n - a.n)
          .slice(0, 4);
  const xToday = X(TODAY);
  return (
    <section className="card min-w-0 p-5" style={{ borderTop: "4px solid #5b2be0" }}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <HierarchyStrip root={root} node={node} />
        </div>
        <div className="min-w-0">
          <Small>
            {node.type} · {fmtD(node.start)} – {fmtD(node.end)}
          </Small>
          <div className="text-[19px] font-extrabold">{shortPics(node.name)}</div>
          <KpiRow className="mt-3">
            <Kpi num={st.total ? Math.round((100 * st.done) / st.total) + "%" : "—"} lbl="Done" explain={`${st.done} of ${st.total} items`} />
            <Kpi num={late.length} lbl="Overdue" explain="roadmap + checklist items" />
            <Kpi num={soon.length} lbl="Coming up" explain="due in the next 2 weeks" />
            <Kpi num={tree.length - 1 || "—"} lbl="Inside it" explain="sprints & sub-projects" />
          </KpiRow>
          {phases.length > 0 && (
            <>
              <H5>Progress by phase</H5>
              <div className="grid gap-2 sm:grid-cols-3">
                {phases.map((ph) => {
                  const pr = rows.filter((r) => r.phase === ph);
                  const d = pr.filter(isDone).length;
                  const pc = Math.round((100 * d) / pr.length);
                  return (
                    <div key={ph} className="rounded-2xl bg-plane px-3 py-2.5">
                      <div className="flex justify-between text-[12px]">
                        <b>{ph}</b>
                        <span className={cx("font-bold", pc === 100 ? "text-good" : pc > 0 ? "text-brand" : "text-muted")}>{pc}%</span>
                      </div>
                      <Prog pc={pc} tone={pc === 100 ? "good" : "brand"} />
                      <Small className="mt-1">
                        {d} of {pr.length} done
                      </Small>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {ms.length ? (
            <>
              <H5>Milestones</H5>
              <div className="scroll-thin overflow-x-auto">
                <div className="relative mx-2 h-28 min-w-[480px]">
                  <div className="absolute inset-x-0 top-12 h-1 rounded-full bg-plane" />
                  <div className="absolute left-0 top-12 h-1 rounded-full bg-brand" style={{ width: `${xToday}%` }} />
                  <div className="absolute top-8 h-9 w-0.5 bg-bad" style={{ left: `${xToday}%` }} title="Today" />
                  {msGroups(ms).map((g, i) => {
                    const ok = g.every(isDone),
                      lt = g.some(isLate);
                    return (
                      <div key={i} className="absolute -translate-x-1/2 text-center" style={{ left: `${X(g[0].date)}%`, top: i % 2 ? 58 : 0 }} title={g.map((m) => m.label).join(" · ")}>
                        {i % 2 === 0 && (
                          <div className="w-28 text-[10.5px] leading-tight">
                            <b className="block truncate">{g.length > 1 ? g.length + " milestones" : trunc(g[0].label, 30)}</b>
                            <span className="text-muted">
                              {fmtD(g[0].date)}
                              {lt ? " · late" : ""}
                            </span>
                          </div>
                        )}
                        <i
                          className={cx("mx-auto my-1 block size-3 rotate-45 rounded-[2px] border-2", ok ? "border-brand bg-brand" : lt ? "border-bad bg-white" : "border-ink-2 bg-white")}
                          style={{ marginTop: i % 2 ? 0 : 4 }}
                        />
                        {i % 2 === 1 && (
                          <div className="w-28 text-[10.5px] leading-tight">
                            <b className="block truncate">{g.length > 1 ? g.length + " milestones" : trunc(g[0].label, 30)}</b>
                            <span className="text-muted">
                              {fmtD(g[0].date)}
                              {lt ? " · late" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <Legend
                items={[
                  { name: "Done", color: "#5b2be0", square: true },
                  { name: "Late", color: "#d03b3b", square: true, outline: true },
                  { name: "Today", color: "#d03b3b" },
                ]}
              />
            </>
          ) : (
            <Small className="mt-4">No milestones set on this P.I.C.S.</Small>
          )}
        </div>
      </div>
      <div className="mt-2 grid gap-6 md:grid-cols-2">
        <div>
          <H5>Overdue · {late.length}</H5>
          <Paged kind="late" arr={late} empty="✓ Nothing overdue" />
        </div>
        <div>
          <H5>Coming up · next 2 weeks · {soon.length}</H5>
          <Paged kind="soon" arr={soon} empty="Nothing due in the next two weeks" />
        </div>
      </div>
      <ClCards nodeId={node.id} />
      {reqs.length > 0 && (
        <>
          <H5>Customer requests not on any roadmap yet</H5>
          {reqs.map((x) => (
            <Item
              key={x.f.id}
              right={
                <button type="button" className="btn btn-sm" onClick={() => act.addRoad(x.f.id)}>
                  Add to {shortPics(node.name)}
                </button>
              }
            >
              <b>{x.f.name}</b>
              <Small>
                {x.n} feedback notes · {STAGE[x.f.status]}
              </Small>
            </Item>
          ))}
        </>
      )}
      <ViewPicsBtn id={node.id} />
    </section>
  );
}

/* ---------------- LAUNCH ---------------- */
export function LaunchView() {
  const { D, S, q, act } = useSuite();
  const allL = D.pics.filter((p) => p.tagged !== false && (p.checklist || []).length);
  const launches = allL
    .filter((p) => S.rmAll || isOpenP(p))
    .filter((p) => matchQ(q, p.name))
    .sort((a, b) => (a.end || "").localeCompare(b.end || ""));
  const sel = launches.find((p) => p.id === S.launchPics);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Small className="max-w-[820px]">
          <b className="text-ink">Launch vs. Roadmap:</b> Roadmap tracks the work week by week. Launch shows each thing going live (a feature test, a dashboard, a
          community initiative, a digital event) and its checklist. Pick a card to see it.
        </Small>
        <Seg
          label="Which launches"
          value={S.rmAll ? "all" : "active"}
          onChange={(v) => act.rmAll(v === "all")}
          options={[
            { id: "active", label: `Active (${allL.filter(isOpenP).length})` },
            { id: "all", label: `All (${allL.length})` },
          ]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {launches.length ? (
          launches.map((p) => (
            <PicsCard
              key={p.id}
              p={p}
              st={clStats(checklistsFor(D, p.id).flatMap((c) => c.items))}
              sel={S.launchPics === p.id}
              onPick={() => act.launchPick(p.id)}
              unit="checks"
              extra={<ClSummaryChips nodeId={p.id} />}
            />
          ))
        ) : (
          <Empty className="sm:col-span-2 xl:col-span-4">No launches with a checklist yet. Add P.I.C.S Checklist items to a Product P.I.C.S to see it here.</Empty>
        )}
      </div>
      <div id="suite-detail" className="scroll-mt-6">
        {sel ? <LaunchDetail p={sel} /> : <Empty>Select a launch card above to see its checklist, what&apos;s overdue and what&apos;s due next.</Empty>}
      </div>
    </div>
  );
}

function LaunchDetail({ p }: { p: Pics }) {
  const { D, has, act } = useSuite();
  const items = checklistsFor(D, p.id).flatMap((c) => c.items);
  const st = clStats(items);
  const dl = daysLeft(p.end);
  const days = dl == null ? null : Math.max(0, dl);
  const gates = D.gates.filter((g) => g.pics === p.id || (!g.pics && /ACRYLICS MVP Build/.test(p.name)));
  const met = gates.filter((g) => g.status === "Met").length;
  const score = Math.round(100 * (gates.length ? (st.total ? st.done / st.total : 0) * 0.6 + (met / gates.length) * 0.4 : st.total ? st.done / st.total : 0));
  const work = clWork(D, p.id).sort((a, b) => a.date.localeCompare(b.date));
  const lateW = work.filter(isLate),
    soonW = work.filter((r) => !isDone(r) && r.date >= todayIso && r.date <= in14);
  const tree = picsTree(D, p.id).map((x) => x.id);
  const feats = D.features.filter((f) => f.pics && tree.includes(f.pics));
  const gtm = D.gtm.filter((g) => g.pics === p.id);
  const notifyOn = has("User Feedback & Insights.Customer Notified");
  return (
    <section className="card min-w-0 p-5" style={{ borderTop: "4px solid #5b2be0" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Small>
            {p.type} · {fmtD(p.start)} – {fmtD(p.end)}
          </Small>
          <div className="text-[19px] font-extrabold">{shortPics(p.name)}</div>
        </div>
        <div className="flex gap-2">
          <div className="grid min-w-20 place-items-center rounded-2xl bg-plane px-4 py-2 text-center">
            <b className="text-[22px] font-extrabold leading-none">{days == null ? "—" : days}</b>
            <span className="text-[11px] text-muted">days left</span>
          </div>
          <div className={cx("grid min-w-20 place-items-center rounded-2xl px-4 py-2 text-center text-white", score >= 80 ? "bg-good" : "bg-brand")}>
            <b className="text-[22px] font-extrabold leading-none">{score}%</b>
            <span className="text-[11px] text-white/80">ready</span>
          </div>
        </div>
      </div>
      <Small className="mt-2">Ready = checklist items done{gates.length ? " (60%) + go/no-go checks met (40%)" : ""}.</Small>
      <KpiRow className="mt-4">
        <Kpi num={`${st.done}/${st.total}`} lbl="Checklist done" />
        <Kpi num={st.late} lbl="Overdue" explain="due date passed" />
        <Kpi num={st.soon} lbl="Coming up" explain="due in the next 2 weeks" />
        <Kpi num={gates.length ? `${met}/${gates.length}` : "—"} lbl="Go/no-go checks met" />
      </KpiRow>
      {gates.length > 0 && (
        <>
          <H5>Go / no-go checks · Launch Criteria</H5>
          {gates.map((g) => {
            const i = D.gates.indexOf(g);
            return (
              <Stat
                key={g.name}
                right={
                  <select aria-label={`${g.name} status`} className={selectCls} value={g.status} onChange={(e) => act.gate(i, e.target.value)}>
                    {["Not Started", "In Progress", "Met"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                }
              >
                <b>{g.name}</b>
                <Small>
                  {g.owner}
                  {g.evidence ? " · " + g.evidence : ""}
                </Small>
              </Stat>
            );
          })}
        </>
      )}
      <ClCards nodeId={p.id} />
      <div className="mt-2 grid gap-6 md:grid-cols-2">
        <div>
          <H5>Overdue · {lateW.length}</H5>
          <Paged kind="late" arr={lateW} empty="✓ Nothing overdue" />
        </div>
        <div>
          <H5>Coming up · next 2 weeks · {soonW.length}</H5>
          <Paged kind="soon" arr={soonW} empty="Nothing due in the next two weeks" />
        </div>
      </div>
      {feats.length > 0 && (
        <>
          <H5>Features in this launch</H5>
          {feats.map((f) => {
            const pend = D.feedback.filter((x) => x.feature === f.id && !x.notified);
            return (
              <Item
                key={f.id}
                right={
                  <>
                    <StagePill s={f.status} />
                    {["Live", "QA"].includes(f.status) ? <Pill tone="good">✓ Ready</Pill> : <Pill tone="warn">! Not ready</Pill>}
                    {notifyOn && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={!(pend.length && f.status === "Live")}
                        title="Drafts a message to the customers who asked — available once it is Live"
                        onClick={() => act.notify(f.id)}
                      >
                        Tell customers
                      </button>
                    )}
                  </>
                }
              >
                <b>{f.name}</b>
                {notifyOn && <Small>{pend.length} customers asked and haven&apos;t heard back</Small>}
              </Item>
            );
          })}
        </>
      )}
      {gtm.length > 0 && (
        <>
          <H5>Marketing for this launch · GTM Launches</H5>
          {gtm.map((g) => (
            <Item key={g.name} d={fmtD(g.date)} right={<StatusPill2 s={g.status} />}>
              <b>{g.name}</b>
              <Small>{g.assets.length ? "Needs: " + g.assets.join(", ") : "No assets listed"}</Small>
            </Item>
          ))}
        </>
      )}
      <ViewPicsBtn id={p.id} />
    </section>
  );
}
