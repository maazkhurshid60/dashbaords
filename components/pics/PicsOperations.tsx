"use client";

/* P.I.C.S Operations — port of VCG_PICS_Operations (4).html. Data comes from app/pics/page.tsx (live
   from Airtable via lib/pics-live.ts, or the bundled snapshot when Airtable can't be read).
   Edits that map to a real Airtable field (stage, new P.I.C.S, checklist items, roadmap rows, review
   activities, new reports) update the UI optimistically and save through /api/pics/*; a failed save is
   reverted and toasted. Everything else (Task Planning mirror, report chat, snapshot mode) is session-only. */
import { useEffect, useMemo, useState } from "react";
import { PageFooter, TopBar } from "@/components/AppShell";
import { DataSourceBadge, type Source } from "@/components/DataSource";
import { Donut, SERIES, type DonutDatum } from "@/components/charts";
import { IconLayers, IconPlus } from "@/components/icons";
import { CardHead, useToast } from "@/components/ui";
import {
  STAGE_COLOR,
  relationship,
  todayISO,
} from "@/lib/pics";
import { picsApi, saveError } from "@/lib/pics-api";
import { EMPTY_CHAT, advanceReportChat, startNewReportChat } from "@/lib/pics-reports";
import { ensureBauPicsRecord, resyncTaskPlanning, seedTaskPlanningFromExistingRoadmaps, syncRoadmapRowToTaskPlanning } from "@/lib/pics-sync";
import type { PicsData, PicsReport, ReportChatState, TaskPlanningEntry } from "@/lib/pics-types";
import type { ChecklistItem, PicsRecord, RoadmapRow } from "@/lib/types";
import { cx, fmt, fmtDT } from "@/lib/utils";
import { PicsCalendar } from "./PicsCalendar";
import { PicsOptionsProvider } from "./PicsOptionsContext";
import { AddChecklistModal, AddRoadmapModal, EditChecklistModal, NewPicsModal } from "./PicsForms";
import { NewReportModal, ReportDetailModal, ReportsView } from "./PicsReports";
import { RecordDetail, type DetailHandlers } from "./RecordDetail";
import { PicsMasterCard } from "@/components/pics-card/PicsMasterCard";
import type { CardPics, CardSource } from "@/lib/pics-card-types";
import { unpackCard, unpackOps, type PackedCard, type PackedOps } from "@/lib/pics-pack";
import { ReportBuildChat } from "./ReportBuildChat";
import { SAVED_TOAST } from "./pics-ui";
import { PICS_TABS, isPicsTab, type PicsTab } from "@/lib/pics-tabs";

const HIDDEN_STAGE = "Execution & Implementation";
type Dialog =
  | { kind: "newPics" }
  | { kind: "addRoadmap"; recId: string }
  | { kind: "addChecklist"; recId: string }
  | { kind: "editChecklist"; recId: string; idx: number }
  | { kind: "newReport" }
  | { kind: "report"; id: string };

/* Live data already has real BAU records (Type = BAU), so the synthetic BAU bucket is only added to the snapshot. */
function initialData(data: PicsData, live: boolean) {
  const recs = structuredClone(data.records);
  return seedTaskPlanningFromExistingRoadmaps(live ? recs : ensureBauPicsRecord(recs));
}

/** Airtable record IDs — only these are written back (snapshot / unsaved records stay local). */
const isAt = (id: string | undefined): id is string => !!id && /^rec[A-Za-z0-9]{14}$/.test(id);
let tmpSeq = 0;
const tmpId = () => `tmp_${Date.now()}_${++tmpSeq}`;


