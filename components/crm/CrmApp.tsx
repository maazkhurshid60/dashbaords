"use client";

import { useEffect, useMemo, useState } from "react";
import { ago, hit, inboxMatch, isOpenOpp } from "@/lib/crm-logic";
import type { CrmData } from "@/lib/crm-types";
import { Chip, Com, Drawer, cx } from "./bits";
import { CampaignDrawer, Campaigns } from "./Campaigns";
import { Contacts } from "./Contacts";
import { Inbox, NotifyPanel, SourcesPanel } from "./Inbox";
import { Insights } from "./Insights";
import { Pipelines } from "./Pipelines";
import { CompanyDrawer, ContactDrawer, NewDrawer, OppDrawer } from "./records";
import { CrmProvider, TABS, useCrm, type NewWhat } from "./store";
import { Updates } from "./Updates";

export function CrmApp({ initial }: { initial: CrmData }) {
  return (
    <CrmProvider initial={initial}>
      <Shell />
    </CrmProvider>
  );
}

function Shell() {
  const { D, tab, go, isAdmin, panel, setPanel } = useCrm();
  const counts = useMemo(
    () => ({
      Inbox: D.msgs.filter((m) => inboxMatch("needs", m, D) || inboxMatch("drafts", m, D)).length,
      Contacts: D.contacts.filter((c) => c.stage !== "Contractor").length,
      Pipelines: D.opps.filter((o) => isOpenOpp(o, D.stages)).length,
      Campaigns: D.campaigns.filter((c) => c.status === "Active").length,
      Insights: null,
      Updates: D.announcements.filter((a) => a.status === "Published").length,
    }),
    [D],
  );
  const tabs = TABS.filter((t) => t !== "Updates" || isAdmin);
  useEffect(() => {
    if (tab === "Updates" && !isAdmin) go("Inbox");
  }, [tab, isAdmin, go]);
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">
      <Header />
      {D.errors.length > 0 && <div className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] text-bad">Some Airtable tables didn&apos;t load: {D.errors.join(" · ")}</div>}
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => go(t)} className={cx("-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[14px]", tab === t ? "border-brand font-bold text-brand" : "border-transparent text-ink-2 hover:text-ink")}>
            {t}
            {counts[t] != null && <span className="ml-1.5 rounded-full bg-plane px-1.5 text-[11.5px] text-ink-2">{counts[t]}</span>}
          </button>
        ))}
        <Com id="COM-2" />
      </nav>
      <main className="pt-7">
        {tab === "Inbox" && <Inbox />}
        {tab === "Contacts" && <Contacts />}
        {tab === "Pipelines" && <Pipelines />}
        {tab === "Campaigns" && <Campaigns />}
        {tab === "Insights" && <Insights />}
        {tab === "Updates" && isAdmin && <Updates />}
      </main>
      {panel?.kind === "contact" && <ContactDrawer id={panel.id} />}
      {panel?.kind === "company" && <CompanyDrawer id={panel.id} />}
      {panel?.kind === "opp" && <OppDrawer id={panel.id} />}
      {panel?.kind === "campaign" && <CampaignDrawer id={panel.id} />}
      {panel?.kind === "new" && <NewDrawer key={panel.what} what={panel.what} prefill={panel.prefill} />}
      {panel?.kind === "sources" && (
        <Drawer title="Manage inboxes & sites" onClose={() => setPanel(null)}>
          <SourcesPanel />
        </Drawer>
      )}
      {panel?.kind === "notify" && (
        <Drawer title="Notification settings" onClose={() => setPanel(null)}>
          <NotifyPanel />
        </Drawer>
      )}
    </div>
  );
}

