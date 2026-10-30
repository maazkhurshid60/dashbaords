"use client";

import type { ReactNode, SVGProps } from "react";
import { cx } from "@/lib/utils";

export type Hit = (...vals: (string | null | undefined)[]) => boolean;

export const SESSION_NOTE =
  "Changes are kept in this browser session only. Writing back to Airtable needs the server sync (API route + Airtable token).";

export function InfoGrid({ cells, cols = 4 }: { cells: [string, ReactNode][]; cols?: 2 | 3 | 4 }) {
  return (
    <div className={cx("grid grid-cols-2 gap-3", cols === 3 ? "sm:grid-cols-3" : cols === 4 ? "sm:grid-cols-4" : "")}>
      {cells.map(([l, v]) => (
        <div key={l} className="min-w-0 rounded-2xl bg-plane px-3.5 py-3">
          <div className="field-label">{l}</div>
          <div className="break-words text-[12.5px] font-semibold leading-snug">{v}</div>
        </div>
      ))}
    </div>
  );
}

/** Section heading inside a modal. */
export function H({ children, count, className }: { children: ReactNode; count?: ReactNode; className?: string }) {
  return (
    <h4 className={cx("mb-3 mt-7 flex items-baseline gap-2 text-[13px] font-extrabold", className)}>
      {children}
      {count != null && <span className="text-[11px] font-semibold text-muted">{count}</span>}
    </h4>
  );
}

export function Empty({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl bg-plane px-4 py-5 text-center text-[12.5px] text-muted", className)}>{children}</div>;
}

export function NoMatch({ children = "Nothing matches your search." }: { children?: ReactNode }) {
  return <div className="col-span-full w-full rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">{children}</div>;
}

/** Small neutral tag used for people / departments in meeting and task details. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex min-h-6 items-center rounded-full bg-plane px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-2", className)}>
      {children}
    </span>
  );
}

export function SmallTile({ label, value, tone = "text-ink" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl bg-plane px-4 py-3.5">
      <div className={cx("text-[28px] font-extrabold leading-none tabular-nums", tone)}>{value}</div>
      <div className="mt-1.5 text-[11.5px] font-semibold text-ink-2">{label}</div>
    </div>
  );
}

/* Local icons (shared icon set is owned by the shell). */
const base = { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);
export const IconTimer = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M10 2h4" />
  </svg>
);
export const IconChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
