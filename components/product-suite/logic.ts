/* Derived metrics + shared calcs (the originals' DERIVED METRICS / SHARED CALCS /
   P.I.C.S CARDS / CHECKLISTS sections), as pure functions of the dataset. */
import { DAY, TODAY, iso, setLiveClock } from "@/lib/product-data";
import type { Account, ChecklistItem, Feature, Feedback, Pics, PicsRow, SuiteData } from "@/lib/product-types";
import { shortPics } from "./format";

/* `let` exports (live bindings) so they follow the clock when live mode switches it. */
export let todayIso = iso(TODAY);
export let in14 = iso(TODAY.getTime() + 14 * DAY);
/** Live Airtable data runs on the real clock; example data stays anchored to Sep 28, 2026. */
export function setSuiteClock(live: boolean) {
  setLiveClock(live);
  todayIso = iso(TODAY);
  in14 = iso(TODAY.getTime() + 14 * DAY);
}

/* ---------- Sync gate ---------- */
/** NEW_ITEMS / COMMS_NEW_ITEMS live in lib/product-data.ts so the server routes can check them too. */
export { COMMS_NEW_ITEMS, NEW_ITEMS } from "@/lib/product-data";

/** Select choices: live mode uses the Airtable schema's options (data.options); example mode the
    hardcoded list. A value the record already has is kept so the select can show it. */
export function liveOpts(D: SuiteData, key: string, fallback: string[], current?: string | null): string[] {
  const live = D.mode === "live" ? D.options?.[key] : undefined;
  const list = live && live.length ? live : fallback;
  return current && !list.includes(current) ? [current, ...list] : list;
}
/** true when live mode knows the choices of `key` and `value` isn't one of them */
export const notAnOption = (D: SuiteData, key: string, value: string | null | undefined) => {
  const live = D.mode === "live" ? D.options?.[key] : undefined;
  return !!live?.length && value != null && value !== "" && !live.includes(value);
};

export const builtIn =(missing: string[], keys: string[]) => keys.every((k) => !missing.includes(k));

/* ---------- segment + search ---------- */
export const segOK = (seg: string[], name: string) => seg.length === 0 || seg.includes(name);
export const matchQ = (q: string, ...fields: (string | null | undefined)[]) => !q || fields.join(" ").toLowerCase().includes(q);

export const accIn = (D: SuiteData, seg: string[]) => D.accounts.filter((a) => segOK(seg, a.tier));
export const fbIn = (D: SuiteData, seg: string[]) => D.feedback.filter((f) => segOK(seg, f.persona));
export const feat = (D: SuiteData, id: string | null | undefined) => D.features.find((f) => f.id === id);
export const personaOf = (D: SuiteData, name: string) => D.personas.find((p) => p.name === name);

/* ---------- DERIVED METRICS (ported; metrics/scored/ltvCalc are not shown by any view in the original either) ---------- */
export function metrics(list: Account[]) {
  const active = list.filter((a) => a.status === "Active" || a.status === "Past Due");
  const paying = active.filter((a) => a.mrr > 0);
  const mrr = paying.reduce((s, a) => s + a.mrr, 0);
  const churned = list.filter((a) => a.status === "Churned").length;
  const npsR = list.filter((a) => a.nps != null);
  const prom = npsR.filter((a) => (a.nps as number) >= 9).length,
    det = npsR.filter((a) => (a.nps as number) <= 6).length;
  const trials = list.filter((a) => a.status === "Trial").length;
  const onboarded = list.filter((a) => a.stage !== "Onboarding").length;
  return {
    total: list.length, active: active.length, paying: paying.length, mrr, arr: mrr * 12, arpu: paying.length ? mrr / paying.length : 0,
    churnRate: list.length ? churned / list.length : 0, nps: npsR.length ? Math.round((100 * (prom - det)) / npsR.length) : null, npsN: npsR.length,
    trials, activation: list.length ? onboarded / list.length : 0, ltv: paying.length ? paying.reduce((s, a) => s + a.ltv, 0) / paying.length : 0,
  };
}
export const IMP: Record<string, number> = { "Nice to have": 1, Important: 2, Critical: 4 };
export const userImpact = (D: SuiteData, seg: string[], fid: string) =>
  fbIn(D, seg).filter((f) => f.feature === fid).reduce((s, f) => s + (IMP[f.importance] || 0), 0);
