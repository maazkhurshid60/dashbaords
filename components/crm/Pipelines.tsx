"use client";

import { useState } from "react";
import { daysIn, fmtDate, isLost, isOpenOpp, isWon, money, moneyShort, monthKey, needsNudge, pct, stageOf, ts, weighted } from "@/lib/crm-logic";
import { nowMs } from "@/lib/crm-logic";
import type { Opp, SavedView } from "@/lib/crm-types";
import { Chip, Com, Empty, Stat, cx } from "./bits";
import { ViewPanel } from "./Contacts";
import { useStageMove } from "./records";
import { useCrm } from "./store";

/* Pipelines tab (COM-12 → COM-15, COM-28, COM-35): pipeline tabs, shared stage strip,
   Board · List · Forecast, status cards, drag/drop or click to move stage. */
export function Pipelines() {
  const { D, nav, setPanel, isAdmin, write, busy, name } = useCrm();
  const [pipe, setPipe] = useState(nav.pipeline || "");
  const [stage, setStage] = useState(nav.stage || "");
  const [mode, setMode] = useState<"Board" | "List" | "Forecast">("Board");
  const [viewId, setViewId] = useState("");
  const [draft, setDraft] = useState<Partial<SavedView> | null>(null);
  const [newPipe, setNewPipe] = useState<string | null>(null);
  const move = useStageMove();
  const pipes = D.pipelines.filter((p) => p.active || !D.pipelines.some((x) => x.active));
  const views = D.views.filter((v) => v.object === "Deals");
  const view = draft || views.find((v) => v.id === viewId) || null;

  const opps =

      D.opps.filter((o) => {
        if (pipe && o.pipeline !== pipe) return false;
        if (stage && o.stageId !== stage) return false;
        if (view) {
          const t = stageOf(o, D.stages)?.type || o.stageType;
          if (view.pipelines?.length && !view.pipelines.includes(o.pipeline)) return false;
          if (view.stageTypes?.length && !view.stageTypes.includes(t)) return false;
          if (view.ownerIds?.length && !o.ownerIds.some((x) => view.ownerIds!.includes(x))) return false;
          if (view.closeMonths && monthKey(o.closeDate) !== view.closeMonths) return false;
        }
        return true;
      });
  const open = opps.filter((o) => isOpenOpp(o, D.stages));
  const won = opps.filter((o) => isWon(o, D.stages));
  const lost = opps.filter((o) => isLost(o, D.stages));
  const nudge = opps.filter((o) => needsNudge(o, D.stages));
  const sum = (l: Opp[], f: (o: Opp) => number) => l.reduce((s, o) => s + f(o), 0);

  return (
    <div className="space-y-6">
      {/* pipeline tabs (COM-12) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2 text-[13px]">
        {[{ id: "", name: "All pipelines" }, ...pipes].map((p) => (
          <span key={p.id || "all"} className="inline-flex items-center">
            <button type="button" onClick={() => setPipe(p.id ? p.name : "")} className={cx("rounded-lg px-3 py-1.5", (p.id ? p.name : "") === pipe ? "bg-brand-soft font-semibold text-brand" : "hover:bg-plane")}>
              {p.name} <span className="text-muted">{D.opps.filter((o) => (!p.id || o.pipeline === p.name) && isOpenOpp(o, D.stages)).length}</span>
            </button>
            {isAdmin && p.id && (
              <button
                type="button"
                className="px-1 text-muted hover:text-bad"
                title="Archive pipeline (opportunities are kept)"
                onClick={() => confirm(`Archive the ${p.name} pipeline? Its opportunities are kept.`) && write("savePipeline", { id: p.id, fields: { Active: false } }, "Pipeline archived")}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {isAdmin &&
          (newPipe === null ? (
            <button type="button" className="btn btn-sm" onClick={() => setNewPipe("")}>
              ＋ New pipeline
            </button>
          ) : (
            <span className="flex gap-1">
              <input className="field w-48 py-1" autoFocus placeholder="Pipeline name" value={newPipe} onChange={(e) => setNewPipe(e.target.value)} />
              <button
                type="button"
                className="btn btn-sm btn-brand"
                disabled={busy || !newPipe.trim()}
                onClick={async () => {
                  const r = await write("savePipeline", { fields: { "Pipeline Name": newPipe.trim(), Active: true, Order: D.pipelines.length + 1 } }, "Pipeline created");
                  if (r?.ok) setNewPipe(null);
                }}
              >
                Create
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setNewPipe(null)}>
                Cancel
              </button>
            </span>
          ))}
        <Com id="COM-12" />
      </div>
      {isAdmin && newPipe !== null && <p className="-mt-4 text-[12px] text-muted">Name only — all pipelines share one stage set. Note: an Opportunity&apos;s Pipeline select needs a matching option added in Airtable.</p>}

      <div className="flex flex-wrap gap-2">
        <Stat label="Open pipeline" value={moneyShort(sum(open, (o) => o.value || 0))} sub={`${open.length} open`} />
        <Stat label="Weighted forecast" value={moneyShort(sum(open, (o) => weighted(o, D.stages)))} />
        <Stat label="Won" value={moneyShort(sum(won, (o) => o.value || 0))} sub={`win rate ${pct(won.length, won.length + lost.length)}%`} tone="good" />
        <Stat label="Need a nudge" value={nudge.length} tone={nudge.length ? "bad" : undefined} sub="stale or no next step" />
        <Com id="COM-15" />
      </div>

      {/* views bar + stage strip (COM-13) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone={!viewId && !draft ? "brand" : "gray"} onClick={() => { setViewId(""); setDraft(null); }}>
          All opportunities
        </Chip>
        {views.map((v) => (
          <span key={v.id} className="inline-flex items-center">
            <Chip tone={viewId === v.id ? "brand" : "gray"} onClick={() => { setDraft(null); setViewId(v.id); }}>
              {v.name}
            </Chip>
            <button type="button" className="px-1 text-muted hover:text-bad" onClick={() => write("saveView", { id: v.id, remove: true, tab: "Pipelines" }, "View deleted")}>
              ×
            </button>
          </span>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => setDraft(draft ? null : { object: "Deals", pipelines: [], stageTypes: [], ownerIds: [] })}>
          ＋ New view
        </button>
        <div className="seg ml-auto">
          {(["Board", "List", "Forecast"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>
      {draft && <ViewPanel draft={draft} setDraft={setDraft} count={opps.length} tab="Pipelines" onSaved={(id) => { setDraft(null); setViewId(id); }} />}
      <div className="flex flex-wrap gap-1">
        <Chip tone={!stage ? "brand" : "gray"} onClick={() => setStage("")}>
          All stages
        </Chip>
        {D.stages.map((s) => (
          <Chip key={s.id} tone={stage === s.id ? "brand" : "gray"} onClick={() => setStage(stage === s.id ? "" : s.id)}>
            {s.name}
          </Chip>
        ))}
        <Com id="COM-13" />
        <Com id="COM-35" />
      </div>

      {!D.stages.length && <Empty>No rows in Airtable › Pipeline Stages.</Empty>}
      {mode === "Board" && (
        <div className="scroll-thin flex gap-3 overflow-x-auto pb-2">
          {D.stages
            .filter((s) => !stage || s.id === stage)
            .map((s) => {
              const col = opps.filter((o) => o.stageId === s.id);
              return (
                <div
                  key={s.id}
                  className="w-64 shrink-0 rounded-xl bg-plane p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    const o = D.opps.find((x) => x.id === e.dataTransfer.getData("text/opp"));
                    if (o && (await move(o, s.id)) === "need-reason") setPanel({ kind: "opp", id: o.id });
                  }}
                >
                  <div className="mb-2 flex justify-between px-1 text-[12px] font-bold">
                    <span>
                      {s.name} · {s.probability > 1 ? s.probability : Math.round(s.probability * 100)}%
                    </span>
                    <span className="text-muted">{moneyShort(sum(col, (o) => o.value || 0))}</span>
                  </div>
                  <div className="space-y-2">
                    {col.map((o) => (
                      <OppCard key={o.id} o={o} />
                    ))}
                    {!col.length && <div className="py-4 text-center text-[12px] text-muted">—</div>}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      {mode === "List" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] text-muted">
                {["Opportunity", "Pipeline", "Stage", "Value", "Close", "Next step", "Owner", "Days in stage"].map((h) => (
                  <th key={h} className="px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opps.map((o) => (
                <tr key={o.id} className="cursor-pointer border-b border-line hover:bg-plane" onClick={() => setPanel({ kind: "opp", id: o.id })}>
                  <td className="px-3 py-2 font-semibold">{o.name}</td>
                  <td className="px-3 py-2">{o.pipeline}</td>
                  <td className="px-3 py-2">{stageOf(o, D.stages)?.name || "—"}</td>
                  <td className="px-3 py-2">{money(o.value)}</td>
                  <td className="px-3 py-2">{fmtDate(o.closeDate) || "—"}</td>
                  <td className="px-3 py-2">{o.nextStep || <span className="text-bad">No next step</span>}</td>
                  <td className="px-3 py-2">{o.ownerIds.map(name).join(", ") || "—"}</td>
                  <td className="px-3 py-2">{daysIn(o) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!opps.length && (
            <div className="p-4">
              <Empty>No opportunities here.</Empty>
            </div>
          )}
        </div>
      )}
      {mode === "Forecast" && <Forecast opps={open} />}
    </div>
  );
}

function OppCard({ o }: { o: Opp }) {
  const { D, setPanel, name } = useCrm();
  const tasks = D.tasks.filter((t) => t.oppIds.includes(o.id) && !t.completed).length;
  const late = o.nextStepDate && ts(o.nextStepDate) < nowMs();
  const company = o.companyIds.map(name).join(", ");
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/opp", o.id)}
      onClick={() => setPanel({ kind: "opp", id: o.id })}
      className="block w-full rounded-lg border border-line bg-shell p-2.5 text-left text-[12.5px] hover:border-brand"
    >
      <div className="font-semibold text-ink">{o.name}</div>
      {company && <div className="text-ink-2">{company}</div>}
      <div className="mt-1 flex flex-wrap gap-1">
        <Chip tone={o.value ? "brand" : "gray"}>{money(o.value)}</Chip>
        {o.closeDate && <Chip>Close {fmtDate(o.closeDate)}</Chip>}
        {daysIn(o) != null && <Chip tone={o.stale ? "bad" : "gray"}>{daysIn(o)}d{o.stale ? " · stale" : ""}</Chip>}
      </div>
      {o.nextStep ? (
        <div className="mt-1 text-ink-2">
          → {o.nextStep} {o.nextStepDate && <Chip tone={late ? "bad" : "gray"}>{fmtDate(o.nextStepDate)}</Chip>}
        </div>
      ) : (
        <div className="mt-1 text-bad">No next step</div>
      )}
      <div className="mt-1 flex justify-between text-[11.5px] text-muted">
        <span>{o.ownerIds.map(name).join(", ") || "No owner"}</span>
        {tasks > 0 && <span>{tasks} open tasks</span>}
      </div>
    </button>
  );
}

function Forecast({ opps }: { opps: Opp[] }) {
  const { D } = useCrm();
  const months = [...new Set(opps.map((o) => monthKey(o.closeDate) || "No close date"))].sort();
  if (!opps.length) return <Empty>No open opportunities.</Empty>;
  const max = Math.max(1, ...months.map((m) => opps.filter((o) => (monthKey(o.closeDate) || "No close date") === m).reduce((s, o) => s + (o.value || 0), 0)));
  return (
    <div className="card space-y-2 p-4">
      {months.map((m) => {
        const l = opps.filter((o) => (monthKey(o.closeDate) || "No close date") === m);
        const v = l.reduce((s, o) => s + (o.value || 0), 0);
        const w = l.reduce((s, o) => s + weighted(o, D.stages), 0);
        return (
          <div key={m} className="grid grid-cols-[120px_1fr_160px] items-center gap-3 text-[13px]">
            <span className="font-semibold">{m}</span>
            <div className="relative h-4 rounded bg-plane">
              <div className="absolute h-full rounded bg-lav" style={{ width: `${(v / max) * 100}%` }} />
              <div className="absolute h-full rounded bg-brand" style={{ width: `${(w / max) * 100}%` }} />
            </div>
            <span className="text-ink-2">
              {moneyShort(w)} weighted / {moneyShort(v)} · {l.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}
