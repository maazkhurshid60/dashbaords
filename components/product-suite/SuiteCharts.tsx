"use client";

/* lineChart / barChart / hbars / spark from the originals, rebuilt as React SVG.
   Thin marks (2px lines, ≤18px bars, 4px rounded data ends), one y-axis, dashed
   recessive grid, legend whenever ≥2 series, text in ink colours. */
import { useCallback, useState, type ReactNode } from "react";
import { HEAT } from "@/components/charts";
import { cx } from "@/lib/utils";
import { fmtN } from "./format";

const GRID = "#e2e5ee";
const AXIS_TEXT = "#9a9fad";
const INK2 = "#555a69";

export function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Measure an element's width (ResizeObserver) — charts lay out to the real width. */
function useWidth(): [(el: HTMLDivElement | null) => void, number] {
  const [w, setW] = useState(0);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Tip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[140px] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl bg-ink px-3 py-2 text-[11.5px] leading-snug text-white shadow-pop"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}
const TipRow = ({ color, name, value }: { color: string; name: string; value: string }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="flex items-center gap-1.5">
      <i className="inline-block size-2 rounded-full" style={{ background: color }} />
      {name}
    </span>
    <b className="tabular-nums">{value}</b>
  </div>
);

export function Legend({
  items,
  onToggle,
  className,
}: {
  items: { name: string; color: string; off?: boolean; square?: boolean; outline?: boolean }[];
  onToggle?: (i: number) => void;
  className?: string;
}) {
  return (
    <div className={cx("mt-3 flex flex-wrap gap-x-4 gap-y-1.5", className)}>
      {items.map((s, i) => {
        const body = (
          <>
            <i
              className={cx("inline-block shrink-0", s.square ? "size-3 rounded-[3px]" : "h-2.5 w-4 rounded-full")}
              style={s.outline ? { background: "#fff", border: `2px solid ${s.color}` } : { background: s.color }}
            />
            {s.name}
          </>
        );
        const cls = cx("flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2", s.off && "opacity-40 line-through");
        return onToggle ? (
          <button key={s.name} type="button" aria-pressed={!s.off} onClick={() => onToggle(i)} className={cx(cls, "cursor-pointer")}>
            {body}
          </button>
        ) : (
          <span key={s.name} className={cls}>
            {body}
          </span>
        );
      })}
    </div>
  );
}

export const NoData = () => (
  <div className="rounded-2xl bg-plane/60 px-4 py-8 text-center text-[12.5px] font-medium text-muted">No data yet</div>
);

/* ---------------- line chart ---------------- */
export interface LineSeries {
  name: string;
  color: string;
  values: (number | null)[];
  dash?: boolean;
}
export function LineChart({
  labels,
  series,
  h = 240,
  yFmt,
  yMax,
  aria = "line chart",
  legend = true,
}: {
  labels: string[];
  series: LineSeries[];
  h?: number;
  yFmt?: (v: number) => string;
  yMax?: number;
  aria?: string;
  legend?: boolean;
}) {
  const [ref, w] = useWidth();
  const [hidden, setHidden] = useState<string[]>([]);
  const [hi, setHi] = useState<number | null>(null);
  const empty = !series.length || series.every((s) => s.values.every((v) => v == null));
  const W = Math.max(300, Math.round(w || 720)),
    H = h,
    L = 44,
    Rr = series.length <= 4 && W >= 420 ? 110 : 16,
    T = 12,
    B = 26;
  const vis = series.filter((s) => !hidden.includes(s.name));
  const all = vis.flatMap((s) => s.values.filter((v): v is number => v != null));
  const max = yMax || niceMax(Math.max(1, ...all));
  const n = labels.length,
    xw = (W - L - Rr) / Math.max(1, n - 1);
  const X = (i: number) => L + i * xw,
    Y = (v: number) => T + (H - T - B) * (1 - v / max);
  const yf = yFmt || ((v: number) => (max < 20 && v % 1 ? v.toFixed(1) : fmtN(v)));
  const step = Math.ceil(n / Math.max(2, Math.min(7, Math.floor((W - L - Rr) / 58))));
  const lastIdx = (s: LineSeries) => s.values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop();
  const ends = vis
    .map((s) => {
      const li = lastIdx(s);
      return li == null ? null : { s, x: X(li), dotY: Y(s.values[li] as number), y: Y(s.values[li] as number) };
    })
    .filter((e): e is NonNullable<typeof e> => !!e)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;

  return (
    <div ref={ref} className="relative min-w-0" onMouseLeave={() => setHi(null)}>
      {empty ? (
        <NoData />
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={aria} className="block overflow-visible">
            <g fontSize={10.5} fill={AXIS_TEXT}>
              {[0, 1, 2, 3, 4].map((k) => {
                const v = (max * k) / 4,
                  y = Y(v);
                return (
                  <g key={k}>
                    <line x1={L} x2={W - Rr} y1={y} y2={y} stroke={GRID} strokeDasharray={k === 0 ? undefined : "3 4"} />
                    <text x={L - 8} y={y + 3.5} textAnchor="end">
                      {yf(v)}
                    </text>
                  </g>
                );
              })}
              {labels.map((lb, i) =>
                i % step === 0 || i === n - 1 ? (
                  <text key={i} x={X(i)} y={H - 6} textAnchor="middle">
                    {lb}
                  </text>
                ) : null,
              )}
            </g>
            {vis.map((s) => {
              let d = "",
                pen = false;
              s.values.forEach((v, i) => {
                if (v == null) {
                  pen = false;
                  return;
                }
                d += (pen ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1);
                pen = true;
              });
              return (
                <path
                  key={s.name}
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dash ? "5 4" : undefined}
                />
              );
            })}
            {vis.length <= 4 &&
              ends.map((e) => (
                <g key={e.s.name}>
                  <circle cx={e.x} cy={e.dotY} r={4} fill={e.s.color} stroke="#fff" strokeWidth={2} />
                  {Rr > 16 && (
                    <text x={e.x + 8} y={e.y + 3.5} fontSize={10.5} fontWeight={600} fill={INK2}>
                      {e.s.name.length > 16 ? e.s.name.slice(0, 15) + "…" : e.s.name}
                    </text>
                  )}
                </g>
              ))}
            {hi != null && <line x1={X(hi)} x2={X(hi)} y1={T} y2={H - B} stroke="#15171c" strokeOpacity={0.25} />}
            <rect
              x={L}
              y={T}
              width={Math.max(1, W - L - Rr)}
              height={H - T - B}
              fill="transparent"
              onMouseMove={(e) => {
                const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const sx = ((e.clientX - r.left) * W) / r.width;
                setHi(Math.max(0, Math.min(n - 1, Math.round((sx - L) / xw))));
              }}
            />
          </svg>
          {hi != null && (
            <Tip x={(X(hi) * (w || W)) / W} y={T + 8}>
              <div className="mb-1 font-bold">{labels[hi]}</div>
              {vis.map((s) => (
                <TipRow key={s.name} color={s.color} name={s.name} value={s.values[hi] == null ? "—" : yf(s.values[hi] as number)} />
              ))}
            </Tip>
          )}
        </>
      )}
      {!empty && series.length >= 2 && legend && (
        <Legend
          items={series.map((s) => ({ name: s.name, color: s.color, off: hidden.includes(s.name) }))}
          onToggle={(i) => {
            const nm = series[i].name;
            setHidden((hd) => (hd.includes(nm) ? hd.filter((x) => x !== nm) : [...hd, nm]));
          }}
        />
      )}
    </div>
  );
}

