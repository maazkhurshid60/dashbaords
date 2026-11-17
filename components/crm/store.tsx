"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui";
import type { CrmData, Kind, Member, WriteResult } from "@/lib/crm-types";

/* Client state of the Communications CRM: the live data (from the server), who is viewing
   (COM-26 Admin vs team member), the open drawer, and write() → POST /api/comms/<action>.
   Successful writes upsert the returned records, so the page reflects Airtable immediately. */

export type Tab = "Inbox" | "Contacts" | "Pipelines" | "Campaigns" | "Insights" | "Updates";
export const TABS: Tab[] = ["Inbox", "Contacts", "Pipelines", "Campaigns", "Insights", "Updates"];

export type Panel =
  | { kind: "contact"; id: string }
  | { kind: "company"; id: string }
  | { kind: "opp"; id: string }
  | { kind: "campaign"; id: string }
  | { kind: "new"; what: NewWhat; prefill?: Record<string, unknown> }
  | { kind: "sources" }
  | { kind: "notify" };
export type NewWhat = "Contact" | "Company" | "Contractor" | "Opportunity" | "Task" | "Update";

/** Cross-tab navigation hints (e.g. Insights → Inbox filtered). */
export interface Nav {
  inboxView?: string;
  inboxMsg?: string;
  pipeline?: string;
  stage?: string;
  contactsSection?: "People" | "Companies" | "Contractors";
}

interface Ctx {
  D: CrmData;
  role: "Admin" | "Team member";
  setRole: (r: "Admin" | "Team member") => void;
  isAdmin: boolean;
  me: Member | null;
  setMeId: (id: string) => void;
  showTags: boolean;
  setShowTags: (b: boolean) => void;
  tab: Tab;
  go: (t: Tab, nav?: Nav) => void;
  nav: Nav;
  panel: Panel | null;
  setPanel: (p: Panel | null) => void;
  write: (action: string, payload: Record<string, unknown>, ok?: string) => Promise<WriteResult | null>;
  busy: boolean;
  toast: (m: string) => void;
  name: (id: string) => string;
  opts: (key: string) => string[];
  log: { at: string; action: string; ok: boolean; note: string }[];
}

const C = createContext<Ctx | null>(null);
export const useCrm = () => {
  const c = useContext(C);
  if (!c) throw new Error("useCrm outside CrmProvider");
  return c;
};

export function CrmProvider({ initial, children }: { initial: CrmData; children: ReactNode }) {
  const [D, setD] = useState(initial);
  const toast = useToast();
  const firstAdmin = initial.members.find((m) => m.intranetRole === "Admin");
  const [role, setRole] = useState<"Admin" | "Team member">("Admin"); // no sign-in yet → Admin view by default
  const [meId, setMeId] = useState(firstAdmin?.id || "");
  const [showTags, setShowTags] = useState(false);
  const [tab, setTab] = useState<Tab>("Inbox");
  const [nav, setNav] = useState<Nav>({});
  const [panel, setPanel] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Ctx["log"]>([]);

  const index = useMemo(() => {
    const m = new Map<string, string>(Object.entries(D.names));
    D.members.forEach((x) => m.set(x.id, x.name));
    D.contacts.forEach((x) => m.set(x.id, x.name || x.email));
    D.companies.forEach((x) => m.set(x.id, x.name));
    D.opps.forEach((x) => m.set(x.id, x.name));
    D.stages.forEach((x) => m.set(x.id, x.name));
    D.sources.forEach((x) => m.set(x.id, x.name));
    D.campaigns.forEach((x) => m.set(x.id, x.name));
    D.pipelines.forEach((x) => m.set(x.id, x.name));
    return m;
  }, [D]);

  const write = useCallback(
    async (action: string, payload: Record<string, unknown>, ok?: string) => {
      if (!D.live) {
        toast("Airtable isn't connected — nothing was saved");
        return null;
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/comms/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, by: payload.by ?? (meId ? [meId] : []) }),
        });
        const j = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as WriteResult;
        const nc = j.notConnected?.length ? ` · ${j.notConnected.join(", ")} not connected yet` : "";
        setLog((l) => [{ at: new Date().toISOString(), action, ok: !!j.ok, note: j.ok ? (ok || "Saved") + nc : j.error || "Failed" }, ...l].slice(0, 200));
        if (!j.ok) {
          toast(j.error || "Couldn't save to Airtable");
          return j;
        }
        setD((prev) => {
          const next = { ...prev } as CrmData;
          for (const { kind, record } of j.records || []) {
            const list = [...((next[kind] as { id: string }[]) || [])];
            const i = list.findIndex((x) => x.id === record.id);
            if (i >= 0) list[i] = record;
            else list.unshift(record);
            (next as unknown as Record<Kind, unknown>)[kind] = list;
          }
          for (const { kind, id } of j.removed || []) {
            (next as unknown as Record<Kind, unknown>)[kind] = (next[kind] as { id: string }[]).filter((x) => x.id !== id);
          }
          return next;
        });
        toast((ok || "Saved to Airtable") + nc);
        return j;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Network error");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [D.live, meId, toast],
  );

  const value: Ctx = {
    D,
    role,
    setRole,
    isAdmin: role === "Admin",
    me: D.members.find((m) => m.id === meId) || null,
    setMeId: (id) => {
      setMeId(id);
      const m = D.members.find((x) => x.id === id);
      if (m?.intranetRole === "Admin" || m?.intranetRole === "Team member") setRole(m.intranetRole);
    },
    showTags,
    setShowTags,
    tab,
    go: (t, n) => {
      setTab(t);
      setNav(n || {});
      setPanel(null);
    },
    nav,
    panel,
    setPanel,
    write,
    busy,
    toast,
    name: (id) => index.get(id) || "",
    opts: (key) => D.options[key] || [],
    log,
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
