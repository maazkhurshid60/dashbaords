"use client";

/* The shared engine: dataset + UI state, the data layer (api / loadLive /
   refreshSite / write / writeCreate / fixCall) and every action of the originals'
   ACT / CHG tables. Pages provide an AppDef; views read everything via useSuite(). */
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useToast } from "@/components/ui";
import { AT, DAY, TODAY, iso, type SuiteConfig } from "@/lib/product-data";
import type { ChecklistItem, Feedback, SuiteData } from "@/lib/product-types";
import { fmtD, shortPics, STAGE } from "./format";
import { builtIn, clItem, fbIn, feat, personaOf, type PrioWeights } from "./logic";

/* ---------------- app definition ---------------- */
export type AppKey = "product" | "comms";
export interface LivePayload {
  ok?: boolean;
  data?: Record<string, unknown>;
  syncedAt?: string;
  warnings?: string[];
  missing?: string[];
  error?: string;
}
export interface AppDef {
  key: AppKey;
  dept: string;
  name: string;
  cfg: SuiteConfig;
  build: () => SuiteData;
  /** loadLive(): builds the live dataset from the endpoint payload. */
  merge: (j: LivePayload) => SuiteData;
  tabs: [string, string, string][];
  subs: Record<string, [string, string][]>;
  newItems: string[];
  /** Product polls /site; Communications overrides refreshSite with a no-op. */
  site: boolean;
}

/* ---------------- UI state (the originals' S object) ---------------- */
export type SumOut =
  | { state: "loading"; n: number }
  | { state: "ai"; text: string }
  | { state: "fallback"; top: { name: string; persona: string; pn: number; n: number }[] };
export interface UiState {
  tab: string;
  sub: Record<string, string>;
  segment: string[];
  stageFilter: string;
  pics: string | null;
  picsNode: string | null;
  launchPics: string | null;
  rmAll: boolean;
  insight: { status: string; source: string; sentiment: string; hidden: string[]; theme: string | null; sev: string | null };
  prio: { w: PrioWeights; sort: string; view: string };
  rm: { view: string; audience: string };
  persona: string | null;
  compare: string[];
  pg: { late: number; soon: number };
  clFilter: string;
  clEdit: string | null;
  lastSiteCheck: string | null;
  preview: boolean;
  antOk: boolean;
  sumOut: SumOut | null;
  /* Communications */
  range: string;
  from: string;
  to: string;
  upPage: string;
  upStatus: string;
  upType: string;
  queue: string;
  src: string;
  box: string;
  ticket: string | null;
  confirmSend: string | null;
}
export type DrawerState =
  | { kind: "feature"; id: string }
  | { kind: "manage" }
  | { kind: "finding"; id: string }
  | { kind: "cl"; key: string }
  | { kind: "note"; id: string }
  | null;
export type ModalState =
  | { kind: "addfb" }
  | { kind: "deploy"; action: string; dep: string }
  | { kind: "howto" }
  | { kind: "up"; id: string | null }
  | null;

/* localStorage helpers (vcg_prod_*), every access guarded */
export const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem("vcg_prod_" + k);
      return v == null ? d : (JSON.parse(v) as T);
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem("vcg_prod_" + k, JSON.stringify(v));
    } catch {
      /* storage blocked */
    }
  },
};

