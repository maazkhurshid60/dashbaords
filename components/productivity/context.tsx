"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createProductivityLogic, type ProductivityLogic } from "@/lib/productivity-logic";
import type { ProductivityData } from "@/lib/productivity-types";

/* The page's dataset (live Airtable or snapshot) plus the date/week helpers bound to it.
   Read-only reference data lives here; editable state (checklists, reports, approvals)
   stays in ProductivityCenter. */
type Ctx = ProductivityData & ProductivityLogic;

const ProductivityCtx = createContext<Ctx | null>(null);

export function ProductivityProvider({ data, children }: { data: ProductivityData; children: ReactNode }) {
  const value = useMemo<Ctx>(() => ({ ...data, ...createProductivityLogic(data) }), [data]);
  return <ProductivityCtx.Provider value={value}>{children}</ProductivityCtx.Provider>;
}

export function useProductivity(): Ctx {
  const v = useContext(ProductivityCtx);
  if (!v) throw new Error("useProductivity() outside <ProductivityProvider>");
  return v;
}

/** PATCH a /api/productivity route; throws with the server's message on failure. */
export async function patchApi(path: string, body: unknown): Promise<void> {
  const res = await fetch(`/api/productivity/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(j?.error || `HTTP ${res.status}`);
  }
}
