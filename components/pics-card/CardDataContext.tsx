"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CardData, CardSource } from "@/lib/pics-card-types";

/* Lets a server page hand master-card data to a view rendered deep inside another dashboard
   (e.g. /product › Roadmap tab, PRD-6) without threading props through it. */
const Ctx = createContext<{ data: CardData; source: CardSource } | null>(null);

export function PicsCardDataProvider({ data, source, children }: { data: CardData; source: CardSource; children: ReactNode }) {
  return <Ctx.Provider value={{ data, source }}>{children}</Ctx.Provider>;
}

export const usePicsCardData = () => useContext(Ctx);
