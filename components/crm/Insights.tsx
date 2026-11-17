"use client";

import { useState, type ReactNode } from "react";
import { DAY, H as HOUR, groupOfChannel, inboxMatch, isLost, isOpenOpp, isWon, moneyShort, pct, stageOf, ts, weighted } from "@/lib/crm-logic";
import { nowMs } from "@/lib/crm-logic";
import type { Opp } from "@/lib/crm-types";
import { Com, Empty, H } from "./bits";
import { useCrm } from "./store";

const PERIODS = { week: 7, month: 30, quarter: 91, year: 365 } as const;

function Bars({ rows, onPick }: { rows: [string, number, string?][]; onPick?: (k: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <Empty>No data in this period.</Empty>;
  return (
    <div className="space-y-1.5">
      {rows.map(([k, v, lab]) => (
        <button key={k} type="button" disabled={!onPick} onClick={() => onPick?.(k)} className="grid w-full grid-cols-[140px_1fr_70px] items-center gap-2 text-left text-[12.5px] hover:opacity-80">
          <span className="truncate">{k || "—"}</span>
          <span className="h-3 rounded bg-plane">
            <span className="block h-full rounded bg-brand" style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className="text-right text-ink-2">{lab ?? v}</span>
        </button>
      ))}
    </div>
  );
}

const Card = ({ title, children, com }: { title: string; children: ReactNode; com?: string }) => (
  <section className="card p-4">
    <H>
      {title}
      {com && <Com id={com} />}
    </H>
    {children}
  </section>
);

/* Insights (COM-16 / COM-17; no status-card repeats — COM-34). */
export function Insights() {
  const { D, go, setPanel, name } = useCrm();
  const [period, setPeriod] = useState<keyof typeof PERIODS>("quarter");
  const [pipe, setPipe] = useState("");
  const since = nowMs() - PERIODS[period] * DAY;
  const opps = D.opps.filter((o) => !pipe || o.pipeline === pipe);
  const open = opps.filter((o) => isOpenOpp(o, D.stages));
  const closed = opps.filter((o) => (isWon(o, D.stages) || isLost(o, D.stages)) && ts(o.stageChangedAt || o.created) >= since);
  const won = closed.filter((o) => isWon(o, D.stages));
  const ttc = won.map((o) => (ts(o.stageChangedAt) - ts(o.created)) / DAY).filter((x) => x > 0);
  const newContacts = D.contacts.filter((c) => ts(c.created) >= since);
  const inc = D.msgs.filter((m) => m.direction !== "Outgoing" && ts(m.date) >= since);
  const replyHours = (ch: string) => {
    const l = inc.filter((m) => groupOfChannel(m.channel) === ch && m.status === "Replied");
    const acts = l.map((m) => {
      const a = D.activities.find((x) => x.msgIds.includes(m.id) && x.type === "Email");
      return a ? (ts(a.date) - ts(m.date)) / HOUR : NaN;
    }).filter((x) => Number.isFinite(x) && x >= 0);
    return acts.length ? acts.reduce((s, x) => s + x, 0) / acts.length : null;
  };
  const avgFirst = (() => {
    const xs = ["Email", "Site forms", "Chatbot", "Community"].map(replyHours).filter((x): x is number => x != null);
    return xs.length ? `${Math.round(xs.reduce((s, x) => s + x, 0) / xs.length)}h` : "—";
  })();
  const count = <T,>(l: T[], k: (x: T) => string) => {
    const m = new Map<string, number>();
    l.forEach((x) => m.set(k(x), (m.get(k(x)) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const attention: { label: string; act: () => void }[] = [
    ...open.filter((o) => !o.nextStep).map((o: Opp) => ({ label: `${o.name} needs a next step`, act: () => setPanel({ kind: "opp", id: o.id }) })),
    ...(D.tasks.filter((t) => !t.completed && !t.assigneeIds.length).length ? [{ label: `${D.tasks.filter((t) => !t.completed && !t.assigneeIds.length).length} unassigned tasks`, act: () => go("Pipelines") }] : []),
    ...(D.msgs.filter((m) => inboxMatch("past24", m, D)).length ? [{ label: `${D.msgs.filter((m) => inboxMatch("past24", m, D)).length} replies past 24h`, act: () => go("Inbox", { inboxView: "past24" }) }] : []),
  ];
  const kpi: [string, string][] = [
    ["Open pipeline", moneyShort(open.reduce((s, o) => s + (o.value || 0), 0))],
    ["Weighted forecast", moneyShort(open.reduce((s, o) => s + weighted(o, D.stages), 0))],
    ["Win rate", `${pct(won.length, closed.length)}%`],
    ["Avg time to close", ttc.length ? `${Math.round(ttc.reduce((s, x) => s + x, 0) / ttc.length)}d` : "—"],
    ["New contacts", String(newContacts.length)],
    ["Avg first reply", avgFirst],
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="seg">
          {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((p) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="seg">
          {["", ...D.pipelines.filter((p) => p.active).map((p) => p.name)].map((p) => (
            <button key={p} type="button" aria-pressed={pipe === p} onClick={() => setPipe(p)}>
              {p || "All pipelines"}
            </button>
          ))}
        </div>
        <Com id="COM-16" />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {kpi.map(([l, v]) => (
          <div key={l} className="card px-3 py-2">
            <div className="text-[11px] font-semibold text-muted">{l}</div>
            <div className="text-[18px] font-bold">{v}</div>
          </div>
        ))}
      </div>
      <Card title="Needs your attention" com="COM-17">
        {attention.length ? (
          <ul className="space-y-1">
            {attention.slice(0, 12).map((a, i) => (
              <li key={i}>
                <button type="button" className="text-left text-[13px] text-brand hover:underline" onClick={a.act}>
                  • {a.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>All clear.</Empty>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Stage conversion">
          <Bars rows={D.stages.map((s) => [s.name, opps.filter((o) => stageOf(o, D.stages)?.id === s.id).length] as [string, number])} onPick={(k) => go("Pipelines", { pipeline: pipe, stage: D.stages.find((s) => s.name === k)?.id })} />
        </Card>
        <Card title="Where leads come from">
          <Bars rows={count(newContacts, (c) => c.source || "Unknown").slice(0, 10)} onPick={() => go("Contacts")} />
        </Card>
        <Card title="Owners (open pipeline)">
          <Bars rows={count(open, (o) => o.ownerIds.map(name).join(", ") || "Unassigned").map(([k]) => [k, open.filter((o) => (o.ownerIds.map(name).join(", ") || "Unassigned") === k).reduce((s, o) => s + (o.value || 0), 0), undefined] as [string, number, undefined]).map(([k, v]) => [k, v, moneyShort(v)] as [string, number, string])} />
        </Card>
        <Card title="Response time by channel">
          <Bars rows={["Email", "Site forms", "Chatbot", "Community"].map((c) => [c, replyHours(c) ?? 0, replyHours(c) == null ? "—" : `${Math.round(replyHours(c)!)}h`] as [string, number, string])} onPick={() => go("Inbox", { inboxView: "answered" })} />
        </Card>
        <Card title="What people write about">
          <Bars rows={count(inc, (m) => m.intent || "Unclassified").slice(0, 8)} onPick={() => go("Inbox", { inboxView: "all" })} />
        </Card>
        <Card title="Forecast vs target">
          <p className="text-[13px] text-ink-2">
            Weighted forecast {kpi[1][1]} vs won {moneyShort(won.reduce((s, o) => s + (o.value || 0), 0))} this {period}. No revenue target field exists in Airtable yet.
          </p>
        </Card>
      </div>
    </div>
  );
}
