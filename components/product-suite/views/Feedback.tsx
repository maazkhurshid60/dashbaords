"use client";

/* CUSTOMERS › FEEDBACK (vFeedback + summarize output) */
import { cx } from "@/lib/utils";
import { fmtD, SEV_ORDER, sevColor } from "../format";
import { FB_WEEKS, fbIn, feat, liveOpts, matchQ, themeWeekly } from "../logic";
import { Card, Empty, Pill, Seg, SentPill, Small, Stat } from "../primitives";
import { HBars, LineChart } from "../SuiteCharts";
import { HiddenNote } from "../Shell";
import { useSuite } from "../useSuite";

const SEV_LABEL: Record<string, string> = { Critical: "✕ Critical", High: "! High", Medium: "• Medium", Low: "○ Low" };

function SummaryOut() {
  const { S } = useSuite();
  const o = S.sumOut;
  if (!o) return <Small>Press Summarize.</Small>;
  if (o.state === "loading") return <Small>Summarizing {o.n} notes…</Small>;
  if (o.state === "ai") return <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">{o.text}</div>;
  return (
    <div>
      <Pill tone="warn" className="mb-2">
        ANT Connector not reachable — counted summary, not AI
      </Pill>
      {o.top.map((t) => (
        <Stat key={t.name} right={<b>{t.n}</b>}>
          <b>{t.name}</b>
          <Small>
            mostly {t.persona} ({t.pn})
          </Small>
        </Stat>
      ))}
    </div>
  );
}

export function FeedbackView() {
  const { D, S, q, has, act } = useSuite();
  const I = S.insight;
  const all = fbIn(D, S.segment);
  const list = all.filter(
    (f) =>
      (!has("User Feedback & Insights.Triage Status") || I.status === "All" || f.status === I.status) &&
      (I.sev == null || f.sentiment === I.sev) &&
      matchQ(q, f.summary, f.account, feat(D, f.feature)?.name),
  );
  const wk = FB_WEEKS;
  const series = SEV_ORDER.map((s) => ({
    name: s,
    color: sevColor(s),
    values: wk.map((w, i) => all.filter((f) => f.sentiment === s && f.date >= w && f.date < (wk[i + 1] || "2099")).length),
  }));
  const tw = has("Feedback Themes") ? themeWeekly(D, S.segment) : null;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="How serious is it?" sub="Sentiment / Severity">
          <HBars rows={SEV_ORDER.map((s) => ({ n: SEV_LABEL[s], v: all.filter((f) => f.sentiment === s).length, c: sevColor(s) }))} />
        </Card>
        <Card title="Where it came from" sub="Source / Channel">
          <HBars rows={["In-App", "Survey", "Support Ticket", "User Interview", "Sales Call"].map((s) => ({ n: s, v: all.filter((f) => f.source === s).length }))} />
        </Card>
        <Card
          title="Summary"
          sub="PRANT reads the notes below and sums them up"
          extra={
            <button type="button" className="btn btn-sm" onClick={() => void act.summarize()}>
              Summarize
            </button>
          }
        >
          <SummaryOut />
        </Card>
      </div>
      <Card
        title="Customer Sentiment"
        sub="feedback per week by how serious it is · User Feedback & Insights"
        extra={
          <button type="button" className="btn btn-sm btn-brand" onClick={act.addfb}>
            + Add feedback
          </button>
        }
      >
        <LineChart labels={wk.map(fmtD)} series={series} h={240} aria="Customer sentiment per week" />
        {tw && (
          <div className="scroll-thin mt-4 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase text-muted">
                  <th className="py-2">Topic</th>
                  <th className="py-2 text-right">Mentions</th>
                  <th className="py-2 text-right">Last 4 weeks</th>
                </tr>
              </thead>
              <tbody>
                {tw.rows.map((r) => (
                  <tr key={r.t.id} className="border-t border-line">
                    <td className="py-2 font-bold">{r.t.name}</td>
                    <td className="py-2 text-right tabular-nums">{r.total}</td>
                    <td className={cx("py-2 text-right font-bold tabular-nums", r.trend > 0 ? "text-bad" : r.trend < 0 ? "text-good" : "text-muted")}>
                      {r.trend > 0 ? "▲" : r.trend < 0 ? "▼" : ""} {Math.abs(Math.round(r.trend * 100))}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card
        title="Feedback"
        sub={`${list.length} notes · click one to link it to a feature`}
        extra={
          <>
            {has("User Feedback & Insights.Triage Status") && (
              <Seg
                label="Triage status"
                value={I.status}
                onChange={act.ist}
                options={[
                  { id: "All", label: "All" },
                  { id: "Unprocessed", label: "To review" },
                  { id: "Processed", label: "Reviewed" },
                ]}
              />
            )}
            <Seg
              label="Severity"
              value={I.sev ?? ""}
              onChange={act.isev}
              options={[{ id: "", label: "All" }, ...liveOpts(D, "feedback.sentiment", SEV_ORDER).map((s) => ({ id: s, label: s }))]}
            />
          </>
        }
      >
        <div className="scroll-thin max-h-[600px] space-y-2 overflow-y-auto">
          {list.length ? (
            list.slice(0, 60).map((f) => {
              const ft = feat(D, f.feature);
              return (
                <button key={f.id} type="button" onClick={() => act.note(f.id)} className="block w-full rounded-2xl bg-plane/60 px-4 py-3 text-left hover:bg-plane">
                  <Small>
                    <b className="text-ink">{f.account}</b> · {f.source} · {fmtD(f.date)}
                  </Small>
                  <div className="mt-1 text-[13px] text-ink">{f.summary}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <SentPill s={f.sentiment} />
                    {ft ? <Pill tone="info">{ft.name}</Pill> : <Pill tone="warn">Not linked to a feature</Pill>}
                  </div>
                </button>
              );
            })
          ) : (
            <Empty>No feedback here</Empty>
          )}
        </div>
      </Card>
      <HiddenNote
        list={[
          ["Feedback Themes", "Topics table"],
          ["User Feedback & Insights.Triage Status", "To review / Reviewed filter"],
          ["User Feedback & Insights.Related Persona", "Filter by segment"],
        ]}
      />
    </div>
  );
}
