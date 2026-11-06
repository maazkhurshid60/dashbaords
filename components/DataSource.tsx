"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Where a page's data came from, as returned by withFallback() in lib/airtable.server.ts. */
export interface Source {
  live: boolean;
  syncedAt: string;
  error?: string;
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}

/* "● Live from Airtable · synced 2 min ago ↻" or "● Snapshot data" with the reason on hover.
   Refresh re-runs the server loaders (router.refresh), which read through the 60s cache. */
export function DataSourceBadge({ source }: { source: Source }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busy, startRefresh] = useTransition();
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <span
      className={`chip inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold ${
        source.live ? "bg-good-soft text-good" : "bg-warn-soft text-warn"
      }`}
      title={source.live ? "Read from the VCG Intranet Airtable base" : `Showing the saved snapshot. ${source.error ?? ""}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${source.live ? "bg-good" : "bg-warn"}`} />
      {/* "N min ago" depends on the clock, so server and browser may render different text. */}
      <span suppressHydrationWarning>{source.live ? `Live from Airtable · ${ago(source.syncedAt, now)}` : "Snapshot data"}</span>
      <button
        type="button"
        aria-label="Refresh data"
        className="ml-0.5 opacity-70 hover:opacity-100 disabled:animate-spin"
        disabled={busy}
        onClick={() => startRefresh(() => router.refresh())}
      >
        ↻
      </button>
    </span>
  );
}
