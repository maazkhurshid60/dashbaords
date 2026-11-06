"use client";

/* P.I.C.S detail modal (openPicsDetailModal / roadmapDetailHtml): timeline, phase & meeting groups,
   roadmap heatmap → week modal, review rounds, checklist heatmap → paginated checklist list. */
import { useState, type ReactNode } from "react";
import { HEAT } from "@/components/charts";
import { IconExternal, IconPlus, IconVideo } from "@/components/icons";
import { Modal, StatusPill, useToast } from "@/components/ui";
import {
  CHECKLIST_PAGE_SIZE,
  ROADMAP_TYPE_KEY,
  heatBucket,
  todayISO,
  markerKind,
  type MarkerKind,
} from "@/lib/pics";
import type { PicsMeeting, PicsRecord, ReviewRound, RoadmapRow } from "@/lib/types";
import { withCurrent } from "@/lib/pics-options";
import { cx, fmt, fmtDT, isoWeek, monthKeyFor, monthLabelFor, pctElapsed, plural, weekRangeFor } from "@/lib/utils";
import {
  ChecklistRow,
  Empty,
  Field,
  Group,
  HeatKey,
  Info,
  MarkerDot,
  Note,
  Opts,
  Pager,
  SAVED_TOAST,
  StagePill,
  TypeBadge,
} from "./pics-ui";
import { usePicsOptions } from "./PicsOptionsContext";

const dateKey = (d: string) => (d.length > 10 ? d.slice(0, 10) : d);
const byDate = <T,>(get: (x: T) => string) => (a: T, b: T) => new Date(get(a)).getTime() - new Date(get(b)).getTime();

export interface DetailHandlers {
  isOpen: (groupKey: string) => boolean;
  toggle: (groupKey: string) => void;
  checklistPage: number;
  setChecklistPage: (p: number) => void;
  isSynced: (row: RoadmapRow) => boolean;
  onAddRoadmap: () => void;
  onAddChecklist: () => void;
  onEditChecklist: (idx: number) => void;
  onUpdateRoadmapRow: (idx: number, row: RoadmapRow) => void;
  onSaveActivity: (rrIdx: number, actIdx: number, label: string, status: string) => void;
  /** Moves the record to another Stage (saved to the Airtable "Stage" field when live). */
  onChangeStage: (stage: string) => void;
  /** Data is live from Airtable (edits save back) rather than the session-only snapshot. */
  live: boolean;
}

