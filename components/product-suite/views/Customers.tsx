"use client";

/* CUSTOMERS › SEGMENTS (vSegments, personaCompare, personaProfile, customersStrip)
   and CUSTOMERS › LIFETIME VALUE (vLTV). */
import type { ReactNode } from "react";
import { AT, atUrl } from "@/lib/product-data";
import type { Persona } from "@/lib/product-types";
import { cx } from "@/lib/utils";
import { fmt$, fmtD, fmtN, pct, personaColor } from "../format";
import { accIn, featuresByPersona, ltvStats, matchQ, segOK, tierAccounts } from "../logic";
import { AirtableLink, Card, Empty, H5, Item, Kpi, KpiRow, PDot, Pill, StagePill, Small } from "../primitives";
import { HBars, heatColor, HEAT_KEY, Legend, LineChart } from "../SuiteCharts";
import { HiddenNote } from "../Shell";
import { useSuite } from "../useSuite";
import { SERIES } from "@/components/charts";

/** KPI strip above the Customers tab. */
export function CustomersStrip() {
  const { D, act } = useSuite();
  const s = ltvStats(D, D.accounts);
  return (
    <KpiRow>
      <Kpi num={fmtN(s.n)} lbl="Customers" explain={`${s.active} active · ${s.trial} on a trial`} />
      <Kpi num={s.lastRev != null ? fmt$(s.lastRev) : "—"} lbl="Monthly revenue" explain="latest month · Revenue & Forecasts" />
      <Kpi num={fmt$(s.ltv)} lbl="Customer LTV" explain="average Lifetime Value · Accounts (Reference)" onClick={() => act.sub("ltv")} />
      <Kpi num={pct(s.churn, 1)} lbl="Churn" explain="share of customers who have left" />
    </KpiRow>
  );
}

