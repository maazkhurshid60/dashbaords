"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { IconX } from "@/components/icons";
import { AIRTABLE_BASE_URL } from "@/components/AppShell";
import { cx } from "@/lib/utils";
import { GGG, type SdgRow } from "@/lib/social-types";

/* Shared bits for the Social Impact views: formatters, the right-hand drawer, KPI tiles,
   the Greater Good Goals strip and the page footer. */

export const money = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const range = (a: number | null, b: number | null) => (a == null && b == null ? "—" : a != null && b != null && a !== b ? `${money(a)}–${money(b)}` : money(a ?? b));
export const date = (iso: string) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);

export async function send(url: string, method: "PATCH" | "POST", body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    return r.ok ? { ok: true } : { ok: false, error: j.error || `Request failed (${r.status})` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export function Drawer({ open, onClose, title, eyebrow, children }: { open: boolean; onClose: () => void; title: ReactNode; eyebrow?: string; children: ReactNode }) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/25" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby={id} className="relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-pop">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            <h2 id={id} className="text-[19px] font-semibold leading-snug">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close drawer" className="rounded-full p-1.5 text-muted hover:bg-plane hover:text-ink">
            <IconX width={18} height={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 text-[13px]">{children}</div>
      </aside>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <div className="eyebrow mb-0.5">{label}</div>
      <div className="whitespace-pre-wrap break-words text-ink-2">{children || "—"}</div>
    </div>
  );
}

export function Kpi({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card p-5 text-left transition hover:ring-2 hover:ring-brand/30 focus-visible:ring-2 focus-visible:ring-brand">
      <div className="text-[26px] font-extrabold tracking-tight">{value}</div>
      <div className="mt-1 text-[12px] font-semibold text-ink-2">{label}</div>
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line-2 bg-plane/60 px-5 py-8 text-center text-[12.5px] text-muted">{children}</div>;
}

export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "warn" | "bad" | "brand" }) {
  const cls = { plain: "bg-plane text-ink-2", good: "bg-good-soft text-good", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", brand: "bg-brand-soft text-brand" }[tone];
  return <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold", cls)}>{children}</span>;
}

/* Greater Good Goals: VCG's 10 SDGs as coloured tiles (official SDG colour, number, short name).
   Hover/focus shows the related programming from "Social Impact & SDG Alignment"; click opens a drawer. */
export function GggStrip({ sdg }: { sdg: SdgRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const rowsFor = (n: number) => sdg.filter((r) => r.number === n || new RegExp(`\\b(SDG\\s*)?${n}\\b`).test(r.sdg.split(/[:—-]/)[0] ?? ""));
  const goal = GGG.find((g) => g.n === open);
  return (
    <>
      <ul className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {GGG.map((g) => {
          const rows = rowsFor(g.n);
          return (
            <li key={g.n} className="relative">
              <button
                type="button"
                onClick={() => setOpen(g.n)}
                onMouseEnter={() => setHover(g.n)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(g.n)}
                onBlur={() => setHover(null)}
                aria-label={`SDG ${g.n}: ${g.name}`}
                aria-describedby={hover === g.n ? `ggg-tip-${g.n}` : undefined}
                className="flex aspect-square w-full flex-col justify-between rounded-lg p-1.5 text-left text-white transition hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                style={{ background: g.color }}
              >
                <span className="text-[20px] font-extrabold leading-none sm:text-[22px]">{g.n}</span>
                <span className="line-clamp-3 text-[8.5px] font-bold uppercase leading-tight">{g.name}</span>
              </button>
              {hover === g.n && (
                <div id={`ggg-tip-${g.n}`} role="tooltip" className="absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-xl bg-ink px-3 py-2.5 text-[11.5px] text-white shadow-pop">
                  <div className="font-bold">
                    SDG {g.n} · {g.name}
                  </div>
                  <div className="mt-1 text-white/80">
                    {rows.length ? rows.map((r) => r.program || r.sdg).filter(Boolean).join(", ") || "Linked in Airtable" : "No related programming linked in Airtable yet"}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Drawer open={!!goal} onClose={() => setOpen(null)} eyebrow="Greater Good Goal" title={goal ? `SDG ${goal.n} · ${goal.name}` : ""}>
        {goal && (
          <>
            <div className="mb-4 h-2 rounded-full" style={{ background: goal.color }} />
            {rowsFor(goal.n).length ? (
              rowsFor(goal.n).map((r) => (
                <div key={r.id} className="mb-3 rounded-2xl bg-plane p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{r.program || r.sdg}</span>
                    {r.status && <Pill tone={r.status === "Active" ? "good" : "plain"}>{r.status}</Pill>}
                  </div>
                  <Field label="VCG application">{r.application}</Field>
                  <Field label="Impact outcomes linked">{String(r.outcomes)}</Field>
                </div>
              ))
            ) : (
              <Empty>No programming is linked to this goal in Social Impact &amp; SDG Alignment yet.</Empty>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

export function SiFooter() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[12px]">
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
        <a href={AIRTABLE_BASE_URL} target="_blank" rel="noopener" className="text-brand hover:underline">
          Airtable Intranet
        </a>
        <Link href="/" className="text-brand hover:underline">
          Intranet Home
        </Link>
        <Link href="/ant" className="text-brand hover:underline">
          ANT Connector
        </Link>
      </div>
      <div className="text-[11px] text-muted">VCG Intranet — Social Impact</div>
    </footer>
  );
}
