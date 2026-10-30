"use client";

/* Small P.I.C.S-only primitives (kept local so shared components stay untouched). */
import type { ReactNode } from "react";
import { HEAT } from "@/components/charts";
import { IconChevron } from "@/components/icons";
import { HEAT_KEY_LABELS, MARKER_COLOR, MARKER_GLYPH, STAGE_COLOR, TYPE_TONE, type MarkerKind } from "@/lib/pics";
import { cx } from "@/lib/utils";

export const SESSION_NOTE = "Saves to this session only — writing back to the live Airtable base needs a connected sync.";
export const SAVED_TOAST = "Saved to this session (not yet synced to Airtable)";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Opts({ list }: { list: readonly string[] }) {
  return list.map((o) => (
    <option key={o} value={o}>
      {o}
    </option>
  ));
}

/** Multi-select as toggle chips (Related Department(s), Report Audience). */
export function ToggleChips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o)}
              className={cx(
                "h-8 rounded-full border px-3 text-[11.5px] font-bold transition",
                on ? "border-brand bg-brand-soft text-brand" : "border-line-2 bg-white text-ink-2 hover:border-brand/40",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** "11–20 of 34" with previous / next arrows. */
export function Pager({
  page,
  maxPage,
  total,
  size,
  onPage,
}: {
  page: number;
  maxPage: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
}) {
  if (total <= size) return null;
  const start = page * size;
  return (
    <div className="flex items-center gap-1.5">
      <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-muted">
        {start + 1}–{Math.min(total, start + size)} of {total}
      </span>
      <button
        type="button"
        aria-label="Previous items"
        disabled={page === 0}
        onClick={() => onPage(Math.max(0, page - 1))}
        className="grid size-7 place-items-center rounded-full bg-plane hover:bg-lav"
      >
        <IconChevron width={14} height={14} className="rotate-90" />
      </button>
      <button
        type="button"
        aria-label="Next items"
        disabled={page >= maxPage}
        onClick={() => onPage(Math.min(maxPage, page + 1))}
        className="grid size-7 place-items-center rounded-full bg-plane hover:bg-lav"
      >
        <IconChevron width={14} height={14} className="-rotate-90" />
      </button>
    </div>
  );
}

/** Heatmap color key (swatch + label) so the shading is legible. */
export function HeatKey({ note }: { note?: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
      {HEAT_KEY_LABELS.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="size-3 rounded" style={{ background: HEAT[i].bg }} />
          {l}
        </span>
      ))}
      {note && <span className="text-ink-2">· {note}</span>}
    </div>
  );
}

export function MarkerDot({ kind, n, size = 28 }: { kind: MarkerKind; n?: number; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
      style={{ background: MARKER_COLOR[kind], width: size, height: size }}
    >
      {kind === "task" && n != null ? n : MARKER_GLYPH[kind]}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-bold", TYPE_TONE[type] ?? "bg-plane text-ink-2")}>{type}</span>;
}

export function StagePill({ stage, small }: { stage: string; small?: boolean }) {
  const c = STAGE_COLOR[stage] ?? "#7B7F8C";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-plane font-bold",
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      )}
      style={{ color: c }}
    >
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {stage}
    </span>
  );
}

export function Empty({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const cls = "w-full rounded-2xl bg-plane px-4 py-5 text-center text-[12.5px] text-muted";
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(cls, "hover:bg-lav")}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-plane px-3.5 py-3">
      <div className="field-label">{label}</div>
      <div className="break-words text-[12.5px] font-semibold leading-snug">{children}</div>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[11.5px] leading-relaxed text-muted">{children}</p>;
}

/** Controlled collapsible group (state lives on the page so it survives closing / reopening a record). */
export function Group({
  label,
  count,
  open,
  onToggle,
  tone = "plain",
  children,
}: {
  label: ReactNode;
  count?: ReactNode;
  open: boolean;
  onToggle: () => void;
  tone?: "plain" | "soft";
  children: ReactNode;
}) {
  return (
    <div className={cx("rounded-2xl", tone === "soft" && "bg-plane")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-plane"
      >
        <span className="flex flex-wrap items-center gap-x-2 text-[12.5px] font-extrabold">
          {label}
          {count != null && <span className="text-[11px] font-semibold text-muted">{count}</span>}
        </span>
        <IconChevron width={16} height={16} className={cx("shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-1 pb-2">{children}</div>}
    </div>
  );
}

/** Read-only checklist row (status dot, disabled checkbox) — click the row or Edit to change it. */
export function ChecklistRow({
  item,
  due,
  status,
  checked,
  sub,
  onEdit,
}: {
  item: string;
  due: string | null;
  status: string;
  checked: boolean;
  sub?: string;
  onEdit: () => void;
}) {
  const dot = status === "overdue" ? "bg-bad" : checked ? "bg-good" : "bg-warn";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-line hover:ring-line-2"
    >
      <input
        type="checkbox"
        disabled
        checked={checked}
        readOnly
        aria-label="Read-only — click the row to edit"
        className="size-4 shrink-0 accent-brand"
      />
      <span className={cx("size-2 shrink-0 rounded-full", dot)} title={status} />
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold leading-snug">{item}</span>
        {sub && <span className="block text-[11px] text-muted">{sub}</span>}
      </span>
      <span className="hidden shrink-0 text-[11px] font-semibold text-muted sm:inline">{due ? fmtShort(due) : "No due date"}</span>
      <button
        type="button"
        className="btn btn-sm shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        Edit
      </button>
    </div>
  );
}

function fmtShort(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