export function RecordDetail({
  record: r,
  relationship,
  onClose,
  h,
}: {
  record: PicsRecord;
  relationship: string | null;
  onClose: () => void;
  h: DetailHandlers;
}) {
  // Roadmap week pop-up (selectRoadmapWeek / openRoadmapWeekModal); also drives the active heat-cell highlight.
  const [weekModal, setWeekModal] = useState<number | null>(null);
  const [editWeek, setEditWeek] = useState<number | null>(null);

  const o = usePicsOptions();
  const pct = pctElapsed(r.start, r.end, new Date(todayISO()).getTime());

  const byPhase: Record<string, RoadmapRow[]> = {};
  r.roadmapRows.forEach((x) => (byPhase[x.phase || "Unphased"] ??= []).push(x));
  const phases = [...o.phases.filter((p) => byPhase[p]), ...Object.keys(byPhase).filter((p) => !o.phases.includes(p))];
  const meetings = [...(r.meetings ?? [])].sort(byDate((m) => m.date));
  const totalTimeline = r.roadmapRows.length + meetings.length;

  const rmWeeks = weekRangeFor(r.roadmapRows.map((x) => x.date));
  const rmCounts = rmWeeks.map((w) => r.roadmapRows.filter((x) => isoWeek(x.date) === w).length);

  const reviewRounds = (r.reviewRounds ?? [])
    .map((rr, i) => ({ rr, i }))
    .sort(byDate(({ rr }) => rr.due || "2100-01-01"));

  const clDated = r.checklist.filter((c) => c.due);
  const clWeeks = weekRangeFor(clDated.map((c) => c.due!));
  const clCounts = clWeeks.map((w) => clDated.filter((c) => isoWeek(c.due!) === w).length);
  const overdue = r.checklist.filter((c) => c.status === "overdue").length;
  const clOpen = h.isOpen("checklist-list");

  return (
    <>
      <Modal
        open
        onClose={onClose}
        wide
        title={r.name}
        subtitle={
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={r.type} />
            <StagePill stage={r.stage} />
            <label className="ml-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              Move to
              <select
                className="field h-7 w-auto py-0 text-[11.5px]"
                value={r.stage}
                aria-label="Change stage"
                onChange={(e) => h.onChangeStage(e.target.value)}
              >
                <Opts list={withCurrent(o.stages, r.stage)} />
              </select>
            </label>
          </span>
        }
      >
        <div className={cx("grid grid-cols-1 gap-3 sm:grid-cols-3", relationship && "lg:grid-cols-4")}>
          <Info label="Timeline">
            {fmt(r.start)} → {fmt(r.end)}
          </Info>
          <Info label="Project leads">{r.leads.map((l) => l.i).join(", ")}</Info>
          <Info label="Related department(s)">{r.depts.join(", ")}</Info>
          {relationship && <Info label="Relationship">{relationship}</Info>}
        </div>
        {(r.overview || r.stakeholders || r.briefingLink || r.liveSiteUrl) && (
          <div className="mt-3 space-y-2 rounded-2xl bg-plane px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
            {r.overview && (
              <p>
                <span className="field-label inline">Overview · </span>
                {r.overview}
              </p>
            )}
            {r.stakeholders && (
              <p>
                <span className="field-label inline">Stakeholders · </span>
                {r.stakeholders}
              </p>
            )}
            {(r.briefingLink || r.liveSiteUrl) && (
              <div className="flex flex-wrap gap-3 font-semibold">
                {r.briefingLink && <ExtLink href={r.briefingLink}>Briefing</ExtLink>}
                {r.liveSiteUrl && <ExtLink href={r.liveSiteUrl}>Live site</ExtLink>}
              </div>
            )}
          </div>
        )}

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

        <Section
          title="Milestones, sprints & meetings"
          count={plural(totalTimeline, "item")}
          right={
            <button type="button" className="btn btn-sm" onClick={h.onAddRoadmap}>
              <IconPlus width={14} height={14} /> Add roadmap item
            </button>
          }
        >
          {totalTimeline ? (
            <>
              <MarkerLegend />
              <div className="space-y-1">
                {phases.map((ph) => {
                  const rows = [...byPhase[ph]].sort(byDate((x) => x.date));
                  const key = `phase:${ph}`;
                  return (
                    <Group key={ph} tone="soft" label={ph} count={plural(rows.length, "item")} open={h.isOpen(key)} onToggle={() => h.toggle(key)}>
                      <MonthGroups
                        h={h}
                        groupKey={key}
                        items={rows}
                        dateOf={(x) => x.date}
                        render={(x, i) => <RoadmapLine key={i} row={x} n={i + 1} synced={h.isSynced(x)} />}
                      />
                    </Group>
                  );
                })}
                {meetings.length > 0 && (
                  <Group
                    tone="soft"
                    label="Meetings"
                    count={plural(meetings.length, "item")}
                    open={h.isOpen("meetings")}
                    onToggle={() => h.toggle("meetings")}
                  >
                    <MonthGroups h={h} groupKey="meetings" items={meetings} dateOf={(m) => m.date} render={(m, i) => <MeetingLine key={i} m={m} />} />
                  </Group>
                )}
              </div>
              <p className="text-[11px] text-muted">Expand a phase or Meetings, then a month, to see its items. Click a row for its date.</p>
            </>
          ) : (
            <Empty>No milestones, sprints, or meetings to visualize.</Empty>
          )}
        </Section>

        <Section title="Roadmap heatmap (tasks by week #)" count={rmWeeks.length ? `Wk${rmWeeks[0]}–Wk${rmWeeks.at(-1)}` : undefined}>
          {rmWeeks.length ? (
            <>
              <HeatStrip weeks={rmWeeks} counts={rmCounts} active={weekModal} onPick={(w) => setWeekModal((cur) => (cur === w ? null : w))} />
              <HeatKey note="calendar week numbers — click a week block to see that week's tasks, milestones, sprints & meetings" />
            </>
          ) : (
            <Empty>No roadmap items to visualize.</Empty>
          )}
        </Section>

        <Section title="Feedback & review rounds" count={plural(reviewRounds.length, "round")}>
          {reviewRounds.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {reviewRounds.map(({ rr, i }) => (
                <ReviewRoundCard
                  key={i}
                  rr={rr}
                  open={h.isOpen(`review:${i}`)}
                  onToggle={() => h.toggle(`review:${i}`)}
                  onSaveActivity={(ai, label, status) => h.onSaveActivity(i, ai, label, status)}
                />
              ))}
            </div>
          ) : (
            <Empty>No feedback & review rounds on file for this record.</Empty>
          )}
        </Section>

        <section className="mt-7">
          <button
            type="button"
            aria-expanded={clOpen}
            onClick={() => h.toggle("checklist-list")}
            className="mb-3 flex w-full flex-wrap items-baseline justify-between gap-2 text-left"
          >
            <span className="flex flex-wrap items-baseline gap-2 text-[13px] font-extrabold">
              Checklist heatmap
              <span className="text-[11px] font-semibold text-muted">
                {clWeeks.length ? `Wk${clWeeks[0]}–Wk${clWeeks.at(-1)} · ` : ""}
                {plural(r.checklist.length, "item")} · {overdue} overdue
              </span>
            </span>
            <span className="text-[11.5px] font-bold text-brand">{clOpen ? "Hide checklist" : "Show checklist"}</span>
          </button>
          {clWeeks.length ? (
            <>
              <HeatStrip weeks={clWeeks} counts={clCounts} onPick={() => h.toggle("checklist-list")} />
              <HeatKey note="calendar week numbers · click the heatmap to view & add checklist items" />
            </>
          ) : (
            <Empty onClick={() => h.toggle("checklist-list")}>No checklist items yet — click here to add one.</Empty>
          )}
          {clOpen && <ChecklistList r={r} h={h} />}
        </section>
      </Modal>

      {weekModal != null && (
        <RoadmapWeekModal
          r={r}
          week={weekModal}
          isSynced={h.isSynced}
          onClose={() => setWeekModal(null)}
          onEdit={() => setEditWeek(weekModal)}
        />
      )}
      {editWeek != null && (
        <RoadmapWeekEditor r={r} week={editWeek} live={h.live} onClose={() => setEditWeek(null)} onSave={h.onUpdateRoadmapRow} />
      )}
    </>
  );
}

