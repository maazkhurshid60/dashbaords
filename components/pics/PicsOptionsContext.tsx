"use client";

/* Choice lists for P.I.C.S forms and filters, provided by PicsOperations from loadPics(): live Airtable select
   choices + Departments records, or SNAPSHOT_OPTIONS with snapshot data. */
import { createContext, useContext } from "react";
import { SNAPSHOT_OPTIONS } from "@/lib/pics-options";
import type { PicsOptions } from "@/lib/pics-types";

const Ctx = createContext<PicsOptions>(SNAPSHOT_OPTIONS);
export const PicsOptionsProvider = Ctx.Provider;
export const usePicsOptions = () => useContext(Ctx);
