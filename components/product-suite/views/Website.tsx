"use client";

/* PERFORMANCE › WEBSITE (vWebsite) */
import { IconExternal } from "@/components/icons";
import { cx } from "@/lib/utils";
import type { Finding } from "@/lib/product-types";
import { ago, fmt$, fmtD, fmtN, pct } from "../format";
import { matchQ } from "../logic";
import { Card, Empty, H5, Help, Item, Pill, SevPill, Small, Stat, StatusPill2, TONE_TEXT } from "../primitives";
import { Legend } from "../SuiteCharts";
import { HiddenNote } from "../Shell";
import { useSuite } from "../useSuite";

export function WebsiteView() {
  const { D, S, q, has, act } = useSuite();
  const s = D.site;
  const sw = D.sweep || { findings: [], lastRun: null };
  const known = (s.uptime || []).filter((u) => u.pct != null);
  const upAvg = known.length ? known.reduce((a, u) => a + (u.pct as number), 0) / known.length : null;
  const st = s.status;
  const sentence =
    st === "up"
      ? `acrylics.world is up and loading in ${s.ms != null ? (s.ms / 1000).toFixed(1) + " seconds" : "normal time"}.`
      : st === "down"
        ? "acrylics.world is not responding."
        : st === "degraded"
          ? "acrylics.world is up but slow."
          : "acrylics.world hasn't been checked yet.";
  const vit: [string, number | null | undefined, (x: number) => string, number, number, string][] = [
    ["Loading speed", s.vitals?.lcp, (x) => x.toFixed(1) + "s", 2.5, 4, "How long until the main content shows (LCP). Under 2.5s is good."],
    ["Responsiveness", s.vitals?.inp, (x) => Math.round(x) + "ms", 200, 500, "How fast the page reacts to a tap or click (INP). Under 200ms is good."],
    ["Layout stability", s.vitals?.cls, (x) => x.toFixed(2), 0.1, 0.25, "How much things jump around while loading (CLS). Under 0.1 is good."],
    ["Errors", s.errorRate != null ? s.errorRate * 100 : null, (x) => x.toFixed(2) + "%", 1, 5, "Share of page requests that failed. Under 1% is good."],
  ];
  const pages = [...D.pagePerf].filter((p) => matchQ(q, p.page)).sort((a, b) => b.views - a.views).slice(0, 8);
  const fs = sw.findings.filter((f) => matchQ(q, f.asset, f.fix, f.page));
  const open = fs.filter((f) => f.status === "To do"),
    assigned = fs.filter((f) => f.status === "Assigned"),
    dism = fs.filter((f) => f.status === "Dismissed");

  const fcard = (f: Finding) => (
    <button
      key={f.id}
      type="button"
      onClick={() => act.finding(f.id)}
      className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <Pill tone={f.sev === "High" ? "bad" : f.sev === "Medium" ? "warn" : "plain"}>
          {f.sev === "High" ? "! " : ""}
          {f.sev}
        </Pill>
        <Small>{fmtD(f.swept)}</Small>
      </div>
      <div className="mb-1 mt-2 text-[13px] font-bold">{f.asset}</div>
      <Small>{[f.page, f.env].filter(Boolean).join(" · ") || f.type}</Small>
      <div className="mt-2 line-clamp-3 text-[12px] text-ink-2">{f.fix}</div>
      <div className="mt-3">
        {f.status === "Assigned" ? (
          <Pill tone="info">→ {f.assignee}</Pill>
        ) : f.status === "Dismissed" ? (
          <Pill>Dismissed</Pill>
        ) : (
          <Pill tone="warn">Needs an assignee</Pill>
        )}
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      {has("Site Health Checks") && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {vit.map(([k, val, f, good, poor, desc]) => {
              const r = val == null ? "" : val <= good ? "Good" : val <= poor ? "Needs work" : "Poor";
              const tone = r === "Good" ? "good" : r === "Poor" ? "bad" : r ? "warn" : "";
              return (
                <div key={k} className="card p-4 sm:p-5">
                  <div className="text-[12.5px] font-bold">
                    {k}
                    <Help t={desc} />
                  </div>
                  <div className={cx("mt-2 text-[26px] font-extrabold leading-none", TONE_TEXT[tone])}>{val == null ? "—" : f(val)}</div>
                  <div className="mt-3">
                    {r ? (
                      <Pill tone={tone || "plain"}>
                        {r === "Good" ? "✓ " : r === "Poor" ? "✕ " : "! "}
                        {r}
                      </Pill>
                    ) : (
                      <Small>no data yet</Small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <span
                className={cx(
                  "relative size-3.5 shrink-0 rounded-full",
                  st === "up" ? "bg-good" : st === "down" ? "bg-bad" : "bg-muted",
                )}
                aria-hidden
              />
              <div className="min-w-[220px] flex-1">
                <div className="text-[15px] font-extrabold">{sentence}</div>
                <Small>Site Health Checks · {S.lastSiteCheck ? "checked " + ago(S.lastSiteCheck) : "not checked"}</Small>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-sm" href={s.url} target="_blank" rel="noopener">
                  Open site <IconExternal width={13} height={13} />
                </a>
                <button type="button" className="btn btn-sm" onClick={act.recheck}>
                  Check now
                </button>
              </div>
            </div>
            <H5>
              Was it up? · last 30 days
              {upAvg != null && <span className="normal-case tracking-normal text-ink"> · up {upAvg.toFixed(2)}% of the time</span>}
            </H5>
            <div className="flex h-8 gap-[3px]">
              {(s.uptime || []).map((u) => (
                <i
                  key={u.date}
                  title={`${fmtD(u.date)}: ${u.pct == null ? "no data" : u.pct + "% up"}`}
                  className={cx(
                    "min-w-0 flex-1 rounded-[3px]",
                    u.pct == null ? "bg-plane" : u.pct < 99 ? "bg-bad" : u.pct < 100 ? "bg-warn" : "bg-good",
                  )}
                />
              ))}
            </div>
            <Legend
              items={[
                { name: "Up all day", color: "#0f8a3c", square: true },
                { name: "Short outage", color: "#b07600", square: true },
                { name: "Down over 1% of the day", color: "#d03b3b", square: true },
              ]}
            />
          </Card>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Page Traffic" sub="Page Performance">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2">Page</th>
                  <th className="py-2 text-right">Views</th>
                  <th className="py-2 text-right">
                    Left right away
                    <Help t="Bounce rate: visitors who left without doing anything" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pages.length ? (
                  pages.map((p) => (
                    <tr key={p.page} className="border-t border-line">
                      <td className="py-2 font-bold">{p.page}</td>
                      <td className="py-2 text-right tabular-nums">{fmtN(p.views)}</td>
                      <td className={cx("py-2 text-right font-bold tabular-nums", p.bounce > 0.5 ? "text-bad" : p.bounce > 0.35 ? "text-warn" : "text-good")}>
                        {pct(p.bounce)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>
                      <Empty>No page data yet</Empty>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Behind the scenes" sub="System Health & Reliability — the services the site depends on">
          {D.health.length ? (
            D.health.map((h) => (
              <Stat
                key={h.comp}
                right={
                  <>
                    {h.uptime != null && <span className="text-[11.5px] tabular-nums">{(h.uptime * 100).toFixed(2)}% up</span>}
                    <SevPill s={h.sev} />
                  </>
                }
              >
                <b>{h.comp}</b>
                <Small>{h.debt || ""}</Small>
              </Stat>
            ))
          ) : (
            <Empty>No services listed</Empty>
          )}
        </Card>
        <Card title="Platform Costs" sub="what running acrylics.world costs each month · Product Spend">
          <div className="text-[26px] font-extrabold text-ink">
            {fmt$(D.spend.reduce((a, x) => a + (x.cost || 0), 0))}
            <span className="text-[12px] font-semibold text-muted"> /month</span>
          </div>
          {D.spend
            .filter((x) => x.real !== false)
            .map((x) => (
              <Stat key={x.tool} right={<b className="text-[12px]">{fmt$(x.cost)}</b>}>
                <span className="text-[12px]">{x.tool}</span>
              </Stat>
            ))}
        </Card>
      </div>

      <Card
        title="Site releases"
        sub="Releases & Deployment Log"
        extra={
          <button type="button" className="btn btn-sm" onClick={act.manage}>
            Manage updates
          </button>
        }
      >
        {D.releases.length ? (
          D.releases.slice(0, 6).map((r) => (
            <Item
              key={r.version}
              d={fmtD(r.date)}
              right={<StatusPill2 s={r.status === "Rolled Out" ? "Completed" : r.status === "Rolled Back" ? "Cancelled" : "Planning"} label={r.status} />}
            >
              <b>{r.version}</b>
              <Small>
                {r.env}
                {r.notes ? " · " + r.notes : ""}
              </Small>
            </Item>
          ))
        ) : (
          <Empty>No releases logged</Empty>
        )}
      </Card>

      <Card
        title="Updates"
        sub={`What PRANT's sweeps of acrylics.world and the connected dashboards found · IT & Systems Registry · last sweep ${sw.lastRun ? ago(sw.lastRun) : "never"}. Click a card to read it, add notes and assign the fix.`}
        extra={
          <button type="button" className="btn btn-sm btn-brand" onClick={() => void act.sweep()}>
            Run PRANT sweep now
          </button>
        }
      >
        <H5>Needs an assignee · {open.length}</H5>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{open.length ? open.map(fcard) : <Empty className="sm:col-span-2 xl:col-span-3">✓ Nothing waiting</Empty>}</div>
        {assigned.length > 0 && (
          <>
            <H5>Being fixed · {assigned.length}</H5>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{assigned.map(fcard)}</div>
          </>
        )}
        {dism.length > 0 && (
          <Small className="mt-4">
            Dismissed:{" "}
            {dism.map((f, i) => (
              <span key={f.id}>
                {i > 0 && " · "}
                <button type="button" className="underline" onClick={() => act.finding(f.id)}>
                  {f.asset}
                </button>
              </span>
            ))}
          </Small>
        )}
      </Card>
      <HiddenNote list={[["Site Health Checks", "Site speed, status and 30-day uptime"]]} />
    </div>
  );
}
