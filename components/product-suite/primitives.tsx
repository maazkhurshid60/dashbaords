"use client";

/* Small building blocks for the Product + Communications pages: pills, KPI tiles,
   cards, rows and progress bars — all on the app's design tokens. */
import type { CSSProperties, ReactNode } from "react";
import { IconExternal } from "@/components/icons";
import { cx } from "@/lib/utils";
import {
  SENT_TONE, STAGE, STAGE_HELP, STAGE_TONE, STATUS2_TONE, STATUS_TONE, personaColor, sevInfo, status2Label, toneFor, type Tone,
} from "./format";

export const TONE_PILL: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  info: "bg-brand-soft text-brand",
  teal: "bg-teal-soft text-teal",
  purple: "bg-[#f4eafb] text-violet",
  plain: "bg-plane text-ink-2",
};
export const TONE_TEXT: Record<Tone | "", string> = {
  good: "text-good",
  bad: "text-bad",
  warn: "text-warn",
  info: "text-brand",
  teal: "text-teal",
  purple: "text-violet",
  plain: "text-muted",
  "": "text-ink",
};

export function Pill({ tone = "plain", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cx("inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold", TONE_PILL[tone], className)}
    >
      {children}
    </span>
  );
}

export const StagePill = ({ s }: { s: string }) => {
  const p = STAGE[s] || s;
  return (
    <Pill tone={STAGE_TONE[p] || "plain"} title={STAGE_HELP[p] || ""}>
      {p}
    </Pill>
  );
};
export const StatusPill1 = ({ s }: { s: string }) => <Pill tone={STATUS_TONE[s] || "plain"}>{s}</Pill>;
export const StatusPill2 = ({ s, label }: { s: string; label?: string }) => <Pill tone={STATUS2_TONE[s] || "plain"}>{label ?? status2Label(s)}</Pill>;
export const SentPill = ({ s }: { s: string }) => <Pill tone={SENT_TONE[s] || "plain"}>{s}</Pill>;
export const SevPill = ({ s }: { s: string }) => {
  const { tone, label } = sevInfo(s);
  return <Pill tone={tone}>{label}</Pill>;
};
export const MoodPill = ({ m }: { m: string }) => (
  <Pill tone={({ Happy: "good", Mixed: "warn", Unhappy: "bad" } as Record<string, Tone>)[m] || "plain"}>
    {m === "Happy" ? "☺ " : m === "Unhappy" ? "☹ " : m === "Mixed" ? "~ " : ""}
    {m}
  </Pill>
);
export const PDot = ({ name }: { name: string }) => (
  <span className="inline-block size-2.5 shrink-0 rounded-full align-middle" style={{ background: personaColor(name) }} />
);

/** "?" hover help (the original's help()). */
export function Help({ t }: { t: string }) {
  return (
    <span
      title={t}
      aria-label={t}
      className="ml-1 inline-grid size-4 cursor-help place-items-center rounded-full bg-plane align-middle text-[10px] font-bold normal-case tracking-normal text-muted"
    >
      ?
    </span>
  );
}

export function H5({ children, className, first }: { children: ReactNode; className?: string; first?: boolean }) {
  return <div className={cx("eyebrow mb-2", !first && "mt-5", className)}>{children}</div>;
}

export function Card({
  title,
  sub,
  extra,
  children,
  className,
  style,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={cx("card min-w-0 p-5", className)} style={style}>
      {(title || extra) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-extrabold tracking-tight">{title}</h3>}
            {sub && <div className="mt-0.5 text-[11.5px] font-medium text-muted">{sub}</div>}
          </div>
          {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({
  num,
  lbl,
  explain,
  onClick,
  tone,
  active,
}: {
  num: ReactNode;
  lbl: string;
  explain?: ReactNode;
  onClick?: () => void;
  tone?: Tone | "";
  active?: boolean;
}) {
  const t = tone ?? toneFor(lbl, typeof num === "string" || typeof num === "number" ? num : "");
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cx(
        "card flex min-w-0 flex-col items-start p-4 text-left sm:p-5",
        onClick && "cursor-pointer transition hover:-translate-y-0.5",
        active && "ring-2 ring-brand",
      )}
    >
      <div className={cx("text-[26px] font-extrabold leading-none tracking-tight sm:text-[30px]", TONE_TEXT[t])}>{num}</div>
      <div className="mt-2 text-[12.5px] font-bold text-ink">{lbl}</div>
      {explain && <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{explain}</div>}
    </Tag>
  );
}
export const KpiRow = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>{children}</div>
);

/** One list row: date | label + meta | right-hand pills. */
export function Item({
  d,
  dTone,
  children,
  right,
  onClick,
}: {
  d?: ReactNode;
  dTone?: string;
  children: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 border-b border-line py-2.5 text-left text-[12.5px] last:border-b-0",
        onClick && "cursor-pointer rounded-lg hover:bg-plane",
      )}
    >
      {d != null && <span className={cx("w-14 shrink-0 text-[11.5px] font-bold tabular-nums text-muted", dTone)}>{d}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {right && <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{right}</span>}
    </Tag>
  );
}

/** label ↔ value row (the original's .stat). */
export const Stat = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[12.5px] last:border-b-0">
    <span className="min-w-0">{children}</span>
    {right != null && <span className="flex shrink-0 items-center gap-1.5">{right}</span>}
  </div>
);

export const Small = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx("text-[11.5px] text-muted", className)}>{children}</div>
);

export function Prog({ pc, tone }: { pc: number; tone?: "good" | "brand" | "warn" }) {
  const t = tone ?? (pc >= 100 ? "good" : pc >= 50 ? "brand" : "warn");
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-plane" role="progressbar" aria-valuenow={pc} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full", t === "good" ? "bg-good" : t === "brand" ? "bg-brand" : "bg-warn")} style={{ width: `${Math.min(100, pc)}%` }} />
    </div>
  );
}
export const pcTone = (pc: number) => (pc >= 100 ? "text-good" : pc >= 50 ? "text-brand" : "text-warn");

export const Empty = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx("rounded-2xl bg-plane/60 px-4 py-6 text-center text-[12.5px] font-medium text-muted", className)}>{children}</div>
);

export function AirtableLink({ href, label = "Open in Airtable" }: { href: string; label?: string }) {
  return (
    <a className="btn" href={href} target="_blank" rel="noopener">
      {label} <IconExternal width={14} height={14} />
    </a>
  );
}

/** Segmented control on the shared `.seg` class. */
export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T | null;
  options: { id: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cx("seg", className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Pressable chip (filters). */
export function ChipBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx("chip cursor-pointer transition", on ? "bg-ink text-white" : "hover:bg-lav")}
    >
      {children}
    </button>
  );
}

export const selectCls =
  "h-8 max-w-full cursor-pointer rounded-full border border-line-2 bg-white pl-3 pr-7 text-[12px] font-semibold text-ink outline-none focus:border-brand";