function hashPatch(app: AppDef, h: string, s: UiState): Partial<UiState> {
  const [tab, sub] = h.replace(/^#/, "").split("/");
  const p: Partial<UiState> = {};
  const t = app.tabs.some((x) => x[0] === tab) ? tab : s.tab;
  if (t !== s.tab) p.tab = t;
  if (sub && app.subs[t] && app.subs[t].some((x) => x[0] === sub)) p.sub = { ...s.sub, [t]: sub };
  return p;
}

function initialState(app: AppDef): UiState {
  const s: UiState = {
    tab: app.tabs[0][0],
    sub: { performance: "website", customers: "segments" },
    segment: [],
    stageFilter: "All",
    pics: null,
    picsNode: null,
    launchPics: null,
    rmAll: false,
    insight: { status: "All", source: "All", sentiment: "All", hidden: [], theme: null, sev: null },
    prio: { w: { rice: 50, impact: 35, obj: 15, ...store.get<Partial<PrioWeights>>("weights", {}) }, sort: "score", view: "table" },
    rm: { view: "board", audience: store.get<string>("audience", "Internal") },
    persona: null,
    compare: [],
    pg: { late: 0, soon: 0 },
    clFilter: "All",
    clEdit: null,
    lastSiteCheck: null,
    preview: false,
    antOk: false,
    sumOut: null,
    range: "all",
    from: "",
    to: "",
    upPage: "All",
    upStatus: "All",
    upType: "All",
    queue: "needs",
    src: "All",
    box: "All",
    ticket: null,
    confirmSend: null,
  };
  return { ...s, ...hashPatch(app, window.location.hash, s) };
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/* ---------------- the hook ---------------- */
export interface SuiteInitial { ui?: Partial<UiState>; drawer?: DrawerState; modal?: ModalState }
function useSuiteEngine(app: AppDef, initial?: SuiteInitial) {
  const toast = useToast();
  const { cfg } = app;
  const [D, setD] = useState<SuiteData>(() => app.build());
  const [S, setS] = useState<UiState>(() => ({ ...initialState(app), ...initial?.ui }));
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>(initial?.drawer ?? null);
  const [modal, setModal] = useState<ModalState>(initial?.modal ?? null);
  const q = query.trim().toLowerCase();

  const set = useCallback((p: Partial<UiState> | ((s: UiState) => Partial<UiState>)) => {
    setS((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) }));
  }, []);
  /** Apply a change to a copy of the dataset (the originals' localApply). Return false to skip. */
  const update = useCallback((fn: (d: SuiteData) => void | boolean) => {
    setD((prev) => {
      const next = structuredClone(prev);
      return fn(next) === false ? prev : next;
    });
  }, []);

  const missing = D.missing || app.newItems;
  const built = useCallback((...keys: string[]) => builtIn(missing, keys), [missing]);
  const has = useCallback((...keys: string[]) => S.preview || builtIn(missing, keys), [S.preview, missing]);

  /* ---------- DATA LAYER ---------- */
  const api = useCallback(
    async <T = LivePayload,>(path: string, opts: RequestInit = {}, timeout = 6000): Promise<T> => {
      const ctl = new AbortController();
      const h = setTimeout(() => ctl.abort(), timeout);
      try {
        const key = store.get<string>("key", "");
        const r = await fetch(cfg.apiBase + path, {
          ...opts,
          signal: ctl.signal,
          headers: { "Content-Type": "application/json", ...(key ? { "x-vcg-key": key } : {}), ...((opts.headers as Record<string, string>) || {}) },
        });
        clearTimeout(h);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return (await r.json()) as T;
      } finally {
        clearTimeout(h);
      }
    },
    [cfg.apiBase],
  );

  const refreshSite = useCallback(
    async (manual?: boolean) => {
      if (!app.site) return; // Communications: refreshSite(){} in the original
      if (!cfg.live) {
        if (manual) toast("Site monitor isn't connected yet — showing sample state");
        return;
      }
      try {
        const j = await api<{ site?: Partial<SuiteData["site"]> }>(cfg.ep.site, {}, 8000);
        update((d) => {
          Object.assign(d.site, j.site || {});
          if (j.site && j.site.deployments) d.site.deployments = j.site.deployments;
          d.site.live = true;
        });
        set({ lastSiteCheck: new Date().toISOString() });
      } catch {
        update((d) => {
          if (d.site.live === false) return false;
          d.site.live = false;
        });
        if (manual) toast("Site monitor endpoint not reachable — showing last known/sample state");
      }
    },
    [api, app.site, cfg.live, cfg.ep.site, set, toast, update],
  );

  const loadLive = useCallback(async () => {
    if (!cfg.live) return; // example data until the backend is wired up
    try {
      const j = await api(cfg.ep.data);
      if (!j || !j.ok || !j.data) throw new Error("bad payload");
      setD(app.merge(j));
    } catch {
      /* setMode('sample'): the page keeps (or falls back to) example data; the banner explains why. */
    }
    void refreshSite();
  }, [api, app, cfg.live, cfg.ep.data, refreshSite]);

  useEffect(() => {
    const h = setTimeout(() => void loadLive(), 0);
    return () => clearTimeout(h);
  }, [loadLive]);
  const mode = D.mode;
  useEffect(() => {
    const h = setInterval(() => {
      if (mode === "live") void loadLive();
      else void refreshSite();
    }, cfg.pollMs);
    return () => clearInterval(h);
  }, [mode, loadLive, refreshSite, cfg.pollMs]);
  useEffect(() => {
    const on = () => setS((s) => ({ ...s, ...hashPatch(app, window.location.hash, s) }));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [app]);

  /** write(): live → POST /write (server allowlists table+field); sample → applies in the page only and says so. */
  const write = useCallback(
    async (tableKey: string, recId: string, fields: Record<string, unknown>, apply: ((d: SuiteData) => void) | null, label?: string) => {
      if (apply) update(apply);
      if (D.mode !== "live") {
        toast((label || "Updated") + " · preview only, not saved");
        return true;
      }
      try {
        const j = await api(cfg.ep.write, { method: "POST", body: JSON.stringify({ table: AT[tableKey]?.id, recordId: recId, fields }) });
        if (!j.ok) throw new Error(j.error || "write failed");
        toast((label || "Saved") + " · saved to Airtable");
        return true;
      } catch (e) {
        toast("Airtable write failed: " + errMsg(e));
        void loadLive();
        return false;
      }
    },
    [D.mode, api, cfg.ep.write, loadLive, toast, update],
  );
  const writeCreate = useCallback(
    async (tableKey: string, fields: Record<string, unknown>, apply: ((d: SuiteData) => void) | null, label: string) => {
      if (apply) update(apply);
      if (D.mode !== "live") {
        toast(label + " · preview only, not saved");
        return;
      }
      try {
        const tbl = ({ comms: "tblzb0tCJJoZCmo17", roadmaps: "tblTo1C185aBEIshk" } as Record<string, string>)[tableKey] || AT[tableKey]?.id;
        const j = await api(cfg.ep.write, { method: "POST", body: JSON.stringify({ table: tbl, create: true, fields }) });
        if (!j.ok) throw new Error(j.error || "failed");
        toast(label + " · synced to Airtable");
      } catch (e) {
        toast("Airtable write failed: " + errMsg(e));
      }
    },
    [D.mode, api, cfg.ep.write, toast, update],
  );
  const fixCall = useCallback(
    async (body: Record<string, unknown>, apply: ((d: SuiteData) => void) | null, label: string) => {
      if (apply) update(apply);
      if (D.mode !== "live") {
        toast(label + " · preview only, not saved");
        return;
      }
      try {
        const j = await api(cfg.ep.write, { method: "POST", body: JSON.stringify(body) }, 15000);
        if (!j.ok) throw new Error(j.error || "failed");
        toast(label + " · saved to Airtable");
      } catch (e) {
        toast("That didn't save: " + errMsg(e));
      }
      void loadLive();
    },
    [D.mode, api, cfg.ep.write, loadLive, toast, update],
  );
  /** one checklist item → P.I.C.S Checklist (Status / Due Date / General Notes) */
  const clSet = useCallback(
    async (id: string, ch: Partial<Pick<ChecklistItem, "status" | "due" | "notes">>, label: string) => {
      const F = AT.checklist.f || {};
      const f: Record<string, unknown> = {};
      if ("status" in ch) f[F.status] = ch.status;
      if ("due" in ch) f[F.due] = ch.due;
      if ("notes" in ch) f[F.notes] = ch.notes;
      await write(
        "checklist",
        id,
        f,
        (d) => {
          const x = clItem(d, id);
          if (x) Object.assign(x.c, ch);
        },
        label,
      );
    },
    [write],
  );

  const closeAll = useCallback(() => {
    setDrawer(null);
    setModal(null);
  }, []);
  const scrollTop = () => window.scrollTo({ top: 0 });
  const scrollToId = (id: string) =>
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);

  /* ---------- ACT / CHG ---------- */
  const act = {
    preview() {
      const on = !S.preview;
      set({ preview: on });
      toast(on ? "Previewing designs that are waiting on Airtable (example data)" : "Previews hidden");
    },
    howto: () => setModal({ kind: "howto" }),
    /** header mode pill: example → how-to; live → refresh */
    modePill() {
      if (D.mode === "sample") setModal({ kind: "howto" });
      else {
        toast("Refreshing from Airtable…");
        void loadLive();
      }
    },
    tab(id: string) {
      set({ tab: id });
      window.location.hash = id;
      scrollTop();
    },
    sub(id: string) {
      set((s) => ({ sub: { ...s.sub, [s.tab]: id } }));
      window.location.hash = S.tab + "/" + id;
    },
    go(id: string, sub?: string) {
      set((s) => ({ tab: id, sub: sub ? { ...s.sub, [id]: sub } : s.sub }));
      window.location.hash = id + (sub ? "/" + sub : "");
      scrollTop();
    },
    seg(id: string) {
      set((s) => ({ segment: !id ? [] : s.segment.includes(id) ? s.segment.filter((x) => x !== id) : [...s.segment, id] }));
    },
    segTo(id: string) {
      set((s) => ({ segment: [id], sub: { ...s.sub, customers: "feedback" } }));
      scrollTop();
    },
    stage: (id: string) => set({ stageFilter: id }),
    feature: (id: string) => setDrawer({ kind: "feature", id }),
    note: (id: string) => setDrawer({ kind: "note", id }),
    manage: () => setDrawer({ kind: "manage" }),
    finding: (id: string) => setDrawer({ kind: "finding", id }),
    theme: (id: string | null) => set((s) => ({ insight: { ...s.insight, theme: s.insight.theme === id || !id ? null : id } })),
    themeToggle: (id: string) =>
      set((s) => ({
        insight: { ...s.insight, hidden: s.insight.hidden.includes(id) ? s.insight.hidden.filter((x) => x !== id) : [...s.insight.hidden, id] },
      })),
    ist: (id: string) => set((s) => ({ insight: { ...s.insight, status: id } })),
    isev: (id: string) => set((s) => ({ insight: { ...s.insight, sev: id || null } })),
    addfb: () => setModal({ kind: "addfb" }),
    savefb(v: { text: string; acc: string; src: string; sev: string; feat: string; per: string | null }) {
      const t = v.text.trim();
      if (!t) {
        toast("Add what the customer said first");
        return false;
      }
      const n: Feedback = {
        id: "fb" + Date.now(), fid: "FB-new", summary: t, account: v.acc || "—", persona: v.per ?? "Unassigned", source: v.src, sentiment: v.sev,
        importance: ({ Critical: "Critical", High: "Important" } as Record<string, string>)[v.sev] || "Nice to have",
        theme: D.themes[0]?.id || null, feature: v.feat || null, date: iso(new Date()), status: "Unprocessed",
      };
      closeAll();
      const F = AT.feedback.f || {};
      const fields: Record<string, unknown> = { [F.summary]: n.summary, [F.account]: n.account, [F.source]: n.source, [F.sentiment]: n.sentiment, [F.date]: n.date };
      if (n.feature && n.feature.startsWith("rec")) fields[F.feature] = [n.feature];
      const pr = personaOf(D, n.persona);
      if (pr && String(pr.id).startsWith("rec") && v.per != null) fields["Related Persona"] = [pr.id];
      void writeCreate("feedback", fields, (d) => void d.feedback.unshift(n), "Feedback saved");
      return true;
    },
    processed(id: string) {
      void write("feedback", id, { "Triage Status": "Processed" }, (d) => {
        const n = d.feedback.find((x) => x.id === id);
        if (n) n.status = "Processed";
      }, "Marked as reviewed");
      closeAll();
    },
    async summarize() {
      const I = S.insight;
      const list = fbIn(D, S.segment).filter((f) => (I.status === "All" || f.status === I.status) && (!I.theme || f.theme === I.theme)).slice(0, 60);
      set({ sumOut: { state: "loading", n: list.length } });
      try {
        const prompt =
          `PRANT REQUEST: Summarize these ${list.length} ACRYLICS customer feedback notes for the Product department. Give the top 3 pain points with counts, which personas feel each most, and one recommended product action each. Notes:\n` +
          list.map((f) => `- [${f.persona}/${f.sentiment}] ${f.summary}`).join("\n");
        const j = await api<{ reply?: string; text?: string }>(cfg.ep.ant, { method: "POST", body: JSON.stringify({ ant: "PRANT", message: prompt, log: false }) }, 30000);
        set({ antOk: true, sumOut: { state: "ai", text: j.reply || j.text || JSON.stringify(j) } });
      } catch {
        const c: Record<string, { n: number; p: Record<string, number> }> = {};
        list.forEach((f) => {
          const k = String(f.theme);
          c[k] = c[k] || { n: 0, p: {} };
          c[k].n++;
          c[k].p[f.persona] = (c[k].p[f.persona] || 0) + 1;
        });
        const top = Object.entries(c)
          .sort((a, b) => b[1].n - a[1].n)
          .slice(0, 3)
          .map(([t, o]) => {
            const p = Object.entries(o.p).sort((a, b) => b[1] - a[1])[0];
            return { name: D.themes.find((x) => x.id === t)?.name || "—", persona: p[0], pn: p[1], n: o.n };
          });
        set({ sumOut: { state: "fallback", top } });
      }
    },
    persona(id: string) {
      const next = S.persona === id ? null : id;
      set({ persona: next });
      if (next) scrollToId("pProfile");
    },
    cmp(id: string) {
      if (S.compare.includes(id)) set({ compare: S.compare.filter((x) => x !== id) });
      else if (S.compare.length < 3) set({ compare: [...S.compare, id] });
      else toast("Compare up to 3 at a time");
    },
    cmpclear: () => set({ compare: [] }),
    picsTo: (id: string) => set({ picsNode: id }),
    picsPick(id: string) {
      const next = S.pics === id ? null : id;
      set({ pg: { late: 0, soon: 0 }, pics: next, picsNode: id });
      if (next) scrollToId("suite-detail");
    },
    picsNode: (id: string) => set({ pg: { late: 0, soon: 0 }, picsNode: id }),
    launchPick(id: string) {
      const next = S.launchPics === id ? null : id;
      set({ pg: { late: 0, soon: 0 }, launchPics: next });
      if (next) scrollToId("suite-detail");
    },
    rmAll: (on: boolean) => set({ rmAll: on }),
    pg: (kind: "late" | "soon", d: number) => set((s) => ({ pg: { ...s.pg, [kind]: Math.max(0, (s.pg[kind] || 0) + d) } })),
    async sweep() {
      if (D.mode !== "live") {
        toast("Preview only — in live mode this sends PRANT a sweep request (ANT Requests)");
        return;
      }
      try {
        const j = await api(cfg.ep.write, { method: "POST", body: JSON.stringify({ action: "prantSweep" }) });
        if (!j.ok) throw new Error(j.error || "failed");
        toast("PRANT sweep requested — results appear here when it finishes");
      } catch (e) {
        toast("Couldn't request the sweep: " + errMsg(e));
      }
    },
    async fixNotes(id: string, notes: string) {
      await write("registry", id, { fldjihLSQSfA8D4DQ: notes }, (d) => {
        const f = d.sweep?.findings.find((x) => x.id === id);
        if (f) f.notes = notes;
      }, "Notes saved");
    },
    async fixDismiss(id: string) {
      const f = D.sweep?.findings.find((x) => x.id === id);
      if (!f) return;
      closeAll();
      await fixCall({ action: "dismissFix", registryId: id }, (d) => {
        const x = d.sweep?.findings.find((y) => y.id === id);
        if (x) {
          x.status = "Dismissed";
          x.tags = [...(x.tags || []), "Out of Scope"];
        }
      }, `Dismissed: ${f.asset}`);
    },
    async fixApprove(id: string, whoV: string, notes: string) {
      const f = D.sweep?.findings.find((x) => x.id === id);
      if (!f) return;
      if (!whoV) {
        toast("Choose a fix assignee first");
        return;
      }
      const [kind, aid] = whoV.split(":");
      const person = kind === "person";
      const name = ((person ? D.team : D.ants) || []).find((x) => x.id === aid)?.name || "";
      closeAll();
      await fixCall({ action: "assignFix", registryId: id, notes, assignee: { kind, id: aid } }, (d) => {
        const x = d.sweep?.findings.find((y) => y.id === id);
        if (!x) return;
        x.notes = notes;
        x.status = "Assigned";
        x.assignee = name;
        if (person) x.task = { id: "new", name: "Fix: " + x.asset, assignee: name };
        else x.antReqs = [{ id: "new", title: "Fix: " + x.asset, ant: name }];
      }, person ? `Task created for ${name} in Tasks Planning` : `ANT Request created for ${name}`);
    },
    addRoad(fid: string) {
      const f = feat(D, fid);
      const cur = D.pics.find((p) => p.id === (S.picsNode || S.pics));
      if (!f || !cur) return;
      const row = { label: f.name, type: "Task", date: iso(TODAY.getTime() + 14 * DAY), phase: "", status: "Not Started" };
      void writeCreate(
        "roadmaps",
        {
          fldpiPmyrdTtbISsV: f.name, fldhd79gXJvwE4LTw: String(cur.id).startsWith("rec") ? [cur.id] : [], fld3OQAOgZQl5g6ZP: "Task",
          fldMVHS5ztNrhnwFi: "Not Started", fldESgBxo9w0qjSHy: `Added from Product Dashboard: customers asked for “${f.name}”.`,
        },
        (d) => {
          const c = d.pics.find((p) => p.id === cur.id);
          const ff = d.features.find((x) => x.id === fid);
          if (c) (c.rows = c.rows || []).push(row);
          if (ff) ff.pics = cur.id;
        },
        `Added “${f.name}” to ${shortPics(cur.name)}`,
      );
    },
    recheck() {
      toast("Checking acrylics.world…");
      void refreshSite(true);
    },
    deploy: (action: string, dep?: string) => setModal({ kind: "deploy", action, dep: dep || "" }),
    async doDeploy(action: string, dep: string, confirm: string) {
      if ((confirm || "").trim().toUpperCase() !== "ACRYLICS") {
        toast("Type ACRYLICS to confirm");
        return;
      }
      closeAll();
      if (!D.site.live) {
        toast("Not connected to Vercel yet — nothing was changed");
        return;
      }
      try {
        const j = await api(cfg.ep.deploy, { method: "POST", body: JSON.stringify({ action, deploymentId: dep || null }) }, 20000);
        if (!j.ok) throw new Error(j.error || "failed");
        toast("Vercel is working on it");
        setTimeout(() => void refreshSite(), 4000);
      } catch (e) {
        toast("That didn't work: " + errMsg(e));
      }
    },
    notify(id: string) {
      const pend = D.feedback.filter((x) => x.feature === id && !x.notified);
      const f = feat(D, id);
      if (!f) return;
      void writeCreate(
        "comms",
        { Subject: `Shipped: ${f.name}`, Body: `${pend.length} customers asked for this: ${pend.map((p) => p.account).join(", ")}`, "Generate Draft": true },
        (d) => d.feedback.forEach((x) => {
          if (x.feature === id && !x.notified) x.notified = true;
        }),
        `${pend.length} message drafts created`,
      );
    },
    /* checklists */
    clOpen(k: string) {
      set({ clEdit: null, clFilter: "All" });
      setDrawer({ kind: "cl", key: k });
    },
    clFilter: (f: string) => set({ clFilter: f }),
    clEdit: (id: string | null) => set({ clEdit: id || null }),
    clTick(id: string) {
      const x = clItem(D, id);
      if (!x) return;
      const v = x.c.status === "Completed" ? "Not Started" : "Completed";
      void clSet(id, { status: v }, v === "Completed" ? "Checked off" : "Unchecked");
    },
    clNotes(id: string, notes: string) {
      set({ clEdit: null });
      void clSet(id, { notes }, "Notes saved");
    },
    clStatus: (id: string, v: string) => void clSet(id, { status: v }, "Status → " + v),
    clDue: (id: string, v: string) => {
      if (v) void clSet(id, { due: v }, "Due date → " + fmtD(v));
    },
    /* CHG */
    fstatus(id: string, v: string) {
      const f = feat(D, id);
      if (!f) return;
      void write("features", f.id, { [AT.features.f!.status]: v }, (d) => {
        const x = d.features.find((y) => y.id === id);
        if (x) x.status = v;
      }, `${f.name} → ${STAGE[v]}`);
    },
    nfeat(id: string, v: string) {
      void write("feedback", id, { [AT.feedback.f!.feature]: v ? [v] : [] }, (d) => {
        const n = d.feedback.find((x) => x.id === id);
        if (n) n.feature = v || null;
      }, v ? "Linked to " + (feat(D, v)?.name || "") : "Unlinked");
    },
    ntheme(id: string, v: string) {
      void write("feedback", id, { Theme: [v] }, (d) => {
        const n = d.feedback.find((x) => x.id === id);
        if (n) n.theme = v;
      }, "Topic updated");
    },
    nimp(id: string, v: string) {
      void write("feedback", id, { Importance: v }, (d) => {
        const n = d.feedback.find((x) => x.id === id);
        if (n) n.importance = v;
      }, "Importance updated");
    },
    gate(i: number, v: string) {
      const g = D.gates[i];
      if (!g) return;
      void write("gates", g.id || "", { [AT.gates.f!.status]: v }, (d) => {
        if (d.gates[i]) d.gates[i].status = v;
      }, g.name + " → " + v);
    },
    pics: (v: string) => set({ pics: v }),
    /** persisted prioritisation weights / roadmap audience (store in the original) */
    setWeights(w: PrioWeights) {
      set((s) => ({ prio: { ...s.prio, w } }));
      store.set("weights", w);
    },
    setAudience(a: string) {
      set((s) => ({ rm: { ...s.rm, audience: a } }));
      store.set("audience", a);
    },
  };

  return {
    app, cfg, D, S, set, update, query, setQuery, q, has, built, toast, api, loadLive, refreshSite, write, writeCreate, fixCall, clSet,
    drawer, setDrawer, modal, setModal, closeAll, act,
  };
}

export type Suite = ReturnType<typeof useSuiteEngine>;
const SuiteCtx = createContext<Suite | null>(null);

/** `initial` lets an embedding page (or a test) open a tab, drawer or modal up front. */
export function SuiteProvider({ app, initial, children }: { app: AppDef; initial?: SuiteInitial; children: ReactNode }) {
  const suite = useSuiteEngine(app, initial);
  return <SuiteCtx.Provider value={suite}>{children}</SuiteCtx.Provider>;
}
export function useSuite() {
  const s = useContext(SuiteCtx);
  if (!s) throw new Error("useSuite outside SuiteProvider");
  return s;
}

/** Client-only gate: the dashboards depend on the local clock/time zone, the URL hash and
    localStorage, so they render after hydration (server + first client pass show a skeleton). */
const noopSubscribe = () => () => {};
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