/* ---------------- grouped vertical bars ---------------- */
export function BarChart({
  labels,
  series,
  h = 220,
  yFmt,
  aria = "bar chart",
}: {
  labels: string[];
  series: { name: string; color: string; values: (number | null)[] }[];
  h?: number;
  yFmt?: (v: number) => string;
  aria?: string;
}) {
  const [ref, w] = useWidth();
  const [hi, setHi] = useState<number | null>(null);
  if (!labels.length) return <NoData />;
  const W = Math.max(300, Math.round(w || 720)),
    H = h,
    L = 40,
    Rr = 10,
    T = 12,
    B = 26;
  const n = labels.length,
    k = series.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  const band = (W - L - Rr) / n,
    bw = Math.max(2, Math.min(18, (band * 0.7 - 2 * (k - 1)) / Math.max(1, k)));
  const Y = (v: number) => T + (H - T - B) * (1 - v / max);
  const yf = yFmt || ((v: number) => (max < 20 && v % 1 ? v.toFixed(1) : fmtN(v)));
  const lblStep = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L - Rr) / 52))));
  return (
    <div ref={ref} className="relative min-w-0" onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={aria} className="block">
        <g fontSize={10.5} fill={AXIS_TEXT}>
          {[0, 1, 2, 3, 4].map((q) => {
            const v = (max * q) / 4;
            return (
              <g key={q}>
                <line x1={L} x2={W - Rr} y1={Y(v)} y2={Y(v)} stroke={GRID} strokeDasharray={q === 0 ? undefined : "3 4"} />
                <text x={L - 8} y={Y(v) + 3.5} textAnchor="end">
                  {yf(v)}
                </text>
              </g>
            );
          })}
          {labels.map((lb, i) =>
            i % lblStep === 0 ? (
              <text key={i} x={L + band * i + band / 2} y={H - 6} textAnchor="middle">
                {lb.length > 14 ? lb.slice(0, 13) + "…" : lb}
              </text>
            ) : null,
          )}
        </g>
        {labels.map((lb, i) => {
          const gx = L + band * i + (band - (bw * k + 2 * (k - 1))) / 2;
          return (
            <g key={i} onMouseEnter={() => setHi(i)}>
              <rect x={L + band * i} y={T} width={band} height={H - T - B} fill={hi === i ? "#efe9fd" : "transparent"} opacity={0.6} />
              {series.map((s, j) => {
                const v = s.values[i];
                if (v == null || v <= 0) return null;
                const x = gx + j * (bw + 2),
                  y = Y(v),
                  hh = Math.max(0, H - B - y);
                const r = Math.min(4, bw / 2, hh);
                return (
                  <path
                    key={j}
                    d={`M${x},${H - B} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${H - B} Z`}
                    fill={s.color}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      {hi != null && (
        <Tip x={((L + band * hi + band / 2) * (w || W)) / W} y={T + 8}>
          <div className="mb-1 font-bold">{labels[hi]}</div>
          {series.map((s) => (
            <TipRow key={s.name} color={s.color} name={s.name} value={s.values[hi] == null ? "—" : yf(s.values[hi] as number)} />
          ))}
        </Tip>
      )}
      {k >= 2 && <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />}
    </div>
  );
}

/* ---------------- horizontal bars ---------------- */
export interface HBarRow {
  n: string;
  v: number;
  c?: string;
  dot?: ReactNode;
  onClick?: () => void;
}
export function HBars({ rows, max: maxIn, fmt }: { rows: HBarRow[]; max?: number; fmt?: (v: number) => string }) {
  const max = maxIn || Math.max(1, ...rows.map((r) => r.v));
  return (
    <div className="grid gap-2">
      {rows.map((r) => {
        const val = fmt ? fmt(r.v) : String(r.v);
        const Tag = r.onClick ? "button" : "div";
        return (
          <Tag
            key={r.n}
            type={r.onClick ? "button" : undefined}
            onClick={r.onClick}
            title={`${r.n}: ${val}`}
            className={cx("grid w-full grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-left text-[12px]", r.onClick && "cursor-pointer")}
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-ink">
              {r.dot}
              <span className="truncate">{r.n}</span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-plane">
              <span
                className="block h-full rounded-r-[4px]"
                style={{ width: `${Math.max(1.5, (100 * r.v) / max)}%`, background: r.c || "#5b2be0" }}
              />
            </span>
            <span className="min-w-[2.5rem] text-right font-bold tabular-nums text-ink">{val}</span>
          </Tag>
        );
      })}
    </div>
  );
}

/* ---------------- sparkline ---------------- */
export function Spark({ vals, color = "#5b2be0", w = 90, h = 24 }: { vals: number[]; color?: string; w?: number; h?: number }) {
  const m = Math.max(...vals),
    mn = Math.min(...vals);
  const X = (i: number) => i * (w / (vals.length - 1)),
    Y = (v: number) => h - 2 - (h - 4) * ((v - mn) / (m - mn || 1));
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path
        d={vals.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1)).join("")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sequential colour for 0..1 on the violet HEAT ramp (replaces the original seqColor). */
export function heatColor(t: number) {
  const i = t < 0.25 ? 0 : t < 0.5 ? 1 : t < 0.75 ? 2 : 3;
  return HEAT[i];
}
export const HEAT_KEY = [
  { name: "75–100% stay", color: HEAT[3].bg },
  { name: "50–75%", color: HEAT[2].bg },
  { name: "25–50%", color: HEAT[1].bg },
  { name: "under 25%", color: HEAT[0].bg },
];