/* ---------------- Checklist (paginated, read-only rows → edit modal) ---------------- */
function ChecklistList({ r, h }: { r: PicsRecord; h: DetailHandlers }) {
  const total = r.checklist.length;
  const maxPage = Math.max(0, Math.ceil(total / CHECKLIST_PAGE_SIZE) - 1);
  const page = Math.min(h.checklistPage, maxPage);
  const start = page * CHECKLIST_PAGE_SIZE;
  const items = r.checklist.map((c, idx) => ({ c, idx })).slice(start, start + CHECKLIST_PAGE_SIZE);
  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2 text-[13px] font-extrabold">
          Checklist <span className="text-[11px] font-semibold text-muted">{plural(total, "item")}</span>
        </div>
        <PagerInline page={page} maxPage={maxPage} total={total} onPage={h.setChecklistPage} />
      </div>
      <button type="button" className="btn btn-sm" onClick={h.onAddChecklist}>
        <IconPlus width={14} height={14} /> Add checklist item
      </button>
      {items.length ? (
        items.map(({ c, idx }) => (
          <ChecklistRow
            key={idx}
            item={c.item}
            due={c.due}
            status={c.status}
            checked={!!c.complete || c.status === "done"}
            onEdit={() => h.onEditChecklist(idx)}
          />
        ))
      ) : (
        <Empty>No checklist items yet.</Empty>
      )}
      <p className="text-[11px] text-muted">Checkboxes are read-only — click a row, or its Edit button, to change status, due date, or notes.</p>
    </div>
  );
}

