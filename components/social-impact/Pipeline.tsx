"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import { cx } from "@/lib/utils";
import type { Application, SocialData } from "@/lib/social-types";
import { Drawer, Empty, Field, Pill, date, money, pct, send } from "./si-ui";

/* Opportunity Pipeline: Grant Applications as a kanban by Stage (columns = the Stage field's choices).
   Drag a card to another column, or change the stage in the card drawer → PATCH /api/social/applications/<id>. */
export function Pipeline({ data, query, onBuild }: { data: SocialData; query: string; onBuild: (id: string) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [moved, setMoved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const stageOf = (a: Application) => moved[a.id] ?? a.stage;
  const stages = data.choices.appStage.length ? data.choices.appStage : Array.from(new Set(data.applications.map((a) => a.stage).filter(Boolean)));
  const q = query.trim().toLowerCase();
  const apps = data.applications.filter((a) => !q || `${a.name} ${a.funder}`.toLowerCase().includes(q));
  const open = data.applications.find((a) => a.id === openId) ?? null;

  async function move(a: Application, stage: string) {
    if (!stage || stage === stageOf(a)) return;
    const prev = stageOf(a);
    setMoved((m) => ({ ...m, [a.id]: stage }));
    setBusy(a.id);
    const r = await send(`/api/social/applications/${a.id}`, "PATCH", { stage, area: "Opportunity Pipeline" });
    setBusy(null);
    if (r.ok) {
      toast(`Moved to ${stage}`);
      router.refresh();
    } else {
      setMoved((m) => ({ ...m, [a.id]: prev }));
      toast(`Couldn't move: ${r.error}`);
    }
  }

  if (!data.applications.length) return <Empty>No Grant Applications yet.</Empty>;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {stages.map((s) => {
          const col = apps.filter((a) => stageOf(a) === s);
          return (
            <section
              key={s}
              aria-label={s}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s);
              }}
              onDragLeave={() => setOver((o) => (o === s ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const a = data.applications.find((x) => x.id === drag);
                if (a) void move(a, s);
                setDrag(null);
              }}
              className={cx("flex w-60 shrink-0 flex-col rounded-2xl bg-plane p-2.5 transition", over === s && "ring-2 ring-brand")}
            >
              <header className="flex items-center justify-between px-1.5 pb-2 pt-1">
                <span className="text-[12px] font-bold">{s}</span>
                <span className="text-[11px] font-bold text-muted">{col.length}</span>
              </header>
              <div className="flex min-h-16 flex-col gap-2">
                {col.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    draggable
                    onDragStart={() => setDrag(a.id)}
                    onDragEnd={() => setDrag(null)}
                    onClick={() => setOpenId(a.id)}
                    className={cx("rounded-xl bg-white p-3 text-left shadow-card transition hover:ring-2 hover:ring-brand/30", busy === a.id && "animate-pulse")}
                  >
                    <div className="text-[12.5px] font-semibold leading-snug">{a.name}</div>
                    <div className="mt-1 text-[11px] text-muted">{a.funder || "—"}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="font-bold">{money(a.requested)}</span>
                      <span className="text-muted">{a.deadline ? date(a.deadline) : ""}</span>
                    </div>
                    {a.sectionsTotal ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" title={`${a.sectionsComplete ?? 0}/${a.sectionsTotal} sections complete`}>
                        <div className="h-full bg-brand" style={{ width: `${Math.round((a.completion ?? 0) * 100)}%` }} />
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <Drawer open={!!open} onClose={() => setOpenId(null)} eyebrow="Grant application" title={open?.name ?? ""}>
        {open && (
          <>
            <label className="block py-2">
              <span className="eyebrow mb-1 block">Stage</span>
              <select
                value={stageOf(open)}
                disabled={busy === open.id}
                onChange={(e) => void move(open, e.target.value)}
                className="h-9 w-full rounded-full border border-line-2 bg-white px-3 text-[12.5px] font-semibold outline-none focus:border-brand"
              >
                {!stages.includes(stageOf(open)) && <option value={stageOf(open)}>{stageOf(open) || "—"}</option>}
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Funder">{open.funder}</Field>
            <Field label="Funnel zone">{open.zone}</Field>
            <Field label="Requested / awarded">{`${money(open.requested)} / ${money(open.awarded)}`}</Field>
            <Field label="Probability · weighted">{`${pct(open.probability)} · ${money(open.weighted)}`}</Field>
            <Field label="Deadline">{`${date(open.deadline)}${open.daysToDeadline != null ? ` (${open.daysToDeadline} days)` : ""}`}</Field>
            <Field label="LOI due">{date(open.loiDue)}</Field>
            <Field label="Sections">{open.sectionsTotal ? `${open.sectionsComplete ?? 0} of ${open.sectionsTotal} complete` : "No sections"}</Field>
            <Field label="Owner">{open.owner}</Field>
            <Field label="Restriction">{open.restriction}</Field>
            <Field label="Notes">{open.notes}</Field>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-dark bg-ink text-white" onClick={() => onBuild(open.id)}>
                Open in Application Builder
              </button>
              {open.portalUrl && (
                <a href={open.portalUrl} target="_blank" rel="noopener" className="btn">
                  Funder portal
                </a>
              )}
              {open.stage !== stageOf(open) && <Pill tone="warn">Saving…</Pill>}
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
