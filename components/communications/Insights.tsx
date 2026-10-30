"use client";

/* INSIGHTS (vInsights) */
import { DAY, TODAY, iso } from "@/lib/product-data";
import { fmtD } from "@/components/product-suite/format";
import { Card, Empty, Item, Kpi, KpiRow, Small } from "@/components/product-suite/primitives";
import { BarChart, HBars } from "@/components/product-suite/SuiteCharts";
import { useSuite } from "@/components/product-suite/useSuite";
import { INTENT_COLOR, SRC, ageTone, ageTxt, autoClosed, bucket, hoursAgo, inRange, visibleTickets, who } from "./comms";
import { RangeBar, SrcIcon, useRange } from "./Inbox";
import { useCommsActions } from "./useCommsActions";

export function InsightsView() {
  const { D, has } = useSuite();
  const c = useCommsActions();
  const { b, label } = useRange();
  const all = visibleTickets(D, has).filter((t) => inRange(t, b));
  const [ra, rb] = b;
  const days: string[] = [];
  const end = rb ? new Date(rb + "T12:00:00") : TODAY;
  const start = ra ? new Date(ra + "T12:00:00") : new Date(end.getTime() - 13 * DAY);
  for (let d = new Date(start); d <= end && days.length < 62; d = new Date(d.getTime() + DAY)) days.push(iso(d));
  if (!days.length) days.push(iso(end));
  const needP = all.length ? all.filter((t) => t.needs || bucket(t) === "needs" || bucket(t) === "answered").length / all.length : 0;
  const autoP = all.length ? all.filter(autoClosed).length / all.length : 0;
  const rts = all.filter((t) => t.rt != null).map((t) => t.rt as number);
  const avgRt = rts.length ? rts.reduce((a, x) => a + x, 0) / rts.length : null;
  const chs = [...new Set(all.map((t) => t.channel))];
  const intents: Record<string, number> = {};
  all.forEach((t) => {
    const k = t.intent === "Spam/Irrelevant" ? "Noise" : t.intent || "Not sorted";
    intents[k] = (intents[k] || 0) + 1;
  });
  const senders: Record<string, number> = {};
  all.forEach((t) => {
    const k = who(t.from);
    senders[k] = (senders[k] || 0) + 1;
  });
  const waiting = all.filter((t) => bucket(t) === "needs").sort((a, x) => a.date.localeCompare(x.date));
  return (
    <div className="space-y-6">
      <RangeBar />
      <KpiRow>
        <Kpi num={all.length} lbl="Messages" explain={"all sources · " + label} tone="info" />
        <Kpi num={Math.round(needP * 100) + "%"} lbl="Needed a person" explain="the rest was noise or info" tone="warn" />
        <Kpi num={Math.round(autoP * 100) + "%"} lbl="Handled automatically" explain="closed by the sweep" tone="purple" />
        <Kpi
          num={avgRt != null ? (avgRt < 1 ? Math.round(avgRt * 60) + " min" : avgRt.toFixed(1) + "h") : "—"}
          lbl="Average time to answer"
          explain="Avg Response Time"
          tone={avgRt != null && avgRt <= 24 ? "good" : "warn"}
        />
      </KpiRow>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Messages per day" sub={`by source · ${label} — hover a bar`}>
          <BarChart
            labels={days.map(fmtD)}
            series={chs.map((ch) => ({
              name: SRC[ch]?.n || ch,
              color: SRC[ch]?.c || "#9a9fad",
              values: days.map((d) => all.filter((t) => t.channel === ch && t.date.slice(0, 10) === d).length),
            }))}
            h={230}
            aria="Messages per day by source"
          />
        </Card>
        <Card title="What people write about" sub="Intent">
          <HBars rows={Object.entries(intents).map(([n, v]) => ({ n, v, c: INTENT_COLOR[n] || "#9a9fad" })).sort((a, x) => x.v - a.v)} />
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Waiting longest" sub="Needs a reply — oldest first">
          {waiting.length ? (
            waiting.slice(0, 6).map((t) => {
              const h = hoursAgo(t.date);
              return (
                <Item key={t.id} d={ageTxt(h)} dTone={ageTone(h)} onClick={() => c.openTicket(t.id)} right={<SrcIcon ch={t.channel} size={22} />}>
                  <b>{t.subject}</b>
                  <Small>{who(t.from)}</Small>
                </Item>
              );
            })
          ) : (
            <Empty>✓ Nothing waiting</Empty>
          )}
        </Card>
        <Card title="Who writes the most" sub="senders, all time in this view">
          <HBars rows={Object.entries(senders).map(([n, v]) => ({ n, v, c: "#5b2be0" })).sort((a, x) => x.v - a.v).slice(0, 7)} />
        </Card>
      </div>
    </div>
  );
}
