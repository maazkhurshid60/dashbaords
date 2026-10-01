"use client";

import { useState, type ReactNode } from "react";
import { HEAT } from "@/components/charts";
import { IconChevron, IconExternal, IconVideo } from "@/components/icons";
import { Collapsible, Modal, StatusPill, useToast } from "@/components/ui";
import {
  APPROVAL_STATUS,
  ASSET_TYPES,
  CHECK_STATUS,
  ITEM_TYPES,
  PHASE_ORDER,
  ROADMAP_TYPES,
  STAGES,
  TASK_STATUS,
  markerFor,
} from "@/lib/pics";
import type { PicsRecord, ReviewRound, RoadmapRow } from "@/lib/types";
import { cx, fmt, fmtDT, isoWeek, monthKeyFor, monthLabelFor, pctElapsed, plural, weekRangeFor } from "@/lib/utils";

const SESSION_NOTE =
  "Saved to this session only — writing back to Airtable needs the server sync (API route + token).";

export function RecordDetail({
  record: r,
  relationship,
  onClose,
  onUpdate,
}: {
  record: PicsRecord;
  relationship: string | null;
  onClose: () => void;
  onUpdate: (fn: (r: PicsRecord) => void) => void;
}) {
  const toast = useToast();
  const [week, setWeek] = useState<{ kind: "roadmap" | "checklist"; week: number } | null>(null);

  const pct = pctElapsed(r.start, r.end, new Date(new Date().toISOString().slice(0, 10)).getTime());

  const byPhase: Record<string, RoadmapRow[]> = {};
  r.roadmapRows.forEach((x) => (byPhase[x.phase || "Unphased"] ??= []).push(x));
  const phases = [
    ...PHASE_ORDER.filter((p) => byPhase[p]),
    ...Object.keys(byPhase).filter((p) => !PHASE_ORDER.includes(p)),
  ];
  const meetings = [...(r.meetings ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  const rmWeeks = weekRangeFor(r.roadmapRows.map((x) => x.date));
  const rmCounts = rmWeeks.map((w) => r.roadmapRows.filter((x) => isoWeek(x.date) === w).length);
  const dated = r.checklist.filter((c) => c.due);
  const clWeeks = weekRangeFor(dated.map((c) => c.due!));
  const clCounts = clWeeks.map((w) => dated.filter((c) => isoWeek(c.due!) === w).length);
  const overdue = r.checklist.filter((c) => c.status === "overdue").length;

  return (
    <>
      <Modal open onClose={onClose} wide title={r.name} subtitle={`${r.type} · ${r.stage}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="Timeline" value={`${fmt(r.start)} → ${fmt(r.end)}`} />
          <Info label="Project leads" value={r.leads.map((l) => l.i).join(", ")} />
          <Info label="Departments" value={r.depts.join(", ")} />
          <Info label="Relationship" value={relationship ?? "—"} />
        </div>

        <Section title="Task timeline progress">
          <div className="flex justify-between text-[11.5px] font-semibold text-muted">
            <span>{fmt(r.start)}</span>
            <span className="text-ink-2">{pct}% elapsed</span>
            <span>{fmt(r.end)}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-plane">
            <div className="h-full rounded-full bg-linear-to-r from-brand to-violet" style={{ width: `${pct}%` }} />
          </div>
        </Section>

        <Section title="Milestones, sprints & meetings" count={plural(r.roadmapRows.length + meetings.length, "item")}>
          {r.roadmapRows.length + meetings.length ? (
            <>
              <div className="mb-2 flex flex-wrap gap-3 text-[11px] font-semibold text-ink-2">
                {[
                  ["Task", "1"],
                  ["Milestone", "M"],
                  ["Sprint", "S"],
                  ["Meeting", "•"],
                ].map(([t, g]) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span
                      className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: markerFor(t).color }}
                    >
                      {g}
                    </span>
                    {t}
                  </span>
                ))}
              </div>
              <div className="space-y-1">
                {phases.map((ph) => {
                  const rows = [...byPhase[ph]].sort((a, b) => a.date.localeCompare(b.date));
                  return (
                    <Collapsible key={ph} tone="soft" label={ph} count={plural(rows.length, "item")}>
                      <MonthGroups items={rows} dateOf={(x) => x.date} render={(x, i) => <RoadmapLine key={i} row={x} n={i + 1} />} />
                    </Collapsible>
                  );
                })}
                {meetings.length > 0 && (
                  <Collapsible tone="soft" label="Meetings" count={plural(meetings.length, "item")}>
                    <MonthGroups
                      items={meetings}
                      dateOf={(m) => m.date}
                      render={(m, i) => (
                        <Line
                          key={i}
                          marker={<Marker type="Meeting" />}
                          title={m.label}
                          meta={[fmtDT(m.date), m.duration && `${m.duration} min`, m.facilitator && `Facilitator: ${m.facilitator}`]
                            .filter(Boolean)
                            .join(" · ")}
                          note={m.objective}
                          toastText={`${m.label} — ${fmtDT(m.date)}`}
                          right={
                            <>
                              {m.prepStatus && <StatusPill status={m.prepStatus} />}
                              {m.link && (
                                <a href={m.link} target="_blank" rel="noopener" className="btn btn-sm">
                                  <IconVideo width={14} height={14} /> Join
                                </a>
                              )}
                            </>
                          }
                        />
                      )}
                    />
                  </Collapsible>
                )}
              </div>
              <p className="text-[11px] text-muted">Expand a phase or Meetings, then a month, to see its items. Click a row for its date.</p>
            </>
          ) : (
            <Empty>No milestones, sprints, or meetings to visualize.</Empty>
          )}
        </Section>

        <Section
          title="Roadmap heatmap"
          count={rmWeeks.length ? `Wk${rmWeeks[0]}–Wk${rmWeeks.at(-1)}` : undefined}
        >
          {rmWeeks.length ? (
            <WeekHeat weeks={rmWeeks} counts={rmCounts} onPick={(w) => setWeek({ kind: "roadmap", week: w })} />
          ) : (
            <Empty>No roadmap items to visualize.</Empty>
          )}
        </Section>

        <Section title="Feedback & review rounds" count={plural(r.reviewRounds?.length ?? 0, "round")}>
          {r.reviewRounds?.length ? (
            r.reviewRounds.map((rr, ri) => (
              <ReviewRoundCard
                key={ri}
                rr={rr}
                onSaveActivity={(ai, label, status) => {
                  onUpdate((d) => {
                    d.reviewRounds![ri].activities![ai] = { label, status };
                  });
                  toast("Activity saved to this session");
                }}
              />
            ))
          ) : (
            <Empty>No feedback & review rounds on file for this record.</Empty>
          )}
        </Section>

        <Section
          title="Checklist heatmap"
          count={`${clWeeks.length ? `Wk${clWeeks[0]}–Wk${clWeeks.at(-1)} · ` : ""}${plural(r.checklist.length, "item")} · ${overdue} overdue`}
        >
          {clWeeks.length ? (
            <WeekHeat weeks={clWeeks} counts={clCounts} onPick={(w) => setWeek({ kind: "checklist", week: w })} />
          ) : (
            <Empty>No checklist items to visualize.</Empty>
          )}
        </Section>
      </Modal>

      {week && (
        <WeekEditor
          record={r}
          kind={week.kind}
          week={week.week}
          onClose={() => setWeek(null)}
          onUpdate={(fn) => {
            onUpdate(fn);
            toast("Saved to this session (not yet synced to Airtable)");
          }}
        />
      )}
    </>
  );
}

/* ---------------- pieces ---------------- */

function ReviewRoundCard({
  rr,
  onSaveActivity,
}: {
  rr: ReviewRound;
  onSaveActivity: (ai: number, label: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-line p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
      >
        <span className="text-[14px] font-extrabold">
          {rr.roundNumber ? `Round ${rr.roundNumber} — ` : ""}
          {rr.name}
        </span>
        <span className="flex items-center gap-2">
          <StatusPill status={rr.status} />
          <IconChevron width={16} height={16} className={cx("text-muted transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] text-ink-2">
        <span className="chip">{rr.roundType ?? "Review"}</span>
        <span className="chip">{rr.due ? `Due ${fmt(rr.due)}` : "No due date"}</span>
        {rr.reviewer && <span className="chip">Reviewer: {rr.reviewer}</span>}
      </div>
      {(rr.reviewUrl || rr.attachment) && (
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-semibold">
          {rr.reviewUrl && (
            <a href={rr.reviewUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand hover:underline">
              Review link <IconExternal width={13} height={13} />
            </a>
          )}
          {rr.attachment && <span className="text-muted">📎 {rr.attachment}</span>}
        </div>
      )}
      {open && (
        <>
          {rr.reviewNotes && <Para label="Review notes">{rr.reviewNotes}</Para>}
          {rr.reviewActions && <Para label="Review actions">{rr.reviewActions}</Para>}
          <div className="mt-3">
            <div className="field-label">Related activities</div>
            {rr.activities?.length ? (
              <div className="space-y-2">
                {rr.activities.map((a, ai) => (
                  <ActivityRow key={ai} label={a.label} status={a.status} onSave={(l, st) => onSaveActivity(ai, l, st)} />
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted">No related activities on file.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-plane px-3.5 py-3">
      <div className="field-label">{label}</div>
      <div className="text-[12.5px] font-semibold leading-snug">{value}</div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h4 className="mb-3 flex flex-wrap items-baseline gap-2 text-[13px] font-extrabold">
        {title}
        {count && <span className="text-[11px] font-semibold text-muted">{count}</span>}
      </h4>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-plane px-4 py-5 text-center text-[12.5px] text-muted">{children}</div>;
}

function Para({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <div className="field-label">{label}</div>
      <p className="text-[12.5px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function Marker({ type, n }: { type: string; n?: number }) {
  const m = markerFor(type);
  return (
    <span
      className="grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
      style={{ background: m.color }}
    >
      {m.glyph || n}
    </span>
  );
}

function Line({
  marker,
  title,
  meta,
  note,
  right,
  toastText,
}: {
  marker: ReactNode;
  title: string;
  meta: ReactNode;
  note?: string;
  right?: ReactNode;
  toastText?: string;
}) {
  const toast = useToast();
  return (
    <div
      className="flex cursor-pointer items-start gap-3 rounded-xl bg-white px-3 py-2.5 hover:ring-1 hover:ring-line-2"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button")) return;
        if (toastText) toast(toastText);
      }}
    >
      {marker}
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold leading-snug">{title}</div>
        <div className="mt-0.5 text-[11px] text-muted">{meta}</div>
        {note && <div className="mt-1 text-[11.5px] leading-snug text-ink-2">{note}</div>}
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{right}</div>}
    </div>
  );
}

function RoadmapLine({ row, n }: { row: RoadmapRow; n: number }) {
  return (
    <Line
      marker={<Marker type={row.type} n={n} />}
      title={row.label}
      meta={`${fmt(row.date)} · Wk${isoWeek(row.date)} · ${row.type}${row.stage ? ` · ${row.stage}` : ""}`}
      right={row.status && <StatusPill status={row.status} />}
      toastText={`${row.label} — ${fmt(row.date)}`}
    />
  );
}

function MonthGroups<T>({
  items,
  dateOf,
  render,
}: {
  items: T[];
  dateOf: (x: T) => string;
  render: (x: T, i: number) => ReactNode;
}) {
  const groups: Record<string, T[]> = {};
  items.forEach((x) => (groups[monthKeyFor(dateOf(x))] ??= []).push(x));
  return (
    <div className="space-y-1 pl-2">
      {Object.keys(groups)
        .sort()
        .map((mk) => (
          <Collapsible key={mk} label={monthLabelFor(mk)} count={plural(groups[mk].length, "item")}>
            <div className="space-y-1.5">{groups[mk].map(render)}</div>
          </Collapsible>
        ))}
    </div>
  );
}

function heatTone(n: number) {
  return n === 0 ? HEAT[0] : n <= 2 ? HEAT[1] : n <= 5 ? HEAT[2] : HEAT[3];
}

function WeekHeat({ weeks, counts, onPick }: { weeks: number[]; counts: number[]; onPick: (w: number) => void }) {
  return (
    <div>
      <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1">
        {weeks.map((w, i) => {
          const t = heatTone(counts[i]);
          return (
            <button
              key={w}
              type="button"
              onClick={() => onPick(w)}
              title={`Week ${w}: ${plural(counts[i], "item")}`}
              className="flex w-12 shrink-0 flex-col items-center gap-1"
            >
              <span
                className="grid h-11 w-full place-items-center rounded-xl text-[13px] font-extrabold transition hover:scale-105"
                style={{ background: t.bg, color: t.fg }}
              >
                {counts[i]}
              </span>
              <span className="text-[10px] font-semibold text-muted">Wk{w}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        {[
          ["0", HEAT[0]],
          ["1–2", HEAT[1]],
          ["3–5", HEAT[2]],
          ["6+", HEAT[3]],
        ].map(([l, t]) => (
          <span key={l as string} className="flex items-center gap-1.5">
            <span className="size-3 rounded" style={{ background: (t as (typeof HEAT)[number]).bg }} />
            {l as string}
          </span>
        ))}
        <span>· click a week to view &amp; edit its items</span>
      </div>
    </div>
  );
}

function ActivityRow({
  label,
  status,
  onSave,
}: {
  label: string;
  status: string;
  onSave: (label: string, status: string) => void;
}) {
  const [l, setL] = useState(label);
  const [s, setS] = useState(status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className="field min-w-[180px] flex-1" value={l} onChange={(e) => setL(e.target.value)} aria-label="Activity" />
      <select className="field w-auto" value={s} onChange={(e) => setS(e.target.value)} aria-label="Activity status">
        {TASK_STATUS.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <button type="button" className="btn btn-sm" onClick={() => onSave(l, s)}>
        Save
      </button>
    </div>
  );
}

/* ---------------- Week editor (heatmap cell click) ---------------- */

function WeekEditor({
  record: r,
  kind,
  week,
  onClose,
  onUpdate,
}: {
  record: PicsRecord;
  kind: "roadmap" | "checklist";
  week: number;
  onClose: () => void;
  onUpdate: (fn: (r: PicsRecord) => void) => void;
}) {
  const items =
    kind === "roadmap"
      ? r.roadmapRows.map((x, idx) => ({ x, idx })).filter(({ x }) => isoWeek(x.date) === week)
      : r.checklist.map((x, idx) => ({ x, idx })).filter(({ x }) => x.due && isoWeek(x.due) === week);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${r.name} — Wk${week}`}
      subtitle={`${kind === "roadmap" ? "Roadmap" : "Checklist"} items · ${plural(items.length, "item")}`}
    >
      {items.length === 0 && <Empty>No items in this week.</Empty>}
      <div className="space-y-4">
        {kind === "roadmap"
          ? items.map(({ idx }) => (
              <RoadmapForm
                key={idx}
                row={r.roadmapRows[idx]}
                onSave={(row) => onUpdate((d) => void (d.roadmapRows[idx] = row))}
              />
            ))
          : items.map(({ idx }) => (
              <ChecklistForm
                key={idx}
                item={r.checklist[idx]}
                onSave={(it) => onUpdate((d) => void (d.checklist[idx] = it))}
              />
            ))}
      </div>
      <p className="mt-5 text-[11.5px] leading-relaxed text-muted">{SESSION_NOTE}</p>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Opts({ list }: { list: readonly string[] }) {
  return list.map((o) => (
    <option key={o} value={o}>
      {o}
    </option>
  ));
}

function RoadmapForm({ row, onSave }: { row: RoadmapRow; onSave: (r: RoadmapRow) => void }) {
  const [d, setD] = useState(row);
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <Field label="Key outcome">
        <input className="field" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Type">
          <select className="field" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}>
            <Opts list={ROADMAP_TYPES} />
          </select>
        </Field>
        <Field label="Stage">
          <select className="field" value={d.stage ?? ""} onChange={(e) => setD({ ...d, stage: e.target.value })}>
            <Opts list={STAGES} />
          </select>
        </Field>
        <Field label="Date">
          <input type="date" className="field" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value || row.date })} />
        </Field>
      </div>
      <div className="flex justify-end">
        <button type="button" className="btn btn-brand btn-sm" onClick={() => onSave(d)}>
          Save
        </button>
      </div>
    </div>
  );
}

