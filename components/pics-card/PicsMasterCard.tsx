"use client";

import { useEffect, useRef } from "react";
import type { CardData, CardDashboard, CardPics, CardSource } from "@/lib/pics-card-types";
import { mountPicsCard } from "./engine";
import type { CardEngineHandle, PersistRequest, SharePayload, ShareResult } from "./types";

/* P.I.C.S Master Card v2 — the reusable master component (OPS-6 → OPS-24, PRD-6/PRD-8).
   Renders the prototype engine in a shadow root and wires its write hooks to /api/pics/card/*.
   - live data: every edit is written to Airtable (and logged in the Dashboard Sync Queue)
   - snapshot data: edits stay in the session and the toast says they were not saved */

async function call<T>(method: "POST" | "PATCH", path: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch {
    throw new Error("Network error — Airtable wasn't updated");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && res.status !== 501) throw new Error(`Not saved to Airtable — ${data.error || res.status}`.slice(0, 220));
  return data;
}

export interface PicsMasterCardProps {
  data: CardData;
  source: CardSource;
  dashboard?: CardDashboard;
  /** Department view (#dept=…); the Product page passes "Product". */
  dept?: string;
  /** Extra grid filter (e.g. Operations stage tile + search). */
  filter?: ((p: CardPics) => boolean) | null;
  openId?: string | null;
  viewBase?: string;
  initialType?: string;
  /** Open a card imperatively (bump n to reopen the same id). */
  openRequest?: { id: string; n: number } | null;
}

export function PicsMasterCard({
  data,
  source,
  dashboard = "PICS Operations",
  dept,
  filter,
  openId,
  viewBase = "/pics",
  initialType,
  openRequest,
}: PicsMasterCardProps) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<CardEngineHandle | null>(null);
  const filterRef = useRef(filter);
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    if (!host.current) return;
    const persist = async ({ kind, id, patch, area }: PersistRequest) => {
      if (!source.live) throw new Error("Snapshot data — not saved to Airtable (Airtable is unreachable)");
      return call<{ id: string }>(id ? "PATCH" : "POST", `/api/pics/card/${kind}${id ? `/${id}` : ""}`, { patch, audit: { dashboard, area } });
    };
    const share = (payload: SharePayload) => call<ShareResult>("POST", "/api/pics/share", payload);
    handle.current = mountPicsCard(host.current, {
      data: structuredClone(data),
      dept,
      filter: filterRef.current ?? null,
      openId,
      initialType,
      embedded: true,
      viewBase,
      persist,
      share,
    });
    return () => {
      handle.current?.destroy();
      handle.current = null;
    };
    // openId only matters on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dept, source.live, dashboard, viewBase, initialType]);

  useEffect(() => {
    handle.current?.setFilter(filter ?? null);
  }, [filter]);

  useEffect(() => {
    if (openRequest) handle.current?.open(openRequest.id);
  }, [openRequest]);

  return <div ref={host} className="pics-master-card" />;
}
