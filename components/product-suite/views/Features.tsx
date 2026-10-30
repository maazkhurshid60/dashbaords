"use client";

/* PERFORMANCE › FEATURES (vFeatures + lifecycleBar) */
import { HEAT } from "@/components/charts";
import type { Feature } from "@/lib/product-types";
import { cx } from "@/lib/utils";
import { fmt$, STAGE, STAGE_HELP, STAGE_TONE } from "../format";
import { accIn, featPerf, matchQ } from "../logic";
import { Help, MoodPill, PDot, Small, StagePill, TONE_TEXT } from "../primitives";
import { Legend, Spark } from "../SuiteCharts";
import { HiddenNote } from "../Shell";
import { useSuite } from "../useSuite";

/* Customer product lifecycle — ordinal stages on the violet ramp, "Left" in neutral gray */
export const LIFE: [string, string, string][] = [
  ["Onboarding", "Setting up", HEAT[1].bg],
  ["Active", "Using it", HEAT[2].bg],
  ["Power User", "Power user", HEAT[3].bg],
  ["Churned", "Left", "#c9cdd6"],
];

function LifecycleBar({ f }: { f: Feature }) {
  const { D, S } = useSuite();
  const users = accIn(D, S.segment).filter((a) => a.used.includes(f.id));
  if (!users.length) return <Small>No customers yet</Small>;
  const c = LIFE.map(([k, l, col]) => ({ k, l, col, n: users.filter((a) => a.stage === k).length }));
  const top = c.slice().sort((a, b) => b.n - a.n)[0];
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-plane" title={c.map((x) => `${x.l}: ${x.n}`).join(" · ")}>
        {c.map((x) => (x.n ? <i key={x.k} style={{ flex: x.n, background: x.col }} /> : null))}
      </div>
      <Small className="mt-1">Most are: {top.l.toLowerCase()}</Small>
    </div>
  );
}

export function FeaturesView() {
  const { D, S, q, has, act } = useSuite();
  const stages = ["Live", "Testing", "Being built", "Researching", "Planned"];
  const cnt = (s: string) => D.features.filter((f) => STAGE[f.status] === s).length;
  const order = ["Live", "QA", "In Development", "In Discovery", "Backlog", "Deprecated"];
  const list = D.features
    .filter((f) => (S.stageFilter === "All" || STAGE[f.status] === S.stageFilter) && matchQ(q, f.name, f.core))
    .map((f) => ({ f, p: featPerf(D, S.segment, f) }))
    .sort((a, b) => order.indexOf(a.f.status) - order.indexOf(b.f.status) || b.p.notes - a.p.notes);
  const cUse = has("Accounts (Reference).Features Used"),
    cTrend = has("Feature Adoption Snapshots"),
    cRev = has("Accounts (Reference).Features Used", "Accounts (Reference).MRR"),
    cLife = has("Accounts (Reference).Features Used", "Accounts (Reference).Adoption Stage"),
    cArea = has("Product Features.Product Area");
  const th = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted whitespace-nowrap";
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[["All", D.features.length, "All features", ""] as const, ...stages.map((s) => [s, cnt(s), s, STAGE_HELP[s]] as const)].map(([id, n, label, help]) => (
          <button
            key={id}
            type="button"
            aria-pressed={S.stageFilter === id}
            onClick={() => act.stage(id)}
            className={cx("card flex flex-col items-start p-4 text-left transition hover:-translate-y-0.5", S.stageFilter === id && "ring-2 ring-brand")}
          >
            <b className={cx("text-[24px] font-extrabold leading-none", id === "All" ? "text-ink" : TONE_TEXT[STAGE_TONE[id] || ""])}>{n}</b>
            <span className="mt-1.5 text-[12.5px] font-bold">{label}</span>
            {help && <small className="mt-0.5 text-[11px] leading-snug text-muted">{help}</small>}
          </button>
        ))}
      </div>
      <section className="card min-w-0 p-5">
        {cLife && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Small>Click a feature for details.</Small>
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[11.5px] text-ink">Customer product lifecycle:</b>
              <Legend className="mt-0" items={LIFE.map(([, l, c]) => ({ name: l, color: c, square: true }))} />
            </div>
          </div>
        )}
        <div className="scroll-thin -mx-2 overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead>
              <tr>
                <th className={th}>Feature</th>
                <th className={th}>Stage</th>
                <th className={th}>Built for</th>
                {cUse && <th className={cx(th, "text-right")}>Customers using</th>}
                {cTrend && <th className={th}>Usage, last 12 weeks</th>}
                <th className={th}>
                  How customers feel
                  <Help t="Only for Live features, from the feedback linked to them" />
                </th>
                <th className={cx(th, "text-right")}>Feedback</th>
                {cRev && <th className={cx(th, "text-right")}>Revenue from users</th>}
                {cLife && (
                  <th className={cx(th, "min-w-[150px]")}>
                    Customer product lifecycle
                    <Help t="Where this feature's customers are: setting up, using it, power user, or left" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map(({ f, p }) => (
                  <tr
                    key={f.id}
                    tabIndex={0}
                    onClick={() => act.feature(f.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), act.feature(f.id))}
                    className="cursor-pointer border-t border-line align-top hover:bg-plane/70 focus-visible:bg-plane"
                  >
                    <td className="px-3 py-3">
                      <b>{f.name}</b>
                      {cArea && <Small>{f.area}</Small>}
                    </td>
                    <td className="px-3 py-3">
                      <StagePill s={f.status} />
                    </td>
                    <td className="px-3 py-3 text-[12px]">
                      {f.personas.length ? (
                        f.personas.map((x) => (
                          <div key={x} className="flex items-center gap-1.5 whitespace-nowrap">
                            <PDot name={x} /> {x}
                          </div>
                        ))
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    {cUse && <td className="px-3 py-3 text-right tabular-nums">{p.users || "—"}</td>}
                    {cTrend && <td className="px-3 py-3">{p.trend ? <Spark vals={p.trend} /> : <Small>no data yet</Small>}</td>}
                    <td className="px-3 py-3">{f.status === "Live" ? <MoodPill m={p.mood} /> : <Small>Not live yet</Small>}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{p.notes || "—"}</td>
                    {cRev && <td className="px-3 py-3 text-right tabular-nums">{p.rev ? fmt$(p.rev) : "—"}</td>}
                    {cLife && (
                      <td className="px-3 py-3">
                        <LifecycleBar f={f} />
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted">
                    No features match
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <HiddenNote
        list={[
          ["Accounts (Reference).Features Used", "Customers using"],
          ["Feature Adoption Snapshots", "Usage trend"],
          [["Accounts (Reference).Features Used", "Accounts (Reference).MRR"], "Revenue from users"],
          [["Accounts (Reference).Features Used", "Accounts (Reference).Adoption Stage"], "Customer product lifecycle"],
          ["Product Features.Product Area", "Product area"],
        ]}
      />
    </div>
  );
}