export function PicsOperations({
  initialTab = "overview",
  initialStage = null,
  initialOpenId,
  data: packedData,
  source,
  card: packedCard,
  cardSource,
}: {
  initialTab?: PicsTab;
  initialStage?: string | null;
  initialOpenId?: string | null;
  data: PackedOps;
  source: Source;
  card: PackedCard;
  cardSource: CardSource;
}) {
  // Rebuilt once per server payload (identity matters: a new `data` means a refresh).
  const card = useMemo(() => unpackCard(packedCard), [packedCard]);
  const data = useMemo(() => unpackOps(packedData, card), [packedData, card]);
  const toast = useToast();
  const live = source.live;
  const [init] = useState(() => initialData(data, live));
  const [records, setRecords] = useState<PicsRecord[]>(init.records);
  const [taskPlanning, setTaskPlanning] = useState<TaskPlanningEntry[]>(init.taskPlanning);
  const [reports, setReports] = useState<PicsReport[]>(() => structuredClone(data.reports));
  // Refresh (DataSourceBadge refresh -> router.refresh) hands us new server data: reload it, dropping session-only edits.
  const [loaded, setLoaded] = useState(data);
  if (loaded !== data) {
    const d = initialData(data, live);
    setLoaded(data);
    setRecords(d.records);
    setTaskPlanning(d.taskPlanning);
    setReports(structuredClone(data.reports));
  }

  // Which section ("sub-page") is showing. It lives in the URL (?tab=…&stage=…) so every section has its own link
  // and the back button works; the data and edit state below stay shared, so switching sections never reloads or loses anything.
  const [tab, setTab] = useState<PicsTab>(initialTab);
  // Choice lists: live Airtable select choices / Departments, or the snapshot lists (lib/pics-options.ts).
  const options = data.options;
  const [stage, setStage] = useState<string | null>(initialStage);
  const [query, setQuery] = useState("");
  const [reportFilter, setReportFilter] = useState("All");
  // Deep link: /pics?open=<picsId> opens that record's master card once, when Records first shows (handled by PicsMasterCard).
  const [pendingOpen, setPendingOpen] = useState<string | null>(initialOpenId ?? null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  // Collapse state for phase / month / review / checklist groups, keyed "recId::groupKey" (collapsed by default).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [checklistPages, setChecklistPages] = useState<Record<string, number>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ReportChatState>(EMPTY_CHAT);

  /* ---------- sections in the URL ---------- */
  const writeUrl = (next: PicsTab, nextStage: string | null, mode: "push" | "replace") => {
    const u = new URL(window.location.href);
    u.searchParams.delete("open");
    if (next === "overview") u.searchParams.delete("tab");
    else u.searchParams.set("tab", next);
    if (nextStage) u.searchParams.set("stage", nextStage);
    else u.searchParams.delete("stage");
    const url = u.pathname + u.search + u.hash;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  };
  const goTo = (next: PicsTab, nextStage: string | null = null) => {
    setTab(next);
    setStage(nextStage);
    setPendingOpen(null);
    writeUrl(next, nextStage, "push");
    window.scrollTo({ top: 0 });
  };
  const chooseStage = (next: string | null) => {
    setStage(next);
    writeUrl(tab, next, "replace");
  };
  // Back / forward buttons: follow the URL.
  useEffect(() => {
    const sync = () => {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab");
      setTab(isPicsTab(t) ? t : "overview");
      setStage(p.get("stage"));
      setPendingOpen(null); // a deep-linked card opens once, not every time you come back to Records
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

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

  /* Runs an Airtable save; on failure reverts the optimistic change and toasts why. */
  const persist = async <T,>(run: () => Promise<T>, revert: () => void, done?: (r: T) => void) => {
    try {
      done?.(await run());
    } catch (e) {
      revert();
      toast(saveError(e));
    }
  };

  /* A checklist item / roadmap row can be linked to several P.I.C.S (parent + child), so server results are
     applied to every copy, matched by Airtable record ID. Review-round activities mirror checklist items too. */
  const applyChecklist = (atId: string, item: ChecklistItem, atStatus?: string) =>
    setRecords((rs) =>
      rs.map((r) => {
        const inList = r.checklist.some((c) => c.atId === atId);
        const inReview = atStatus !== undefined && !!r.reviewRounds?.some((rr) => rr.activities?.some((a) => a.atId === atId));
        if (!inList && !inReview) return r;
        return {
          ...r,
          checklist: inList ? r.checklist.map((c) => (c.atId === atId ? { ...item } : c)) : r.checklist,
          reviewRounds: inReview
            ? r.reviewRounds?.map((rr) => ({
                ...rr,
                activities: rr.activities?.map((a) => (a.atId === atId ? { label: item.item, status: atStatus ?? a.status, atId } : a)),
              }))
            : r.reviewRounds,
        };
      }),
    );
  const applyRoadmapRow = (atId: string, row: RoadmapRow) =>
    setRecords((rs) =>
      rs.map((r) =>
        r.roadmapRows.some((x) => x.atId === atId)
          ? { ...r, roadmapRows: r.roadmapRows.map((x) => (x.atId === atId ? { ...row, tpId: x.tpId } : x)) }
          : r,
      ),
    );

  /* ---------- record mutations ---------- */
  const createRecord = (rec: PicsRecord) => {
    setRecords((rs) => [
      ...rs.map((p) => (rec.parentId && p.id === rec.parentId ? { ...p, childIds: [...(p.childIds ?? []), rec.id] } : p)),
      rec,
    ]);
    chooseStage(null);
    setDialog(null);
    if (!live) return;
    const temp = rec.id;
    // Swap the temporary id for the Airtable one (or drop the record when `to` is null).
    const swapId = (from: string, to: string | null) =>
      setRecords((rs) =>
        rs
          .filter((r) => to !== null || r.id !== from)
          .map((r) => ({
            ...r,
            id: r.id === from && to ? to : r.id,
            childIds: r.childIds?.flatMap((c) => (c === from ? (to ? [to] : []) : [c])),
          })),
      );
    void persist(
      () =>
        picsApi<{ id: string; leads: { i: string; name: string }[]; warnings: string[] }>("POST", "", {
          name: rec.name,
          type: rec.type,
          stage: rec.stage,
          start: rec.start,
          end: rec.end,
          depts: rec.depts,
          leads: rec.leads.map((l) => l.i),
          overview: rec.overview,
          stakeholders: rec.stakeholders,
          briefingLink: rec.briefingLink,
          liveSiteUrl: rec.liveSiteUrl,
          hierarchy: rec.hierarchy ?? "None",
          parentId: rec.parentId,
          active: rec.active,
        }),
      () => {
        swapId(temp, null);
        setOpenId((o) => (o === temp ? null : o));
      },
      (res) => {
        swapId(temp, res.id);
        if (res.leads.length) updateRecord(res.id, (d) => void (d.leads = res.leads));
        setOpenId((o) => (o === temp ? res.id : o));
        toast(res.warnings.length ? `"${rec.name}" saved to Airtable · ${res.warnings.join(" · ")}` : `"${rec.name}" launched and saved to Airtable`);
      },
    );
  };
  const changeStage = (recId: string, next: string) => {
    const prev = byId[recId]?.stage;
    if (prev === undefined || prev === next) return;
    updateRecord(recId, (d) => void (d.stage = next));
    if (!live || !isAt(recId)) {
      toast(`Moved to ${next} (session only — not saved to Airtable)`);
      return;
    }
    void persist(
      () => picsApi("PATCH", `/${recId}`, { stage: next }),
      () => updateRecord(recId, (d) => void (d.stage = prev)),
      () => toast(`Moved to ${next} — saved to Airtable`),
    );
  };
  const addRoadmapRow = (recId: string, row: RoadmapRow) => {
    const r = byId[recId];
    if (!r) return;
    const write = live && isAt(recId);
    const temp = tmpId();
    const s = syncRoadmapRowToTaskPlanning(r, write ? { ...row, atId: temp } : row);
    updateRecord(recId, (d) => void d.roadmapRows.push(s.row));
    setTaskPlanning((tp) => [...tp, s.entry]);
    setDialog(null);
    if (!write) return;
    void persist(
      () => picsApi<{ row: RoadmapRow | null }>("POST", "/roadmap", { picsId: recId, row }),
      () => {
        updateRecord(recId, (d) => void (d.roadmapRows = d.roadmapRows.filter((x) => x.atId !== temp)));
        setTaskPlanning((tp) => tp.filter((e) => e.id !== s.entry.id));
      },
      (res) => {
        if (res.row) applyRoadmapRow(temp, res.row);
        toast("Roadmap item saved to Airtable");
      },
    );
  };
  const updateRoadmapRow = (recId: string, idx: number, row: RoadmapRow) => {
    const r = byId[recId];
    if (!r) return;
    const prev = r.roadmapRows[idx];
    updateRecord(recId, (d) => void (d.roadmapRows[idx] = row));
    setTaskPlanning((tp) => resyncTaskPlanning(tp, r, row));
    if (!live || !prev || !isAt(row.atId)) return;
    const atId = row.atId;
    void persist(
      () => picsApi<{ row: RoadmapRow | null }>("PATCH", `/roadmap/${atId}`, { row }),
      () => {
        applyRoadmapRow(atId, prev);
        setTaskPlanning((tp) => resyncTaskPlanning(tp, r, prev));
      },
      (res) => {
        if (res.row) applyRoadmapRow(atId, res.row);
        toast("Roadmap item saved to Airtable");
      },
    );
  };
  const addChecklistItem = (recId: string, c: ChecklistItem) => {
    const write = live && isAt(recId);
    const temp = tmpId();
    updateRecord(recId, (d) => void d.checklist.push(write ? { ...c, atId: temp } : c));
    setDialog(null);
    if (!write) return;
    void persist(
      () => picsApi<{ item: ChecklistItem; atStatus: string }>("POST", "/checklist", { picsId: recId, item: c }),
      () => updateRecord(recId, (d) => void (d.checklist = d.checklist.filter((x) => x.atId !== temp))),
      (res) => {
        applyChecklist(temp, res.item);
        toast("Checklist item saved to Airtable");
      },
    );
  };
  const saveChecklistItem = (recId: string, idx: number, c: ChecklistItem) => {
    const prev = byId[recId]?.checklist[idx];
    updateRecord(recId, (d) => void (d.checklist[idx] = c));
    setDialog(null);
    if (!live || !prev || !isAt(prev.atId)) return;
    const atId = prev.atId;
    void persist(
      () => picsApi<{ item: ChecklistItem; atStatus: string }>("PATCH", `/checklist/${atId}`, { item: c }),
      () => applyChecklist(atId, prev),
      (res) => {
        applyChecklist(atId, res.item, res.atStatus);
        toast("Checklist item saved to Airtable");
      },
    );
  };
  const saveActivity = (recId: string, ri: number, ai: number, label: string, status: string) => {
    const prev = byId[recId]?.reviewRounds?.[ri]?.activities?.[ai];
    const setAct = (l: string, st: string) =>
      updateRecord(recId, (d) => {
        const acts = d.reviewRounds?.[ri]?.activities;
        if (acts?.[ai]) acts[ai] = { ...acts[ai], label: l, status: st };
      });
    setAct(label, status);
    if (!live || !prev || !isAt(prev.atId)) {
      toast(SAVED_TOAST);
      return;
    }
    const atId = prev.atId;
    void persist(
      () => picsApi<{ item: ChecklistItem; atStatus: string }>("PATCH", `/checklist/${atId}`, { activity: { label, status } }),
      () => setAct(prev.label, prev.status),
      (res) => {
        applyChecklist(atId, res.item, res.atStatus);
        toast("Activity saved to its Airtable checklist item");
      },
    );
  };
  const addReport = (r: PicsReport) => {
    setReports((rs) => [...rs, r]);
    setDialog(null);
    if (!live) return;
    void persist(
      () => picsApi<{ id: string; warnings: string[] }>("POST", "/reports", { report: r }),
      () => setReports((rs) => rs.filter((x) => x.id !== r.id)),
      (res) => {
        setReports((rs) => rs.map((x) => (x.id === r.id ? { ...x, id: res.id } : x)));
        toast(res.warnings.length ? `Report saved to Master Reports · ${res.warnings.join(" · ")}` : "Report saved to Master Reports in Airtable");
      },
    );
  };

  /* ---------- reports + Report Build Assistant ---------- */
  const openChat = () => {
    setChatOpen(true);
    if (!chat.started) setChat(startNewReportChat());
  };
  const sendChat = (text: string) => {
    const { state, effect } = advanceReportChat(chat, text, {
      reports,
      options,
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
  // Stage + search narrowing for the master card grid.
  const cardFilter = useMemo(
    () =>
      !q && !stage
        ? null
        : (p: CardPics) =>
            (!stage || p.stage === stage) &&
            (!q || [p.name, p.type, p.stage, p.tag, ...p.depts, ...p.leads].some((v) => v.toLowerCase().includes(q))),
    [q, stage],
  );

  const typeMix: DonutDatum[] = options.types.map((t, i) => ({
    key: t,
    label: t,
    value: records.filter((r) => r.type === t).length,
    color: SERIES[i % SERIES.length],
  }));
  const mixTotal = typeMix.reduce((sum, d) => sum + d.value, 0);

  // Stage tiles follow the Airtable Stage choices; any stage on a record that isn't a choice is appended.
  // OPS-4: "Execution & Implementation" duplicates the Execution and Implementation tiles, so it is hidden.
  const stageKeys = [...options.stages, ...new Set(records.map((r) => r.stage).filter((s) => !options.stages.includes(s)))].filter(
    (s) => s !== HIDDEN_STAGE,
  );
  const tiles = [{ key: null as string | null, label: "Active P.I.C.S", count: records.length }].concat(
    stageKeys.map((s) => ({ key: s, label: s, count: records.filter((r) => r.stage === s).length })),
  );

  const today = todayISO();
  const upcomingAll = records
    .flatMap((r) => (r.meetings ?? []).map((m) => ({ ...m, parent: r.name })))
    .filter((m) => m.date.slice(0, 10) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const checklistOpen = records.reduce((s, r) => s + r.checklist.filter((c) => !c.done).length, 0);
  const openItems = records
    .flatMap((rec) => rec.checklist.flatMap((c, idx) => (c.done ? [] : [{ c, idx, rec }])))
    .sort((a, b) => Number(b.c.status === "overdue") - Number(a.c.status === "overdue") || (a.c.due ?? "9").localeCompare(b.c.due ?? "9"));
  const overdue = records.reduce((s, r) => s + r.checklist.filter((c) => c.status === "overdue").length, 0);

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
        onSaveActivity: (ri, ai, label, status) => saveActivity(open.id, ri, ai, label, status),
        onChangeStage: (next) => changeStage(open.id, next),
        live,
      }
    : null;

  const dlgRec = dialog && "recId" in dialog ? byId[dialog.recId] : undefined;
  const dlgReport = dialog?.kind === "report" ? reports.find((r) => r.id === dialog.id) : undefined;

  return (
    <PicsOptionsProvider value={options}>
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="min-w-0 flex-1">
        <TopBar
          title={
            <span className="flex flex-wrap items-center gap-3">
              P.I.C.S Operations <DataSourceBadge source={source} />
            </span>
          }
          search={tab === "records" ? "Search P.I.C.S…" : tab === "reports" ? "Search reports…" : undefined}
          query={query}
          onQuery={setQuery}
        />

        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8">
          {/* Sections of the dashboard: each is its own link (?tab=…) */}
          <div className="seg" role="group" aria-label="Section">
            {PICS_TABS.map(([k, l]) => (
              <button key={k} type="button" aria-pressed={tab === k} onClick={() => goTo(k)}>
                {l}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <>
              {/* Overview row (OPS-1): P.I.C.S Mix + the three activity cards on one row */}
              <div className="grid grid-cols-3 items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,2.1fr)_repeat(3,minmax(0,1fr))]">
                <section className="card col-span-3 p-5 xl:col-span-1">
                  <CardHead icon={<IconLayers width={20} height={20} />} title="P.I.C.S Mix" />
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="shrink-0">
                      <Donut data={typeMix} size={150} centerLabel="active" />
                    </div>
                    <ul className="grid min-w-[200px] flex-1 gap-1">
                      {typeMix.map((d) => (
                        <li key={d.key} className="flex items-center gap-2 text-[12px]" title={d.label}>
                          <span className="h-2.5 w-3.5 shrink-0 rounded-full" style={{ background: d.color }} />
                          <span className="flex-1 whitespace-nowrap font-semibold text-ink">{d.label}</span>
                          <span className="whitespace-nowrap tabular-nums text-ink-2">
                            {d.value} · {mixTotal ? Math.round((d.value / mixTotal) * 100) : 0}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
                <SummaryTile label="Active P.I.C.S" value={records.length} chip="all records" tone="brand" onClick={() => goTo("records")} />
                <SummaryTile label="Open checklist items" value={checklistOpen} chip={`${overdue} overdue`} tone="bad" onClick={() => goTo("checklists")} />
                <SummaryTile label="Upcoming meetings" value={upcomingAll.length} chip="from today" tone="good" onClick={() => goTo("meetings")} />
              </div>
            </>
          )}

          {/* Checklists section: what used to expand under the "Open checklist items" tile */}
          {tab === "checklists" && (
            <section className="card p-5 sm:p-6">
              <CardHead title="Open checklist items" sub={`${checklistOpen} open · ${overdue} overdue — overdue first, click one to edit it`} />
              <ul className="mt-4 max-h-[640px] space-y-1.5 overflow-y-auto">
                {openItems.length ? (
                  openItems.map(({ c, idx, rec }) => (
                    <li key={`${rec.id}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "editChecklist", recId: rec.id, idx })}
                        className={cx(
                          "flex w-full flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-left",
                          c.status === "overdue" ? "bg-bad-soft" : "bg-plane hover:bg-brand-soft",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold">{c.item}</span>
                          <span className="block text-[11px] text-muted">{rec.name}</span>
                        </span>
                        <span className="text-[11px] text-muted">{c.due ? `Due ${fmt(c.due)}` : "No due date"}</span>
                        {c.status === "overdue" && <span className="rounded-lg bg-bad px-2 py-0.5 text-[10.5px] font-bold text-white">Overdue</span>}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="py-4 text-[12.5px] text-muted">No open checklist items.</li>
                )}
              </ul>
            </section>
          )}

          {/* Meetings section: what used to expand under the "Upcoming meetings" tile */}
          {tab === "meetings" && (
            <section className="card p-5 sm:p-6">
              <CardHead title="Upcoming meetings" sub={`${upcomingAll.length} from today — soonest first`} />
              <ul className="mt-4 max-h-[640px] space-y-1.5 overflow-y-auto">
                {upcomingAll.length ? (
                  upcomingAll.map((m, i) => {
                    const body = (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold">{m.label}</span>
                          <span className="block text-[11px] text-muted">
                            {m.parent}
                            {m.facilitator ? ` · ${m.facilitator}` : ""}
                          </span>
                        </span>
                        <span className="text-[11.5px] font-semibold text-ink-2">{fmtDT(m.date)}</span>
                      </>
                    );
                    const cls = "flex w-full flex-wrap items-center gap-3 rounded-2xl bg-plane px-4 py-3";
                    return (
                      <li key={i}>
                        {m.link ? (
                          <a href={m.link} target="_blank" rel="noopener" className={cx(cls, "hover:bg-brand-soft")}>
                            {body}
                          </a>
                        ) : (
                          <div className={cls}>{body}</div>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="py-4 text-[12.5px] text-muted">No upcoming meetings.</li>
                )}
              </ul>
            </section>
          )}

          {/* Records section: stages (a filter) + the P.I.C.S Master Card grid */}
          {tab === "records" && (
            <>

              {/* Stage tiles (OPS-3): full width, every stage visible */}
              <section className="card p-5">
                <CardHead title="Stages" sub="Click a stage to filter the records below; “Active P.I.C.S” clears it." />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {tiles.map((t) => {
                    const c = t.key ? (STAGE_COLOR[t.key] ?? "#7B7F8C") : "#15171c";
                    const selected = stage === t.key;
                    return (
                      <button
                        key={t.label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => chooseStage(t.key === null ? null : stage === t.key ? null : t.key)}
                        className={cx(
                          "flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition",
                          selected ? "border-brand bg-brand-soft" : "border-line hover:border-line-2 hover:bg-plane",
                        )}
                      >
                        <span
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-[12.5px] font-extrabold text-white"
                          style={{ background: c }}
                        >
                          {t.count}
                        </span>
                        <span className="min-w-0 text-[12px] font-semibold leading-tight text-ink">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Records: the P.I.C.S Master Card v2 (OPS-6 → OPS-24) — type tabs, cards, full card, roadmap,
                  checklists, feedback rounds, share. Stage tiles and the search box narrow its grid. */}
              <section>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="eyebrow">
                      Active
                      {stage ? ` · ${stage}` : ""}
                      {q ? ` · “${query.trim()}”` : ""}
                    </div>
                    <h2 className="mt-1 text-[22px] font-medium tracking-tight">P.I.C.S Records</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(q || stage) && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setQuery("");
                          chooseStage(null);
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                    <button type="button" className="btn btn-brand btn-sm" onClick={() => setDialog({ kind: "newPics" })}>
                      <IconPlus width={14} height={14} /> New P.I.C.S
                    </button>
                  </div>
                </div>
                <PicsMasterCard
                  data={card}
                  source={cardSource}
                  dashboard="PICS Operations"
                  filter={cardFilter}
                  openId={pendingOpen}
                  viewBase="/pics"
                />
              </section>
            </>
          )}

          {/* Calendar section */}
          {tab === "calendar" && (
            <PicsCalendar records={records} onEditChecklist={(recId, idx) => setDialog({ kind: "editChecklist", recId, idx })} />
          )}

          {/* Reports section */}
          {tab === "reports" && (
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

          <PageFooter meta="VCG Intranet — Master Design System" />
        </div>
      </main>

      {open && handlers && (
        <RecordDetail record={open} relationship={relationship(open, byId)} onClose={() => setOpenId(null)} h={handlers} />
      )}

      {dialog?.kind === "newPics" && <NewPicsModal records={records} live={live} onClose={() => setDialog(null)} onCreate={createRecord} />}
      {dialog?.kind === "addRoadmap" && dlgRec && (
        <AddRoadmapModal record={dlgRec} live={live} onClose={() => setDialog(null)} onAdd={(row) => addRoadmapRow(dlgRec.id, row)} />
      )}
      {dialog?.kind === "addChecklist" && dlgRec && (
        <AddChecklistModal record={dlgRec} live={live} onClose={() => setDialog(null)} onAdd={(c) => addChecklistItem(dlgRec.id, c)} />
      )}
      {dialog?.kind === "editChecklist" && dlgRec && dlgRec.checklist[dialog.idx] && (
        <EditChecklistModal
          key={`${dlgRec.id}-${dialog.idx}`}
          record={dlgRec}
          idx={dialog.idx}
          live={live}
          onClose={() => setDialog(null)}
          onSave={(c) => saveChecklistItem(dlgRec.id, dialog.idx, c)}
        />
      )}
      {dialog?.kind === "newReport" && (
        <NewReportModal records={records} live={live} onClose={() => setDialog(null)} onCreate={addReport} />
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
    </PicsOptionsProvider>
  );
}


function SummaryTile({
  label,
  value,
  chip,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  chip: string;
  tone: "brand" | "bad" | "good";
  onClick: () => void;
}) {
  const tones = { brand: "bg-brand-soft text-brand", bad: "bg-bad-soft text-bad", good: "bg-good-soft text-good" };
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex min-w-0 flex-col p-3 text-left transition hover:-translate-y-0.5 sm:p-5"
    >
      <div className="text-[12px] font-bold leading-tight sm:text-[13px]">{label}</div>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <span className="text-[26px] font-extrabold sm:text-[34px] leading-none tracking-tight">{value}</span>
        <span className={cx("mb-1 max-w-full truncate rounded-lg px-1.5 py-0.5 text-[10.5px] font-bold sm:px-2 sm:py-1 sm:text-[11px]", tones[tone])}>{chip}</span>
      </div>
      <div className="mt-3 text-[11.5px] font-semibold text-brand">Open →</div>
    </button>
  );
}