function PagerInline(p: { page: number; maxPage: number; total: number; onPage: (n: number) => void }) {
  return <Pager {...p} size={CHECKLIST_PAGE_SIZE} />;
}

/* ---------------- Roadmap week pop-up: type boxes with counts → that type's items ---------------- */
function roadmapItemsForWeek(r: PicsRecord, week: number) {
  return r.roadmapRows.filter((x) => isoWeek(x.date) === week);
}
function roadmapMeetingsForWeek(r: PicsRecord, week: number) {
  return (r.meetings ?? []).filter((m) => isoWeek(dateKey(m.date)) === week);
}
function roadmapWeekTypeCounts(r: PicsRecord, week: number): Record<MarkerKind, number> {
  const items = roadmapItemsForWeek(r, week);
  return {
    task: items.filter((x) => markerKind(x.type) === "task").length,
    milestone: items.filter((x) => markerKind(x.type) === "milestone").length,
    sprint: items.filter((x) => markerKind(x.type) === "sprint").length,
    meeting: roadmapMeetingsForWeek(r, week).length,
  };
}

function RoadmapWeekModal({
  r,
  week,
  isSynced,
  onClose,
  onEdit,
}: {
  r: PicsRecord;
  week: number;
  isSynced: (row: RoadmapRow) => boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [type, setType] = useState<MarkerKind | null>(null);
  const counts = roadmapWeekTypeCounts(r, week);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const rows = roadmapItemsForWeek(r, week);

  let body: ReactNode = <p className="mt-3 text-[11.5px] text-muted">Click a box above to see that week&apos;s items.</p>;
  if (type === "meeting") {
    const ms = roadmapMeetingsForWeek(r, week).sort(byDate((m) => m.date));
    body = (
      <div className="mt-3 space-y-1.5">
        {ms.length ? ms.map((m, i) => <MeetingLine key={i} m={m} />) : <Empty>No meetings in Wk{week} for this record.</Empty>}
      </div>
    );
  } else if (type) {
    const its = rows.filter((x) => markerKind(x.type) === type).sort(byDate((x) => x.date));
    const emptyLabel = type === "task" ? "tasks or subtasks" : `${type}s`;
    body = (
      <div className="mt-3 space-y-1.5">
        {its.length ? (
          its.map((x, i) => <RoadmapLine key={i} row={x} n={i + 1} synced={isSynced(x)} />)
        ) : (
          <Empty>
            No {emptyLabel} in Wk{week} for this record.
          </Empty>
        )}
      </div>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-baseline gap-2">
          Week {week} <span className="text-[12px] font-semibold text-muted">{plural(total, "item")}</span>
        </span>
      }
      subtitle={r.name}
      footer={
        rows.length > 0 && (
          <button type="button" className="btn btn-sm" onClick={onEdit}>
            Edit this week&apos;s roadmap items
          </button>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROADMAP_TYPE_KEY.map((k) => (
          <button
            key={k.key}
            type="button"
            aria-pressed={type === k.key}
            onClick={() => setType((t) => (t === k.key ? null : k.key))}
            className={cx(
              "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[12px] font-bold transition",
              type === k.key ? "border-brand bg-brand-soft" : "border-line hover:border-line-2 hover:bg-plane",
            )}
          >
            <MarkerDot kind={k.key} size={22} />
            <span className="min-w-0 flex-1 leading-tight">{k.label}</span>
            <span className="tabular-nums text-ink-2">{counts[k.key]}</span>
          </button>
        ))}
      </div>
      {body}
    </Modal>
  );
}

/* Week editor for roadmap rows (the original's per-week edit form, reached from the week pop-up). */
function RoadmapWeekEditor({
  r,
  week,
  live,
  onClose,
  onSave,
}: {
  r: PicsRecord;
  week: number;
  live: boolean;
  onClose: () => void;
  onSave: (idx: number, row: RoadmapRow) => void;
}) {
  const toast = useToast();
  const items = r.roadmapRows.map((x, idx) => ({ x, idx })).filter(({ x }) => isoWeek(x.date) === week);
  return (
    <Modal open onClose={onClose} title={`${r.name} — Wk${week}`} subtitle={`Roadmap items · ${plural(items.length, "item")}`}>
      {items.length === 0 && <Empty>No items in this week.</Empty>}
      <div className="space-y-4">
        {items.map(({ x, idx }) => (
          <RoadmapForm
            key={`${idx}-${x.date}`}
            row={x}
            onSave={(row) => {
              onSave(idx, row);
              // Live rows confirm (or revert) from the Airtable save instead.
              if (!(live && /^rec/.test(row.atId ?? ""))) toast(SAVED_TOAST);
            }}
          />
        ))}
      </div>
      <Note>
        {live
          ? "Edits update this dashboard's cards, stat tiles and heatmaps immediately and save to the P.I.C.S Roadmaps table in Airtable (title, type, stage, due date). The Task Planning mirror stays session-only."
          : "Edits update this dashboard's cards, stat tiles and heatmaps immediately. They save to this session only — Airtable is unavailable, so this is snapshot data."}
      </Note>
    </Modal>
  );
}

function RoadmapForm({ row, onSave }: { row: RoadmapRow; onSave: (r: RoadmapRow) => void }) {
  const o = usePicsOptions();
  const [d, setD] = useState(row);
  // Choices from the Airtable Roadmaps fields; a row's legacy value stays selectable so the form still shows it.
  const typeOptions = withCurrent(o.roadmapTypes, row.type);
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <Field label="Key outcome">
        <input className="field" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Type">
          <select className="field" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}>
            <Opts list={typeOptions} />
          </select>
        </Field>
        <Field label="Stage">
          <select className="field" value={d.stage ?? ""} onChange={(e) => setD({ ...d, stage: e.target.value || undefined })}>
            {!row.stage && <option value="">—</option>}
            <Opts list={withCurrent(o.roadmapStages, row.stage)} />
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

/* ---------------- pieces ---------------- */

function Section({ title, count, right, children }: { title: string; count?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex flex-wrap items-baseline gap-2 text-[13px] font-extrabold">
          {title}
          {count && <span className="text-[11px] font-semibold text-muted">{count}</span>}
        </h4>
        {right}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand hover:underline">
      {children} <IconExternal width={13} height={13} />
    </a>
  );
}

function MarkerLegend() {
  return (
    <div className="mb-2 flex flex-wrap gap-3 text-[11px] font-semibold text-ink-2">
      {ROADMAP_TYPE_KEY.map((k) => (
        <span key={k.key} className="flex items-center gap-1.5">
          <MarkerDot kind={k.key} size={20} />
          {k.label}
        </span>
      ))}
    </div>
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
  toastText: string;
}) {
  const toast = useToast();
  return (
    <div
      className="flex cursor-pointer flex-wrap items-start gap-3 rounded-xl bg-white px-3 py-2.5 hover:ring-1 hover:ring-line-2 sm:flex-nowrap"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button")) return;
        toast(toastText);
      }}
    >
      {marker}
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold leading-snug">{title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">{meta}</div>
        {note && <div className="mt-1 text-[11.5px] leading-snug text-ink-2">{note}</div>}
      </div>
      {right && <div className="flex flex-wrap items-center justify-end gap-1.5 sm:shrink-0">{right}</div>}
    </div>
  );
}

