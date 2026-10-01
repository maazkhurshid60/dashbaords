"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";

/* Categorical order validated with the dataviz palette checker (light surface):
   lightness band, chroma, CVD + normal-vision separation all pass; the lighter
   slots rely on the always-visible legend values for contrast relief. */
export const SERIES = ["#5b2be0", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#2a78d6", "#008300"];

/* Two-series pair used for side-by-side bars (violet + periwinkle). */
export const PAIR = ["#5b2be0", "#a3a5f5"] as const;

/* Sequential violet ramp for heatmaps (empty → heavy). */
export const HEAT = [
  { bg: "#f3f4f8", fg: "#9a9fad" },
  { bg: "#e4dcfb", fg: "#4a1fc4" },
  { bg: "#a98af0", fg: "#ffffff" },
  { bg: "#5b2be0", fg: "#ffffff" },
];

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-[11.5px] leading-snug text-white shadow-pop"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}

/* ---------------- Donut ---------------- */

export interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
  sub?: string;
}

export function Donut({
  data,
  size = 200,
  thickness = 34,
  centerLabel,
  centerValue,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: ReactNode;
}) {
  const [hover, setHover] = useState<{ d: DonutDatum; x: number; y: number } | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = data.length > 1 ? 3 : 0;
  let acc = 0;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f2f7" strokeWidth={thickness} />
        {total > 0 &&
          data.map((d) => {
            const len = (d.value / total) * c;
            const dash = Math.max(len - gap, 0.5);
            const el = (
              <circle
                key={d.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={hover?.d.key === d.key ? thickness + 6 : thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-acc}
                className="cursor-pointer transition-[stroke-width] duration-150"
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ d, x: e.clientX - box.left, y: e.clientY - box.top });
                }}
                onMouseLeave={() => setHover(null)}
              />
            );
            acc += len;
            return el;
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[28px] font-extrabold leading-none tracking-tight">
            {hover ? hover.d.value : centerValue ?? total}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-muted">
            {hover ? `${Math.round((hover.d.value / total) * 100)}%` : centerLabel}
          </div>
        </div>
      </div>
      {hover && (
        <Tooltip x={hover.x} y={hover.y}>
          <div className="font-bold">{hover.d.label}</div>
          {hover.d.sub && <div className="text-white/70">{hover.d.sub}</div>}
          <div>
            {hover.d.value} · {Math.round((hover.d.value / total) * 100)}%
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export function DonutLegend({ data, unit, total: totalIn }: { data: DonutDatum[]; unit: string; total?: number }) {
  const total = totalIn ?? data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="grid gap-1.5">
      {data.map((d) => (
        <li key={d.key} className="flex items-center gap-2.5 text-[12.5px]">
          <span className="h-2.5 w-4 shrink-0 rounded-full" style={{ background: d.color }} />
          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{d.label}</span>
          <span className="tabular-nums text-ink-2">
            {d.value} {unit} · {total ? Math.round((d.value / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Grouped bars (one shared y-axis) ---------------- */

export interface BarGroup {
  key: string;
  label: string;
  values: number[];
  tip?: ReactNode;
}

export function GroupedBars({
  groups,
  series,
  height = 210,
  colors = [...PAIR],
}: {
  groups: BarGroup[];
  series: string[];
  height?: number;
  colors?: string[];
}) {
  const [hover, setHover] = useState<{ g: BarGroup; x: number; y: number } | null>(null);
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        {series.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
            <span className="size-2.5 rounded-full" style={{ background: colors[i] }} />
            {s}
          </span>
        ))}
      </div>
      <div className="relative flex" style={{ height }}>
        {/* y axis */}
        <div className="relative w-8 shrink-0">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 -translate-y-1/2 text-[10.5px] tabular-nums text-muted"
              style={{ bottom: `${(t / top) * 100}%`, transform: "translateY(50%)" }}
            >
              {t}
            </span>
          ))}
        </div>
        <div
          className="relative flex-1"
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <div
              key={t}
              className={cx("absolute inset-x-0 border-t", t === 0 ? "border-line-2" : "border-dashed border-line")}
              style={{ bottom: `${(t / top) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-2 px-1">
            {groups.map((g) => (
              <div
                key={g.key}
                className={cx(
                  "flex h-full flex-1 cursor-pointer items-end justify-center gap-[3px] rounded-t-xl transition-colors",
                  hover?.g.key === g.key && "bg-brand-soft/60",
                )}
                onMouseMove={(e) => {
                  const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                  setHover({ g, x: e.clientX - box.left + 32, y: e.clientY - box.top });
                }}
              >
                {g.values.map((v, i) => (
                  <div
                    key={i}
                    className="w-[22%] max-w-[18px] rounded-t-[5px]"
                    style={{ height: `${(v / top) * 100}%`, background: colors[i], minHeight: v ? 3 : 0 }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {hover && (
          <Tooltip x={hover.x} y={hover.y}>
            {hover.g.tip ?? (
              <>
                <div className="font-bold">{hover.g.label}</div>
                {series.map((s, i) => (
                  <div key={s}>
                    {s}: {hover.g.values[i]}
                  </div>
                ))}
              </>
            )}
          </Tooltip>
        )}
      </div>
      <div className="ml-8 mt-2 flex justify-around gap-2 px-1">
        {groups.map((g) => (
          <span key={g.key} className="flex-1 truncate text-center text-[11px] font-semibold text-muted">
            {g.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/* ---------------- Stat tile ---------------- */

export function StatTile({
  label,
  value,
  delta,
  tone = "brand",
  active,
  onClick,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  tone?: "brand" | "good" | "bad" | "warn" | "plain";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    brand: "bg-brand-soft text-brand",
    good: "bg-good-soft text-good",
    bad: "bg-bad-soft text-bad",
    warn: "bg-warn-soft text-warn",
    plain: "bg-plane text-ink-2",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cx(
        "card flex min-w-0 flex-col items-start p-5 text-left transition",
        onClick && "cursor-pointer hover:-translate-y-0.5",
        active && "ring-2 ring-brand",
      )}
    >
      <div className="text-[13px] font-bold text-ink">{label}</div>
      <div className="mt-2 flex items-end gap-3">
        <span className="text-[40px] font-extrabold leading-none tracking-tight">{value}</span>
        {delta && <span className={cx("mb-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11.5px] font-bold", tones[tone])}>{delta}</span>}
      </div>
    </Tag>
  );
}
