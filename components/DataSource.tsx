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

  /* UAT GL-2: no platform subtext on the page — just a status dot that refreshes on click;
     the source and sync time are in the tooltip. "N min ago" is clock-based, hence suppressHydrationWarning. */
  return (
    <button
      type="button"
      aria-label="Refresh data"
      suppressHydrationWarning
      title={
        source.live
          ? `Up to date · synced ${ago(source.syncedAt, now)} · click to refresh`
          : `Couldn't reach Airtable — showing saved data. ${source.error ?? ""}`
      }
      className={`inline-flex size-6 items-center justify-center rounded-full hover:bg-plane ${busy ? "animate-pulse" : ""}`}
      disabled={busy}
      onClick={() => startRefresh(() => router.refresh())}
    >
      <span className={`size-2 rounded-full ${source.live ? "bg-good" : "bg-warn"}`} />
    </button>
  );
}