function RoadmapLine({ row, n, synced }: { row: RoadmapRow; n: number; synced: boolean }) {
  return (
    <Line
      marker={<MarkerDot kind={markerKind(row.type)} n={n} />}
      title={row.label}
      meta={
        <>
          <span>{fmt(row.date)}</span>
          <span>Wk{isoWeek(row.date)}</span>
          {row.status && <StatusPill status={row.status} className="h-5 px-2 text-[10px]" />}
        </>
      }
      right={
        <>
          <span className="chip">{row.type}</span>
          {row.stage && <StagePill stage={row.stage} small />}
          {synced && (
            <span className="rounded-full bg-good-soft px-2 py-0.5 text-[10px] font-bold text-good" title="Synced to Task Planning">
              ✓ Synced
            </span>
          )}
        </>
      }
      toastText={`${row.label} — ${fmt(row.date)}`}
    />
  );
}

function MeetingLine({ m }: { m: PicsMeeting }) {
  return (
    <Line
      marker={<MarkerDot kind="meeting" />}
      title={m.label}
      meta={[fmtDT(m.date), m.duration && `${m.duration} min`, m.facilitator && `Facilitator: ${m.facilitator}`].filter(Boolean).join(" · ")}
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
  );
}

function MonthGroups<T>({
  h,
  groupKey,
  items,
  dateOf,
  render,
}: {
  h: DetailHandlers;
  groupKey: string;
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
        .map((mk) => {
          const key = `${groupKey}::month:${mk}`;
          return (
            <Group key={mk} label={monthLabelFor(mk)} count={plural(groups[mk].length, "item")} open={h.isOpen(key)} onToggle={() => h.toggle(key)}>
              <div className="space-y-1.5">{groups[mk].map(render)}</div>
            </Group>
          );
        })}
    </div>
  );
}