function Header() {
  const { D, role, setRole, isAdmin, me, setMeId, showTags, setShowTags, setPanel, go, log } = useCrm();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<"" | "new" | "bell" | "log">("");
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("crm-search")?.focus();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const results = q.trim().length < 2
    ? []
    : [
        ...D.msgs.filter((m) => hit(q, m.subject, m.from)).slice(0, 5).map((m) => ({ k: "Message", label: m.subject || m.from, act: () => go("Inbox", { inboxView: "all", inboxMsg: m.id }) })),
        ...D.contacts.filter((c) => hit(q, c.name, c.email, c.org)).slice(0, 5).map((c) => ({ k: "Contact", label: c.name || c.email, act: () => setPanel({ kind: "contact", id: c.id }) })),
        ...D.companies.filter((c) => hit(q, c.name)).slice(0, 4).map((c) => ({ k: "Company", label: c.name, act: () => setPanel({ kind: "company", id: c.id }) })),
        ...D.opps.filter((o) => hit(q, o.name)).slice(0, 4).map((o) => ({ k: "Opportunity", label: o.name, act: () => setPanel({ kind: "opp", id: o.id }) })),
      ];
  const alerts = [
    ...D.alerts.filter((a) => !me || !a.readByIds.includes(me.id)).map((a) => ({ id: a.id, label: `${a.type}: ${a.alert}`, at: a.sentAt, msg: a.msgIds[0] })),
    ...D.msgs.filter((m) => inboxMatch("past24", m, D)).slice(0, 10).map((m) => ({ id: m.id, label: `Past 24h: ${m.subject || m.from}`, at: m.date, msg: m.id })),
  ];
  const NEW: NewWhat[] = ["Contact", "Company", "Contractor", "Opportunity", "Task", ...(isAdmin ? (["Update"] as NewWhat[]) : [])];
  return (
    <header className="flex flex-wrap items-center gap-3">
      <h1 className="text-[24px] font-bold text-ink">Communications</h1>
      <div className="relative ml-auto w-full max-w-sm">
        <input id="crm-search" className="field" placeholder="Search messages, contacts, companies, opportunities (⌘K)" value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length > 0 && (
          <div className="absolute z-40 mt-1 w-full rounded-xl border border-line bg-shell p-1 shadow-xl">
            {results.map((r, i) => (
              <button key={i} type="button" className="flex w-full gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-plane" onClick={() => { r.act(); setQ(""); }}>
                <Chip>{r.k}</Chip>
                <span className="truncate">{r.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Com id="COM-3" />
      <div className="relative">
        <button type="button" className="btn btn-brand btn-sm" onClick={() => setMenu(menu === "new" ? "" : "new")}>
          ＋ New
        </button>
        {menu === "new" && (
          <div className="absolute right-0 z-40 mt-1 w-48 rounded-xl border border-line bg-shell p-1 shadow-xl">
            {NEW.map((w) => (
              <button
                key={w}
                type="button"
                className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] hover:bg-plane"
                onClick={() => {
                  setMenu("");
                  if (w === "Update") go("Updates");
                  else setPanel({ kind: "new", what: w });
                }}
              >
                {w === "Task" ? "Task or follow-up" : w}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <button type="button" className="btn btn-sm" onClick={() => setMenu(menu === "bell" ? "" : "bell")} aria-label="Alerts">
          🔔 {alerts.length || ""}
        </button>
        {menu === "bell" && (
          <div className="absolute right-0 z-40 mt-1 w-80 rounded-xl border border-line bg-shell p-1 shadow-xl">
            {alerts.slice(0, 15).map((a) => (
              <button key={a.id} type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-[12.5px] hover:bg-plane" onClick={() => { setMenu(""); if (a.msg) go("Inbox", { inboxView: "all", inboxMsg: a.msg }); }}>
                {a.label} <span className="text-muted">· {ago(a.at)}</span>
              </button>
            ))}
            {!alerts.length && <div className="p-3 text-[12.5px] text-muted">No alerts.</div>}
            <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left text-[12.5px] font-semibold text-brand hover:bg-plane" onClick={() => { setMenu(""); setPanel({ kind: "notify" }); }}>
              Notification settings
            </button>
          </div>
        )}
      </div>
      <Com id="COM-24" />
      <div className="seg" title="No sign-in yet — preview Admin vs team member">
        {(["Admin", "Team member"] as const).map((r) => (
          <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
            {r}
          </button>
        ))}
      </div>
      <select className="field w-auto py-1 text-[12px]" value={me?.id || ""} onChange={(e) => setMeId(e.target.value)} title="Acting as (Team Members › Intranet Role)">
        <option value="">Acting as…</option>
        {D.members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.intranetRole ? ` (${m.intranetRole})` : ""}
          </option>
        ))}
      </select>
      <Com id="COM-26" />
      <label className="flex items-center gap-1 text-[12px] text-ink-2">
        <input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} /> Show change tags (COM)
      </label>
      <div className="relative">
        <button type="button" className="btn btn-sm" onClick={() => setMenu(menu === "log" ? "" : "log")}>
          Log · {log.length}
        </button>
        {menu === "log" && (
          <div className="absolute right-0 z-40 mt-1 max-h-80 w-96 overflow-y-auto rounded-xl border border-line bg-shell p-2 text-[12px] shadow-xl">
            <div className="mb-1 font-bold">Developer log — every write this session</div>
            {log.map((l, i) => (
              <div key={i} className={cx("border-b border-line py-1", !l.ok && "text-bad")}>
                {l.at.slice(11, 19)} · {l.action} · {l.note}
              </div>
            ))}
            {!log.length && <div className="text-muted">No writes yet.</div>}
          </div>
        )}
      </div>
    </header>
  );
}