export const rice = (f: Feature) => (f.reach * f.impact * f.confidence) / Math.max(0.5, f.effort);
export interface PrioWeights { rice: number; impact: number; obj: number }
export function scored(D: SuiteData, seg: string[], w: PrioWeights) {
  const fs = D.features;
  const mr = Math.max(1, ...fs.map(rice)),
    mi = Math.max(1, ...fs.map((f) => userImpact(D, seg, f.id)));
  const objW: Record<string, number> = { o1: 1, o2: 0.8, o3: 0.6, o4: 0.5 };
  const tot = w.rice + w.impact + w.obj || 1;
  return fs.map((f) => ({
    f, rice: rice(f), ui: userImpact(D, seg, f.id),
    score: Math.round((100 * ((w.rice * rice(f)) / mr + (w.impact * userImpact(D, seg, f.id)) / mi + w.obj * (objW[f.objective] || 0.3))) / tot),
  }));
}
export const FB_WEEKS = Array.from({ length: 10 }, (_, i) => iso(new Date("2026-07-20").getTime() + i * 7 * DAY));
export function themeWeekly(D: SuiteData, seg: string[]) {
  const wk = FB_WEEKS;
  const list = fbIn(D, seg);
  return {
    weeks: wk,
    rows: D.themes
      .map((t) => {
        const vals = wk.map((w, i) => list.filter((f) => f.theme === t.id && f.date >= w && f.date < (wk[i + 1] || "2099")).length);
        const last = vals.slice(-4).reduce((a, b) => a + b, 0),
          prev = vals.slice(-8, -4).reduce((a, b) => a + b, 0);
        return { t, vals, total: vals.reduce((a, b) => a + b, 0), trend: prev ? (last - prev) / prev : 0 };
      })
      .sort((a, b) => b.total - a.total),
  };
}

/* ---------- SHARED CALCS ---------- */
export function picsTree(D: SuiteData, id: string | null | undefined): Pics[] {
  const p = D.pics.find((x) => x.id === id);
  if (!p) return [];
  return [p, ...D.pics.filter((x) => x.parentId === id).flatMap((c) => picsTree(D, c.id))];
}
export interface WorkRow extends Partial<PicsRow> {
  date: string;
  label: string;
  type: string;
  status: string;
  pics: string;
  picsId?: string;
  /** checklist rows: rendered label + checklist key that opens the drawer */
  clean?: string;
  ck?: string;
}
export const roadRows = (D: SuiteData, id: string | null | undefined): WorkRow[] =>
  picsTree(D, id)
    .flatMap((p) => (p.rows || []).map((r) => ({ ...r, pics: p.name, picsId: p.id })))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
export const isDone = (r: { status: string }) => r.status === "Completed";
export const isLate = (r: { status: string; date?: string | null }) =>
  !isDone(r) && r.status !== "Cancelled" && !!r.date && r.date < todayIso;
export const launchChecklist = (D: SuiteData) =>
  D.pics.flatMap((p) => (p.id === "p2" || p.name === "ACRYLICS MVP Build" ? p.checklist || [] : []));
export const rootPics = (D: SuiteData) => {
  const l = D.pics.find((p) => /ACRYLICS MVP Launch/.test(p.name));
  return l ? l.id : D.pics[0]?.id;
};
export function featPerf(D: SuiteData, seg: string[], f: Feature) {
  const users = accIn(D, seg).filter((a) => a.used.includes(f.id));
  const notes = fbIn(D, seg).filter((n) => n.feature === f.id);
  const serious = notes.filter((n) => n.sentiment === "Critical" || n.sentiment === "High").length;
  const mood = notes.length < 3 ? "Not enough feedback" : serious / notes.length > 0.5 ? "Unhappy" : serious / notes.length > 0.25 ? "Mixed" : "Happy";
  const ad = (D.adoption || []).find((a) => a.feature === f.id);
  return {
    users: users.length, rev: users.reduce((s, a) => s + a.mrr, 0), notes: notes.length, mood,
    trend: ad ? ad.weekly : null, pics: D.pics.find((p) => p.id === f.pics),
  };
}
export function ltvCalc(D: SuiteData, list: Account[]) {
  const paidTier = (a: Account) => {
    const p = personaOf(D, a.tier);
    return !!p && (p.price > 0 || a.tier === "Sellers");
  };
  const everPaid = list.filter((a) => paidTier(a) && (a.mrr > 0 || a.status === "Churned"));
  const paying = list.filter((a) => a.mrr > 0);
  const mrr = paying.reduce((s, a) => s + a.mrr, 0);
  const arpu = paying.length ? mrr / paying.length : 0;
  const months = Math.max(1, (TODAY.getTime() - new Date("2026-07-20").getTime()) / (30 * DAY));
  const churnedPaid = everPaid.filter((a) => a.status === "Churned").length;
  const mChurn = everPaid.length ? Math.max(0.02, churnedPaid / everPaid.length / months) : null;
  const life = mChurn ? Math.min(60, 1 / mChurn) : null;
  return { paying: paying.length, mrr, arpu, mChurn, life, ltv: life ? arpu * life : 0 };
}
export function ltvStats(D: SuiteData, list: Account[]) {
  const withLtv = list.filter((a) => a.ltv > 0);
  const ltv = withLtv.length ? withLtv.reduce((s, a) => s + a.ltv, 0) / withLtv.length : 0;
  const active = list.filter((a) => a.status === "Active" || a.status === "Past Due");
  const churned = list.filter((a) => a.status === "Churned").length;
  const rv = (D.revenue || []).filter((r) => r.actual != null);
  const lastRev = rv.length ? (rv[rv.length - 1].actual as number) : null;
  const payingAll = D.accounts.filter((a) => (a.status === "Active" || a.status === "Past Due") && (personaOf(D, a.tier)?.price || 0) > 0).length;
  const arpu = lastRev && payingAll ? lastRev / payingAll : null;
  return {
    n: list.length, active: active.length, churned, churn: list.length ? churned / list.length : 0,
    trial: list.filter((a) => a.status === "Trial").length, ltv, arpu, months: arpu ? ltv / arpu : null, lastRev,
  };
}
export const tierAccounts = (D: SuiteData, name: string) => D.accounts.filter((a) => a.tier === name);