export function SegmentsView() {
  const { D, S, q, has, act } = useSuite();
  const sel = S.persona ? D.personas.find((p) => p.name === S.persona) : null;
  const cmp = S.compare.map((n) => D.personas.find((p) => p.name === n)).filter((p): p is Persona => !!p);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {D.personas
          .filter((p) => !p.missing && matchQ(q, p.name, p.summary))
          .map((p) => {
            const s = ltvStats(D, tierAccounts(D, p.name));
            const on = S.persona === p.name;
            return (
              <div
                key={p.name}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                onClick={() => act.persona(p.name)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), act.persona(p.name))}
                className={cx("card relative cursor-pointer p-5 transition hover:-translate-y-0.5", on && "ring-2 ring-brand")}
              >
                <label className="absolute right-4 top-4 flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-muted" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="accent-brand" checked={S.compare.includes(p.name)} onChange={() => act.cmp(p.name)} /> Compare
                </label>
                <div className="flex items-center gap-2.5 pr-20 text-[15px] font-extrabold">
                  <span className="grid size-8 place-items-center rounded-full text-[13px] font-black text-white" style={{ background: personaColor(p.name) }}>
                    {p.name[0]}
                  </span>
                  {p.name}
                </div>
                <div className="mt-1 text-[12px] font-semibold text-ink-2">{has("Customer Personas.Price Label") ? p.priceLabel : " "}</div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-[11px] text-muted">
                  {(
                    [
                      [fmtN(s.n), "customers", "text-brand"],
                      [s.ltv ? fmt$(s.ltv) : "—", "Customer LTV", "text-violet"],
                      [pct(s.churn, 0), "churn", "text-warn"],
                      [featuresByPersona(D, p.name).length, "key features", "text-ink"],
                    ] as [ReactNode, string, string][]
                  ).map(([v, l, c]) => (
                    <div key={l}>
                      <b className={cx("block text-[15px] font-extrabold", c)}>{v}</b>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
      {cmp.length >= 2 && <PersonaCompare ps={cmp} />}
      <div id="pProfile" className="scroll-mt-6">
        {sel ? <PersonaProfile p={sel} /> : <Empty>Pick a segment above to see who they are, what they want and what they&apos;re worth.</Empty>}
      </div>
      <HiddenNote
        list={[
          ["Customer Personas.Price Label", "Price on each card"],
          ["Accounts (Reference).Adoption Stage", "Journey stage"],
          ["User Feedback & Insights.Related Persona", "Feedback per segment"],
          ["Accounts (Reference).City", "Locations"],
          [["Accounts (Reference).NPS Score"], "NPS"],
        ]}
      />
    </div>
  );
}

function PersonaCompare({ ps }: { ps: Persona[] }) {
  const { D, act } = useSuite();
  const st = (p: Persona) => ltvStats(D, tierAccounts(D, p.name));
  const rows: [string, (p: Persona) => ReactNode][] = [
    ["Customers", (p) => fmtN(st(p).n)],
    ["Active", (p) => st(p).active],
    ["On a trial", (p) => st(p).trial],
    ["Customer LTV", (p) => (st(p).ltv ? fmt$(st(p).ltv) : "—")],
    ["Churn", (p) => pct(st(p).churn, 1)],
    ["Key features", (p) => featuresByPersona(D, p.name).length],
  ];
  return (
    <Card title="Side by side">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th />
              {ps.map((p) => (
                <th key={p.name} className="px-3 py-2 text-left font-bold">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <PDot name={p.name} /> {p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([l, fn]) => (
              <tr key={l} className="border-t border-line">
                <td className="py-2 pr-3 text-[11.5px] font-bold text-muted">{l}</td>
                {ps.map((p) => (
                  <td key={p.name} className="px-3 py-2 font-bold tabular-nums">
                    {fn(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-sm mt-4" onClick={act.cmpclear}>
        Clear comparison
      </button>
    </Card>
  );
}

function PersonaProfile({ p }: { p: Persona }) {
  const { D, act } = useSuite();
  const L = tierAccounts(D, p.name);
  const s = ltvStats(D, L);
  const kf = featuresByPersona(D, p.name);
  const color = personaColor(p.name);
  const byStatus = ["Trial", "Active", "Past Due", "Churned"].map((x) => ({ n: x, v: L.filter((a) => a.status === x).length, c: color }));
  return (
    <section className="card min-w-0 overflow-hidden p-5" style={{ borderTop: `4px solid ${color}` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full text-[18px] font-black text-white" style={{ background: color }}>
            {p.name[0]}
          </span>
          <div>
            <div className="text-[19px] font-extrabold">{p.full || p.name}</div>
            <Small>Customer Personas</Small>
          </div>
        </div>
        {p.id && String(p.id).startsWith("rec") && <AirtableLink href={atUrl(AT.personas.id, p.id)} />}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {(
          [
            ["Who they are", p.summary],
            ["What they want", p.objectives],
            ["What frustrates them", p.pains],
          ] as const
        ).map(([h, t]) => (
          <div key={h}>
            <H5 first>{h}</H5>
            <p className="text-[12.5px] leading-relaxed text-ink-2">{t}</p>
          </div>
        ))}
      </div>
      <KpiRow className="mt-4">
        <Kpi num={fmtN(s.n)} lbl="Customers" />
        <Kpi num={s.ltv ? fmt$(s.ltv) : "—"} lbl="Customer LTV" explain="average Lifetime Value" />
        <Kpi num={pct(s.churn, 1)} lbl="Churn" />
        <Kpi num={s.trial} lbl="On a trial" />
      </KpiRow>
      <div className="mt-2 grid gap-6 md:grid-cols-2">
        <div>
          <H5>Account status · Accounts (Reference)</H5>
          <HBars rows={byStatus} />
        </div>
        <div>
          <H5>Key features · Product Features</H5>
          {kf.length ? (
            kf.map((f) => (
              <Item key={f.id} onClick={() => act.feature(f.id)} right={<StagePill s={f.status} />}>
                <b>{f.name}</b>
              </Item>
            ))
          ) : (
            <Small>None linked</Small>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- LIFETIME VALUE ---------------- */
export function LtvView() {
  const { D, S, has } = useSuite();
  const L = accIn(D, S.segment);
  const s = ltvStats(D, L);
  const cacs = (D.channels || []).filter((c) => c.cac);
  const avgCac = cacs.length ? cacs.reduce((a, c) => a + c.cac, 0) / cacs.length : null;
  const ratio = avgCac && s.ltv ? s.ltv / avgCac : null;
  const perSeg = D.personas.filter((p) => !p.missing && segOK(S.segment, p.name)).map((p) => ({ p, s: ltvStats(D, tierAccounts(D, p.name)) }));
  const bySeg = perSeg.filter((x) => x.s.ltv > 0).sort((a, b) => b.s.ltv - a.s.ltv);
  const churnSeg = perSeg.filter((x) => x.s.n > 0).sort((a, b) => b.s.churn - a.s.churn);
  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center gap-5 bg-plane/50 p-5">
        <div className="min-w-[260px] flex-1">
          <h3 className="text-[15px] font-extrabold">What is Customer LTV?</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
            Lifetime value is how much a paying customer spends with us, on average, before they leave. It comes from the <b>Lifetime Value</b> field on
            each account in Accounts (Reference). When a customer is worth more than it costs to win them, the business grows.
          </p>
        </div>
        {s.arpu ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-muted">
            <Pill tone="info" className="h-8 px-3 text-[12px]">
              {fmt$(s.arpu)} a month
            </Pill>
            ×
            <Pill tone="info" className="h-8 px-3 text-[12px]">
              {(s.months || 0).toFixed(0)} months
            </Pill>
            ≈
            <Pill tone="good" className="h-8 px-3 text-[13px]">
              {fmt$(s.ltv)}
            </Pill>
          </div>
        ) : null}
      </section>
      <KpiRow>
        <Kpi num={fmt$(s.ltv)} lbl="Customer LTV" explain="average Lifetime Value" />
        <Kpi num={s.arpu ? fmt$(s.arpu) : "—"} lbl="Paid per month" explain="latest month revenue ÷ paying accounts" />
        <Kpi num={s.months ? s.months.toFixed(0) + " months" : "—"} lbl="How long they stay" explain="LTV ÷ monthly pay" />
        <Kpi
          num={ratio ? ratio.toFixed(1) + "×" : "—"}
          lbl="Worth vs. cost to win"
          explain={avgCac ? `average cost to win (Channels · CAC) is ${fmt$(avgCac)} · 3× or more is healthy` : ""}
        />
      </KpiRow>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Customer LTV by segment" sub="Accounts (Reference) · Pricing Tier + Lifetime Value">
          {bySeg.length ? (
            <HBars rows={bySeg.map((x) => ({ n: x.p.name, v: Math.round(x.s.ltv), c: personaColor(x.p.name) }))} fmt={fmt$} />
          ) : (
            <Empty>No lifetime values yet</Empty>
          )}
        </Card>
        <Card title="Customer churn" sub="share of each segment that has left · Account Status = Churned">
          {churnSeg.length ? (
            <HBars
              rows={churnSeg.map((x) => ({ n: x.p.name, v: Math.round(x.s.churn * 1000) / 10, c: personaColor(x.p.name) }))}
              max={Math.max(10, ...churnSeg.map((x) => x.s.churn * 100))}
              fmt={(x) => x + "%"}
            />
          ) : (
            <Empty>No accounts yet</Empty>
          )}
        </Card>
      </div>
      <Card title="Revenue vs plan" sub="Revenue & Forecasts, per month">
        <LineChart
          labels={D.revenue.map((r) => new Date(r.month + "-01T00:00:00").toLocaleDateString("en-US", { month: "short" }))}
          series={[
            { name: "Plan", color: SERIES[0], values: D.revenue.map((r) => r.projected), dash: true },
            { name: "Actual", color: SERIES[1], values: D.revenue.map((r) => r.actual) },
          ]}
          h={220}
          yFmt={fmt$}
          aria="Revenue vs plan"
        />
      </Card>
      {has("Accounts (Reference).Last Active") && (
        <Card title="Customer churn over time" sub="% of each week's sign-ups still active after N weeks">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <b className="text-[11.5px]">Key:</b>
            <Legend className="mt-0" items={HEAT_KEY.map((k) => ({ ...k, square: true }))} />
          </div>
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1 text-[12px]">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-bold uppercase text-muted">Joined</th>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
                    <th key={k} className="text-right text-[11px] font-bold uppercase text-muted">
                      Wk {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(D.cohorts || []).map((c) => (
                  <tr key={c.week}>
                    <td className="whitespace-nowrap pr-2 font-bold">{fmtD(c.week)}</td>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
                      const val = c.row[k];
                      if (val == null) return <td key={k} />;
                      const hc = heatColor(val / 100);
                      return (
                        <td key={k} className="rounded-md px-2 py-1.5 text-right font-bold tabular-nums" style={{ background: hc.bg, color: hc.fg }} title={`${val}% still active`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <HiddenNote
        list={[
          ["Accounts (Reference).Acquisition Channel", "Worth vs. cost per channel"],
          ["Accounts (Reference).Last Active", "Churn-over-time grid"],
        ]}
      />
    </div>
  );
}