function HeatStrip({
  weeks,
  counts,
  active,
  onPick,
}: {
  weeks: number[];
  counts: number[];
  active?: number | null;
  onPick: (w: number) => void;
}) {
  return (
    <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1">
      {weeks.map((w, i) => {
        const t = HEAT[heatBucket(counts[i])];
        return (
          <button
            key={w}
            type="button"
            onClick={() => onPick(w)}
            title={`Week ${w}: ${plural(counts[i], "item")}`}
            aria-pressed={active === w}
            className="flex w-12 shrink-0 flex-col items-center gap-1"
          >
            <span
              className={cx(
                "grid h-11 w-full place-items-center rounded-xl text-[13px] font-extrabold transition hover:scale-105",
                active === w && "ring-2 ring-ink ring-offset-2",
              )}
              style={{ background: t.bg, color: t.fg }}
            >
              {counts[i]}
            </span>
            <span className="text-[10px] font-semibold text-muted">Wk{w}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReviewRoundCard({
  rr,
  open,
  onToggle,
  onSaveActivity,
}: {
  rr: ReviewRound;
  open: boolean;
  onToggle: () => void;
  onSaveActivity: (ai: number, label: string, status: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
        <span className="text-[14px] font-extrabold">
          {rr.roundNumber ? `Round ${rr.roundNumber} — ` : ""}
          {rr.name}
        </span>
        <StatusPill status={rr.status} />
      </button>
      <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] text-ink-2">
        <span className="chip">{rr.roundType ?? "Review"}</span>
        <span className="chip">{rr.due ? `Due ${fmt(rr.due)}` : "No due date set"}</span>
        {rr.reviewer && <span className="chip">Reviewer: {rr.reviewer}</span>}
      </div>
      {(rr.reviewUrl || rr.attachment) && (
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-semibold">
          {rr.reviewUrl && <ExtLink href={rr.reviewUrl}>Review link</ExtLink>}
          {rr.attachment && <span className="text-muted">📎 {rr.attachment}</span>}
        </div>
      )}
      <button type="button" onClick={onToggle} className="mt-3 text-[11.5px] font-bold text-brand hover:underline">
        {open ? "Hide notes & activities" : "Show notes & activities"}
      </button>
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

function Para({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <div className="field-label">{label}</div>
      <p className="text-[12.5px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function ActivityRow({ label, status, onSave }: { label: string; status: string; onSave: (label: string, status: string) => void }) {
  const o = usePicsOptions();
  const [l, setL] = useState(label);
  const [s, setS] = useState(status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className="field min-w-0 flex-1 basis-[160px]" value={l} onChange={(e) => setL(e.target.value)} aria-label="Activity" />
      <select className="field w-auto" value={s} onChange={(e) => setS(e.target.value)} aria-label="Activity status">
        <Opts list={withCurrent(o.checklistStatus, status)} />
      </select>
      <button type="button" className="btn btn-sm" onClick={() => onSave(l, s)}>
        Save
      </button>
    </div>
  );
}