/* ---------- P.I.C.S cards ---------- */
export const isOpenP = (p: Pics) => !["Completed", "Closed"].includes(p.stage) && (!p.end || p.end >= todayIso);
export interface Stats { total: number; done: number; late: number; soon: number }
export const rowStats = (rows: WorkRow[]): Stats => ({
  total: rows.length,
  done: rows.filter(isDone).length,
  late: rows.filter(isLate).length,
  soon: rows.filter((r) => !isDone(r) && r.date >= todayIso && r.date <= in14).length,
});
export function clStats(items: ChecklistItem[]): Stats {
  const late = items.filter((c) => c.status !== "Completed" && c.due && c.due < todayIso);
  return {
    total: items.length,
    done: items.filter((c) => c.status === "Completed").length,
    late: late.length,
    soon: items.filter((c) => c.status !== "Completed" && !!c.due && c.due >= todayIso && c.due <= in14).length,
  };
}

/* ---------- Checklists (P.I.C.S Checklist) ---------- */
export const CL_GROUPS: Record<string, string> = {
  A: "Sign-up & login", B: "Business setup", C: "Booking", D: "Shopping", E: "Payments & payouts", F: "Business tools", G: "Community & help",
};
export const phaseOf = (c: ChecklistItem) =>
  ((c.roadmap || "").match(/Phase\s*\d+/i) || String(c.item).match(/Phase\s*\d+/i) || [""])[0];
/** Clean label; 💳 marks a payment step (the original replaced " [$ payment]"). */
export const clClean = (c: { item: string }, p: Pics) =>
  String(c.item)
    .replace(/^[A-Z]\d+ — /, "")
    .replace(shortPics(p.name) + " — ", "")
    .replace(/\s*\(Phase\s*\d+\)/i, "")
    .replace(" [$ payment]", " 💳");
export interface Checklist {
  key: string;
  pics: Pics;
  phase: string;
  items: ChecklistItem[];
  coded: boolean;
  name: string;
  st: Stats;
}
export function checklistsFor(D: SuiteData, nodeId: string | null): Checklist[] {
  const ids = nodeId ? picsTree(D, nodeId).map((p) => p.id) : D.pics.map((p) => p.id);
  const out: Record<string, { key: string; pics: Pics; phase: string; items: ChecklistItem[] }> = {};
  D.pics
    .filter((p) => ids.includes(p.id))
    .forEach((p) =>
      (p.checklist || []).forEach((c) => {
        const ph = phaseOf(c);
        const k = p.id + "|" + ph;
        (out[k] = out[k] || { key: k, pics: p, phase: ph, items: [] }).items.push(c);
      }),
    );
  return Object.values(out)
    .map((c) => {
      const coded = c.items.every((i) => /^[A-Z]\d+ — /.test(i.item || ""));
      return { ...c, coded, name: coded ? "Launch test script" : shortPics(c.pics.name) + " deliverables", st: clStats(c.items) };
    })
    .sort((a, b) => (a.pics.name + a.phase).localeCompare(b.pics.name + b.phase));
}
export const clByKey = (D: SuiteData, k: string) => checklistsFor(D, null).find((c) => c.key === k);
export function clItem(D: SuiteData, id: string) {
  for (const p of D.pics) {
    const c = (p.checklist || []).find((x) => x.id === id);
    if (c) return { c, p };
  }
  return null;
}
export const clWork = (D: SuiteData, nodeId: string): WorkRow[] =>
  checklistsFor(D, nodeId).flatMap((cl) =>
    cl.items
      .filter((c) => c.due)
      .map((c) => ({
        date: c.due as string, label: "", clean: clClean(c, cl.pics), type: "Checklist · " + (cl.phase || cl.name),
        pics: cl.pics.name, status: c.status, ck: cl.key,
      })),
  );
export function msGroups(ms: WorkRow[]) {
  const g: WorkRow[][] = [];
  ms.forEach((m) => {
    const l = g[g.length - 1];
    if (l && l[0].date === m.date) l.push(m);
    else g.push([m]);
  });
  return g;
}
export const featuresByPersona = (D: SuiteData, name: string) => D.features.filter((f) => f.personas.includes(name));
export const notesFor = (D: SuiteData, fid: string): Feedback[] => D.feedback.filter((x) => x.feature === fid);