function ChecklistForm({
  item,
  onSave,
}: {
  item: PicsRecord["checklist"][number];
  onSave: (c: PicsRecord["checklist"][number]) => void;
}) {
  const [d, setD] = useState(item);
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <Field label="Checklist item">
        <input className="field" value={d.item} onChange={(e) => setD({ ...d, item: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Due date">
          <input type="date" className="field" value={d.due ?? ""} onChange={(e) => setD({ ...d, due: e.target.value || null })} />
        </Field>
        <Field label="Status">
          <select
            className="field"
            value={d.status}
            onChange={(e) => setD({ ...d, status: e.target.value as typeof d.status })}
          >
            <Opts list={CHECK_STATUS} />
          </select>
        </Field>
        <Field label="Item type">
          <select className="field" value={d.itemType ?? "Task"} onChange={(e) => setD({ ...d, itemType: e.target.value })}>
            <Opts list={ITEM_TYPES} />
          </select>
        </Field>
        <Field label="Task status">
          <select className="field" value={d.taskStatus ?? "Not Started"} onChange={(e) => setD({ ...d, taskStatus: e.target.value })}>
            <Opts list={TASK_STATUS} />
          </select>
        </Field>
        <Field label="Approval status">
          <select
            className="field"
            value={d.approvalStatus ?? "Not Started"}
            onChange={(e) => setD({ ...d, approvalStatus: e.target.value })}
          >
            <Opts list={APPROVAL_STATUS} />
          </select>
        </Field>
        <Field label="Asset type">
          <select className="field" value={d.assetType ?? "Feature"} onChange={(e) => setD({ ...d, assetType: e.target.value })}>
            <Opts list={ASSET_TYPES} />
          </select>
        </Field>
      </div>
      <div className="flex gap-5 text-[12.5px] font-semibold">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-[#5b2be0]"
            checked={!!d.complete}
            onChange={(e) => setD({ ...d, complete: e.target.checked })}
          />
          Complete
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-[#5b2be0]"
            checked={!!d.overdue}
            onChange={(e) => setD({ ...d, overdue: e.target.checked })}
          />
          Overdue
        </label>
      </div>
      <Field label="Notes (ANT / team)">
        <textarea
          className="field"
          rows={2}
          value={d.notes ?? ""}
          placeholder="Add a note for ANT or the team…"
          onChange={(e) => setD({ ...d, notes: e.target.value })}
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-brand btn-sm"
          onClick={() => onSave({ ...d, done: d.status === "done" ? d.due ?? new Date().toISOString().slice(0, 10) : null })}
        >
          Save
        </button>
      </div>
    </div>
  );
}
