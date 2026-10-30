"use client";

/* P.I.C.S Operations — port of VCG_PICS_Operations (4).html. Every edit lives in React state for the
   session only (no Airtable writes yet), as in the original. */
import { useMemo, useState } from "react";
import { FeedItem, PageFooter, SidePanel, TopBar } from "@/components/AppShell";
import { Donut, DonutLegend, SERIES, type DonutDatum } from "@/components/charts";
import { IconCalendar, IconCheck, IconExternal, IconFlag, IconLayers, IconPlus } from "@/components/icons";
import { Avatar, CardHead, useToast } from "@/components/ui";
import {
  PICS_TYPES,
  RECORD_TYPES,
  STAGES,
  STAGE_COLOR,
  VISIBLE_TILE_COUNT,
  phaseCount,
  relationship,
  relationshipChip,
  todayISO,
} from "@/lib/pics";
import { PICS_SEED } from "@/lib/pics-records";
import { MASTER_REPORTS_SEED } from "@/lib/pics-reports-data";
import { EMPTY_CHAT, advanceReportChat, startNewReportChat } from "@/lib/pics-reports";
import { ensureBauPicsRecord, resyncTaskPlanning, seedTaskPlanningFromExistingRoadmaps, syncRoadmapRowToTaskPlanning } from "@/lib/pics-sync";
import type { PicsReport, ReportChatState, TaskPlanningEntry } from "@/lib/pics-types";
import type { ChecklistItem, PicsRecord, RoadmapRow } from "@/lib/types";
import { cx, fmt, fmtDT, pctElapsed } from "@/lib/utils";
import { PicsCalendar } from "./PicsCalendar";
import { AddChecklistModal, AddRoadmapModal, EditChecklistModal, NewPicsModal } from "./PicsForms";
import { NewReportModal, ReportDetailModal, ReportsView } from "./PicsReports";
import { RecordDetail, type DetailHandlers } from "./RecordDetail";
import { ReportBuildChat } from "./ReportBuildChat";
import { SAVED_TOAST, StagePill, TypeBadge } from "./pics-ui";

type View = "board" | "reporting";
type Dialog =
  | { kind: "newPics" }
  | { kind: "addRoadmap"; recId: string }
  | { kind: "addChecklist"; recId: string }
  | { kind: "editChecklist"; recId: string; idx: number }
  | { kind: "newReport" }
  | { kind: "report"; id: string };

function initialData() {
  return seedTaskPlanningFromExistingRoadmaps(ensureBauPicsRecord(structuredClone(PICS_SEED)));
}

export function PicsOperations({ initialOpenId }: { initialOpenId?: string | null }) {
  const toast = useToast();
  const [init] = useState(initialData);
  const [records, setRecords] = useState<PicsRecord[]>(init.records);
  const [taskPlanning, setTaskPlanning] = useState<TaskPlanningEntry[]>(init.taskPlanning);
  const [reports, setReports] = useState<PicsReport[]>(() => structuredClone(MASTER_REPORTS_SEED));

  const [view, setView] = useState<View>("board");
  const [type, setType] = useState<(typeof PICS_TYPES)[number]>("Project");
  const [stage, setStage] = useState<string | null>(null);
  const [tilesExpanded, setTilesExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [reportFilter, setReportFilter] = useState("All");
  // Deep link: /pics?open=<picsId> opens that record's detail modal on load (openFromDeepLink).
  const [openId, setOpenId] = useState<string | null>(() =>
    initialOpenId && init.records.some((r) => r.id === initialOpenId) ? initialOpenId : null,
  );
  const [dialog, setDialog] = useState<Dialog | null>(null);
  // Collapse state for phase / month / review / checklist groups, keyed "recId::groupKey" (collapsed by default).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [checklistPages, setChecklistPages] = useState<Record<string, number>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ReportChatState>(EMPTY_CHAT);

  const byId = useMemo(() => Object.fromEntries(records.map((r) => [r.id, r])), [records]);
  const tpIds = useMemo(() => new Set(taskPlanning.map((e) => e.id)), [taskPlanning]);

  const updateRecord = (id: string, fn: (r: PicsRecord) => void) =>
    setRecords((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const copy = structuredClone(r);
        fn(copy);
        return copy;
      }),
    );

  /* ---------- record mutations ---------- */
  const createRecord = (rec: PicsRecord) => {
    setRecords((rs) => [
      ...rs.map((p) => (rec.parentId && p.id === rec.parentId ? { ...p, childIds: [...(p.childIds ?? []), rec.id] } : p)),
      rec,
    ]);
    setType(rec.type);
    setStage(null);
    setDialog(null);
  };
  const addRoadmapRow = (recId: string, row: RoadmapRow) => {
    const r = byId[recId];
    if (!r) return;
    const s = syncRoadmapRowToTaskPlanning(r, row);
    updateRecord(recId, (d) => void d.roadmapRows.push(s.row));
    setTaskPlanning((tp) => [...tp, s.entry]);
    setDialog(null);
  };
  const updateRoadmapRow = (recId: string, idx: number, row: RoadmapRow) => {
    const r = byId[recId];
    if (!r) return;
    updateRecord(recId, (d) => void (d.roadmapRows[idx] = row));
    setTaskPlanning((tp) => resyncTaskPlanning(tp, r, row));
  };
  const addChecklistItem = (recId: string, c: ChecklistItem) => {
    updateRecord(recId, (d) => void d.checklist.push(c));
    setDialog(null);
  };
  const saveChecklistItem = (recId: string, idx: number, c: ChecklistItem) => {
    updateRecord(recId, (d) => void (d.checklist[idx] = c));
    setDialog(null);
  };

  /* ---------- reports + Report Build Assistant ---------- */
  const openChat = () => {
    setChatOpen(true);
    if (!chat.started) setChat(startNewReportChat());
  };
  const sendChat = (text: string) => {
    const { state, effect } = advanceReportChat(chat, text, {
      reports,
      today: todayISO(),
      newId: () => `r_chat_${Date.now()}`,
    });
    setChat(state);
    if (effect?.kind === "launch") {
      setReports((rs) => [...rs, effect.report]);
      toast("Report launched from the AI chat (session only — not yet synced to Airtable)");
    } else if (effect?.kind === "appendNote") {
      setReports((rs) =>
        rs.map((r) => (r.id === effect.reportId ? { ...r, reportRequest: (r.reportRequest ? r.reportRequest + " " : "") + effect.text } : r)),
      );
    }
  };

  /* ---------- filtering ---------- */
  const q = query.trim().toLowerCase();
  const matches = (r: PicsRecord) =>
    !q || [r.name, r.type, r.stage, ...r.depts, ...r.leads.map((l) => l.i)].some((v) => v.toLowerCase().includes(q));
  const list = records.filter((r) => (type === "All" || r.type === type) && (!stage || r.stage === stage) && matches(r));

  const typeMix: DonutDatum[] = RECORD_TYPES.map((t, i) => ({
    key: t,
    label: t,
    value: records.filter((r) => r.type === t).length,
    color: SERIES[i],
  }));

  const tiles = [{ key: null as string | null, label: "Active P.I.C.S", count: records.length }].concat(
    STAGES.map((s) => ({ key: s, label: s, count: records.filter((r) => r.stage === s).length })),
  );
  const hiddenTiles = tiles.length - VISIBLE_TILE_COUNT;
  const shownTiles = tilesExpanded ? tiles : tiles.slice(0, VISIBLE_TILE_COUNT);

  const today = todayISO();
  const upcomingAll = records
    .flatMap((r) => (r.meetings ?? []).map((m) => ({ ...m, parent: r.name })))
    .filter((m) => m.date.slice(0, 10) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const checklistOpen = records.reduce((s, r) => s + r.checklist.filter((c) => !c.done).length, 0);
  const overdue = records.reduce((s, r) => s + r.checklist.filter((c) => c.status === "overdue").length, 0);
  const recentReports = [...reports].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  /* ---------- detail modal wiring ---------- */
  const open = openId ? byId[openId] : undefined;
  const handlers: DetailHandlers | null = open
    ? {
        isOpen: (k) => !!openGroups[`${open.id}::${k}`],
        toggle: (k) => setOpenGroups((g) => ({ ...g, [`${open.id}::${k}`]: !g[`${open.id}::${k}`] })),
        checklistPage: checklistPages[open.id] ?? 0,
        setChecklistPage: (p) => setChecklistPages((m) => ({ ...m, [open.id]: p })),
        isSynced: (row) => !!row.tpId && tpIds.has(row.tpId),
        onAddRoadmap: () => setDialog({ kind: "addRoadmap", recId: open.id }),
        onAddChecklist: () => setDialog({ kind: "addChecklist", recId: open.id }),
        onEditChecklist: (idx) => setDialog({ kind: "editChecklist", recId: open.id, idx }),
        onUpdateRoadmapRow: (idx, row) => updateRoadmapRow(open.id, idx, row),
        onSaveActivity: (ri, ai, label, status) => {
          updateRecord(open.id, (d) => {
            const acts = d.reviewRounds?.[ri]?.activities;
            if (acts?.[ai]) acts[ai] = { label, status };
          });
          toast(SAVED_TOAST);
        },
      }
    : null;

  const dlgRec = dialog && "recId" in dialog ? byId[dialog.recId] : undefined;
  const dlgReport = dialog?.kind === "report" ? reports.find((r) => r.id === dialog.id) : undefined;

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="min-w-0 flex-1">
        <TopBar
          title="P.I.C.S Operations"
          search={view === "board" ? "Search P.I.C.S…" : "Search reports…"}
          query={query}
          onQuery={setQuery}
        />

        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8">
          {/* Main view tabs (renderMainTabs / setMainView) */}
          <div className="seg" role="group" aria-label="View">
            {(
              [
                ["board", "P.I.C.S"],
                ["reporting", "Reports"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
                {l}
              </button>
            ))}
          </div>

          {view === "board" ? (
            <>
              {/* Overview row */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                <section className="card p-6">
                  <CardHead
                    icon={<IconLayers width={20} height={20} />}
                    title="P.I.C.S Mix"
                    sub="Active records by type — Projects, Initiatives, Campaigns, Sprints, BAU and Milestones."
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

                  {/* Stage tiles (renderStatTiles / toggleStage / toggleTiles) */}
                  <section className="card flex-1 p-6">
                    <CardHead
                      title="Stages"
                      sub="Click a stage to filter the records below; “Active P.I.C.S” clears it. Colors match the Stage field in Airtable."
                    />
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                      {shownTiles.map((t) => {
                        const c = t.key ? STAGE_COLOR[t.key] : "#15171c";
                        const selected = stage === t.key;
                        return (
                          <button
                            key={t.label}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setStage(t.key === null ? null : stage === t.key ? null : t.key)}
                            className={cx(
                              "flex min-w-0 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                              selected ? "border-brand bg-brand-soft" : "border-line hover:border-line-2 hover:bg-plane",
                            )}
                          >
                            <span
                              className="grid size-9 shrink-0 place-items-center rounded-xl text-[14px] font-extrabold text-white"
                              style={{ background: c }}
                            >
                              {t.count}
                            </span>
                            <span className="text-[12px] font-semibold leading-tight text-ink">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {hiddenTiles > 0 && (
                      <button
                        type="button"
                        aria-expanded={tilesExpanded}
                        onClick={() => setTilesExpanded((v) => !v)}
                        className="mt-4 text-[12px] font-bold text-brand hover:underline"
                      >
                        {tilesExpanded ? "Show fewer stages" : `Show all stages (+${hiddenTiles})`}
                      </button>
                    )}
                  </section>
                </div>
              </div>

              {/* Records (renderFilterTabs / renderGrid) */}
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
                  <button type="button" className="btn btn-brand btn-sm" onClick={() => setDialog({ kind: "newPics" })}>
                    <IconPlus width={14} height={14} /> New P.I.C.S
                  </button>
                </div>
                <div className="mb-4 max-w-full">
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
                      <RecordCard key={r.id} r={r} rel={relationshipChip(r, byId)} onOpen={() => setOpenId(r.id)} />
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

              <PicsCalendar records={records} onEditChecklist={(recId, idx) => setDialog({ kind: "editChecklist", recId, idx })} />
            </>
          ) : (
            <ReportsView
              reports={reports}
              byId={byId}
              filter={reportFilter}
              setFilter={setReportFilter}
              query={query}
              onOpen={(id) => setDialog({ kind: "report", id })}
              onNew={() => setDialog({ kind: "newReport" })}
              onLaunchChat={openChat}
            />
          )}

          <PageFooter meta="VCG Intranet — Master Design System · P.I.C.S base snapshot · edits are session-only" />
        </div>
      </main>

      {view === "board" ? (
        <SidePanel title="Operations" feedTitle="Upcoming meetings">
          {upcomingAll.length ? (
            upcomingAll.slice(0, 5).map((m, i) => (
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
      ) : (
        <SidePanel title="Operations" feedTitle="Latest reports">
          {recentReports.map((r) => (
            <FeedItem
              key={r.id}
              initials={r.preparedBy.slice(0, 4)}
              name={r.title}
              text={`${r.reportType} · ${r.status} · ${fmt(r.date)}`}
              onClick={() => setDialog({ kind: "report", id: r.id })}
            />
          ))}
        </SidePanel>
      )}

      {open && handlers && (
        <RecordDetail record={open} relationship={relationship(open, byId)} onClose={() => setOpenId(null)} h={handlers} />
      )}

      {dialog?.kind === "newPics" && <NewPicsModal records={records} onClose={() => setDialog(null)} onCreate={createRecord} />}
      {dialog?.kind === "addRoadmap" && dlgRec && (
        <AddRoadmapModal record={dlgRec} onClose={() => setDialog(null)} onAdd={(row) => addRoadmapRow(dlgRec.id, row)} />
      )}
      {dialog?.kind === "addChecklist" && dlgRec && (
        <AddChecklistModal record={dlgRec} onClose={() => setDialog(null)} onAdd={(c) => addChecklistItem(dlgRec.id, c)} />
      )}
      {dialog?.kind === "editChecklist" && dlgRec && dlgRec.checklist[dialog.idx] && (
        <EditChecklistModal
          key={`${dlgRec.id}-${dialog.idx}`}
          record={dlgRec}
          idx={dialog.idx}
          onClose={() => setDialog(null)}
          onSave={(c) => saveChecklistItem(dlgRec.id, dialog.idx, c)}
        />
      )}
      {dialog?.kind === "newReport" && (
        <NewReportModal
          records={records}
          onClose={() => setDialog(null)}
          onCreate={(r) => {
            setReports((rs) => [...rs, r]);
            setDialog(null);
          }}
        />
      )}
      {dlgReport && (
        <ReportDetailModal report={dlgReport} pics={dlgReport.picsId ? byId[dlgReport.picsId] : undefined} onClose={() => setDialog(null)} />
      )}

      <ReportBuildChat
        open={chatOpen}
        state={chat}
        onToggle={() => (chatOpen ? setChatOpen(false) : openChat())}
        onClose={() => setChatOpen(false)}
        onRestart={() => {
          setChat(startNewReportChat());
          setChatOpen(true);
        }}
        onSend={sendChat}
      />
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

function SummaryTile({ label, value, chip, tone }: { label: string; value: number; chip: string; tone: "brand" | "bad" | "good" }) {
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
  const pct = pctElapsed(r.start, r.end, new Date(todayISO()).getTime());
  const counts = [
    { Icon: IconFlag, n: r.roadmapRows.length, l: "Tasks" },
    { Icon: IconCheck, n: r.checklist.length, l: "Checklist" },
    { Icon: IconCalendar, n: r.meetingCount, l: "Meetings" },
    { Icon: IconLayers, n: phaseCount(r), l: "Phases" },
  ];
  return (
    <article className="card group flex min-w-0 flex-col p-5 transition hover:-translate-y-0.5">
      {rel && <div className="mb-2 text-[11.5px] font-semibold text-violet">{rel}</div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TypeBadge type={r.type} />
        <StagePill stage={r.stage} />
      </div>
      <h3 className="mt-3 text-[16px] font-extrabold leading-snug">{r.name}</h3>
      <div className="mt-1 text-[11.5px] font-medium text-muted">
        {fmt(r.start)} → {fmt(r.end)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {r.depts.map((d) => (
          <span key={d} className="chip">
            {d}
          </span>
        ))}
      </div>

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

      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <div className="flex -space-x-2">
          {r.leads.map((l, i) => (
            <Avatar key={`${l.i}-${i}`} initials={l.i} size={32} className="rounded-full ring-2 ring-white" />
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {r.liveSiteUrl && (
            <a href={r.liveSiteUrl} target="_blank" rel="noopener" className="btn btn-sm">
              Live site <IconExternal width={13} height={13} />
            </a>
          )}
          <button type="button" onClick={onOpen} className="btn btn-dark btn-sm">
            Open
          </button>
        </div>
      </div>
    </article>
  );
}
