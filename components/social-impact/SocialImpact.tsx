"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/AppShell";
import { DataSourceBadge, type Source } from "@/components/DataSource";
import { cx } from "@/lib/utils";
import { SI_VIEWS, type ScraperRow, type SiView, type SocialData } from "@/lib/social-types";
import { Drawer, Empty, Field, GggStrip, Kpi, Pill, SiFooter, date, money, pct, range } from "./si-ui";
import { Pipeline } from "./Pipeline";
import { Builder } from "./Builder";

/* Social Impact Grant Scraper — views: Overview, Nail Networks, Grant Scrapers, Opportunity Pipeline,
   Application Builder. Sibling of the ANT Connector; same AppShell sidebar (from the root layout). */

const PRE_AWARD_CLOSED = ["Awarded", "Declined", "Withdrawn", "Active Award", "Closed Out"];

type KpiKey = "open" | "fit" | "apps" | "requested" | "weighted" | "awarded" | "deadlines";

export function SocialImpact({ data, source, initialView }: { data: SocialData; source: Source; initialView: SiView }) {
  const [view, setView] = useState<SiView>(initialView);
  const [query, setQuery] = useState("");
  const [builderApp, setBuilderApp] = useState<string | null>(null);

  const go = (v: SiView) => {
    setView(v);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("view", v);
      window.history.replaceState(null, "", u);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#FFFDFD]">
      <TopBar
        title={
          <span className="flex items-center gap-2">
            Social Impact <DataSourceBadge source={source} />
          </span>
        }
        search="Search grants, funders, applications"
        query={query}
        onQuery={setQuery}
      />
      <nav aria-label="Social Impact views" className="flex gap-1 overflow-x-auto px-5 pb-3 pt-2 sm:px-8">
        {SI_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => go(v)}
            aria-current={view === v ? "page" : undefined}
            className={cx("btn h-9 shrink-0", view === v ? "btn-dark bg-ink text-white" : "bg-transparent text-ink-2 hover:bg-plane")}
          >
            {v}
          </button>
        ))}
      </nav>
      <main className="px-5 pb-10 sm:px-8">
        {!source.live && (
          <div className="mb-4 rounded-2xl bg-warn-soft px-4 py-3 text-[12.5px] text-warn">Couldn&apos;t reach Airtable — nothing to show until it&apos;s back. {source.error}</div>
        )}
        {view === "Overview" && <Overview data={data} go={go} />}
        {view === "Nail Networks" && <NailNetworksView data={data} />}
        {view === "Grant Scrapers" && <Scrapers data={data} query={query} />}
        {view === "Opportunity Pipeline" && (
          <Pipeline
            data={data}
            query={query}
            onBuild={(id) => {
              setBuilderApp(id);
              go("Application Builder");
            }}
          />
        )}
        {view === "Application Builder" && <Builder data={data} appId={builderApp} onApp={setBuilderApp} />}
        <SiFooter />
      </main>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- Overview */
function Overview({ data, go }: { data: SocialData; go: (v: SiView) => void }) {
  const [kpi, setKpi] = useState<KpiKey | null>(null);
  const [now] = useState(() => Date.now());
  const open = data.scraper.filter((s) => s.triage === "New" || s.triage === "Qualified");
  const fits = data.scraper.filter((s) => s.fit != null);
  const avgFit = fits.length ? Math.round(fits.reduce((a, s) => a + (s.fit ?? 0), 0) / fits.length) : null;
  const active = data.applications.filter((a) => !PRE_AWARD_CLOSED.includes(a.stage));
  const awarded = data.applications.filter((a) => (a.awarded ?? 0) > 0);
  const t = new Date(now).toISOString().slice(0, 10);
  const in30 = new Date(now + 30 * 864e5).toISOString().slice(0, 10);
  const deadlines = [
    ...data.applications.filter((a) => a.deadline && a.deadline >= t && a.deadline <= in30 && !PRE_AWARD_CLOSED.includes(a.stage)).map((a) => ({ id: a.id, name: a.name, d: a.deadline, kind: "Application" })),
    ...open.filter((s) => s.deadline && s.deadline >= t && s.deadline <= in30).map((s) => ({ id: s.id, name: s.title, d: s.deadline, kind: "Scraped grant" })),
  ].sort((a, b) => a.d.localeCompare(b.d));
  const sum = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);

  const kpis: { key: KpiKey; label: string; value: string }[] = [
    { key: "open", label: "Open Opportunities", value: String(open.length) },
    { key: "fit", label: "Avg. Fit Score", value: avgFit == null ? "—" : String(avgFit) },
    { key: "apps", label: "Applications in Progress", value: String(active.length) },
    { key: "requested", label: "Amount Requested", value: money(sum(active.map((a) => a.requested))) },
    { key: "weighted", label: "Weighted Pipeline", value: money(sum(active.map((a) => a.weighted))) },
    { key: "awarded", label: "Awarded", value: money(sum(awarded.map((a) => a.awarded))) },
    { key: "deadlines", label: "Deadlines (30 days)", value: String(deadlines.length) },
  ];

  const drill: Record<KpiKey, { title: string; rows: { id: string; name: string; meta: string }[] }> = {
    open: { title: "Open Opportunities", rows: open.map((s) => ({ id: s.id, name: s.title, meta: `${s.triage} · fit ${s.fit ?? "—"} · ${date(s.deadline)}` })) },
    fit: { title: "Fit Scores", rows: [...fits].sort((a, b) => (b.fit ?? 0) - (a.fit ?? 0)).map((s) => ({ id: s.id, name: s.title, meta: `Fit ${s.fit} · ${s.triage}` })) },
    apps: { title: "Applications in Progress", rows: active.map((a) => ({ id: a.id, name: a.name, meta: `${a.stage} · ${pct(a.completion)} complete` })) },
    requested: { title: "Amount Requested", rows: active.map((a) => ({ id: a.id, name: a.name, meta: money(a.requested) })) },
    weighted: { title: "Weighted Pipeline", rows: active.map((a) => ({ id: a.id, name: a.name, meta: `${money(a.weighted)} (${pct(a.probability)} of ${money(a.requested)})` })) },
    awarded: { title: "Awarded", rows: awarded.map((a) => ({ id: a.id, name: a.name, meta: money(a.awarded) })) },
    deadlines: { title: "Deadlines in the next 30 days", rows: deadlines.map((d) => ({ id: d.id, name: d.name, meta: `${d.kind} · ${date(d.d)}` })) },
  };
  const d = kpi ? drill[kpi] : null;
  const quick: SiView[] = ["Nail Networks", "Grant Scrapers", "Opportunity Pipeline", "Application Builder"];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => (
          <Kpi key={k.key} label={k.label} value={k.value} onClick={() => setKpi(k.key)} />
        ))}
      </div>
      <Section title="Greater Good Goals">
        <GggStrip sdg={data.sdg} />
      </Section>
      <Section title="Quick links">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quick.map((v) => (
            <button key={v} type="button" onClick={() => go(v)} className="card px-5 py-6 text-left text-[15px] font-semibold transition hover:ring-2 hover:ring-brand/30">
              {v}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Programmes & giving">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Programmes", data.programmes.length],
            ["Sessions & cohorts", data.counts.sessions],
            ["Sponsors & donors", data.counts.donors],
            ["Gifts", data.counts.gifts],
            ["Impact outcomes", data.counts.outcomes],
            ["Open reports", `${data.counts.reportsOpen} / ${data.counts.reports}`],
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-2xl bg-plane px-4 py-3">
              <div className="text-[18px] font-bold">{v}</div>
              <div className="text-[11.5px] text-ink-2">{l}</div>
            </div>
          ))}
        </div>
      </Section>
      <Drawer open={!!d} onClose={() => setKpi(null)} eyebrow="Overview" title={d?.title ?? ""}>
        {d && (d.rows.length ? (
          <ul className="divide-y divide-line">
            {d.rows.map((r) => (
              <li key={r.id} className="py-3">
                <div className="font-semibold">{r.name}</div>
                <div className="text-[12px] text-muted">{r.meta}</div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No records.</Empty>
        ))}
      </Drawer>
    </>
  );
}

/* ---------------------------------------------------------------- Nail Networks */
function NailNetworksView({ data }: { data: SocialData }) {
  const nn = data.nail;
  const progs = data.programmes;
  if (!nn) return <Empty>No Nail Networks P.I.C.S found in Airtable.</Empty>;
  return (
    <>
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[20px] font-semibold">{nn.name}</h2>
          {nn.tag && <Pill tone="brand">{nn.tag}</Pill>}
          {nn.stage && <Pill>{nn.stage}</Pill>}
        </div>
        <div className="mt-1 text-[12.5px] text-muted">
          {nn.type} · {date(nn.start)} – {date(nn.end)} · {nn.checklistCount} checklist items · {nn.taskCount} tasks ·{" "}
          <a href={`/pics?open=${nn.id}`} className="font-semibold text-brand hover:underline">
            Open in P.I.C.S
          </a>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{nn.overview}</p>
      </div>
      <Section title="Partnership opportunities">
        {nn.opportunities.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {nn.opportunities.map((o) => (
              <div key={o.id} className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{o.name}</div>
                  {o.stage && <Pill>{o.stage}</Pill>}
                </div>
                <div className="mt-2 text-[12px] text-muted">
                  {money(o.value)} · {o.daysInStage ?? "—"} days in stage
                </div>
                {o.nextStep && <p className="mt-3 text-[12.5px] text-ink-2">{o.nextStep}</p>}
              </div>
            ))}
          </div>
        ) : (
          <Empty>No Partnerships opportunities are linked to {nn.name} yet.</Empty>
        )}
      </Section>
      <Section title="Programming">
        {progs.length ? (
          <ul className="divide-y divide-line rounded-2xl bg-white shadow-card">
            {progs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="font-semibold">{p.name}</span>
                <span className="text-[12px] text-muted">
                  {p.type} · {p.status} · {p.enrolled ?? 0}/{p.capacity ?? "—"} enrolled
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No named programmes in Programming Master yet.</Empty>
        )}
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------- Grant Scrapers */
const TRIAGE_TONE: Record<string, "good" | "warn" | "bad" | "brand" | "plain"> = { New: "brand", Qualified: "good", "Saved for Later": "warn", "Not a Fit": "bad", Duplicate: "plain", Expired: "plain" };

type ScraperReadiness = { configured: boolean; missing?: string[]; message?: string };
type ScraperImport = { received: number; imported: number; duplicates: number; skipped: number; failed: number; errors: string[] };
type ScraperRun = { ok: boolean; runId: string; status: string; message: string; import?: ScraperImport };

async function scraperRequest(url: string, init?: RequestInit): Promise<ScraperReadiness | ScraperRun> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const body = (await res.json().catch(() => null)) as (ScraperReadiness & Partial<ScraperRun> & { error?: string }) | null;
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  if (!body) throw new Error("The grant scraper returned an invalid response");
  return body as ScraperReadiness | ScraperRun;
}

const terminalRun = (status: string) => !["READY", "RUNNING"].includes(status);

function Scrapers({ data, query }: { data: SocialData; query: string }) {
  const router = useRouter();
  const [triage, setTriage] = useState("All");
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<ScraperRow | null>(null);
  const [apify, setApify] = useState<ScraperReadiness | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    scraperRequest("/api/social/scraper/run")
      .then((j) => active && setApify(j as ScraperReadiness))
      .catch(() => active && setApify({ configured: false, message: "Could not check the grant scraper connection." }));
    return () => {
      active = false;
    };
  }, []);

  const settleRun = useCallback((run: ScraperRun) => {
    setRunMessage(run.message);
    if (run.status === "SUCCEEDED") {
      setRunning(false);
      setRunId(null);
      router.refresh();
      return;
    }
    if (terminalRun(run.status)) {
      setRunning(false);
      setRunId(null);
      setRunError(run.message);
    }
  }, [router]);

  useEffect(() => {
    if (!runId || !running) return;
    let active = true;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const next = (await scraperRequest(`/api/social/scraper/run?run=${encodeURIComponent(runId)}`)) as ScraperRun;
        if (!active) return;
        settleRun(next);
        if (attempts >= 40 && !terminalRun(next.status)) {
          setRunning(false);
          setRunMessage("The grant scrape is still running in Apify. Check back shortly and run it again only if needed.");
        }
      } catch (e) {
        if (!active) return;
        setRunning(false);
        setRunError(e instanceof Error ? e.message : "Could not check the grant scraper status.");
      }
    };
    const timer = window.setInterval(() => void poll(), 3_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [runId, running, settleRun]);

  const runScraper = async () => {
    if (!apify?.configured || running) return;
    setRunning(true);
    setRunError(null);
    setRunMessage("Starting grant scrape...");
    try {
      const run = (await scraperRequest("/api/social/scraper/run", { method: "POST" })) as ScraperRun;
      setRunId(run.runId);
      settleRun(run);
    } catch (e) {
      setRunning(false);
      setRunError(e instanceof Error ? e.message : "Could not start the grant scraper.");
    }
  };

  const checkScraper = async () => {
    if (!runId || running) return;
    setRunning(true);
    setRunError(null);
    setRunMessage("Checking grant scraper status...");
    try {
      settleRun((await scraperRequest(`/api/social/scraper/run?run=${encodeURIComponent(runId)}`)) as ScraperRun);
    } catch (e) {
      setRunning(false);
      setRunError(e instanceof Error ? e.message : "Could not check the grant scraper status.");
    }
  };
  const statuses = useMemo(() => ["All", ...Array.from(new Set(data.scraper.map((s) => s.triage).filter(Boolean)))], [data.scraper]);
  const q = query.trim().toLowerCase();
  const rows = data.scraper
    .filter((s) => triage === "All" || s.triage === triage)
    .filter((s) => !q || [s.title, s.funder, s.funderRaw, s.source, s.focus.join(" ")].join(" ").toLowerCase().includes(q))
    .sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button key={s} type="button" onClick={() => setTriage(s)} className={cx("btn h-8 px-3 text-[12px]", triage === s && "bg-ink text-white")}>
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!apify?.configured || running}
          title={apify?.configured ? runId ? "Check the existing grant scraper run" : "Run the grant scrapers" : apify?.message || "Checking grant scraper connection..."}
          onClick={() => void (runId ? checkScraper() : runScraper())}
          className="btn h-9 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? "Running scraper..." : runId ? "Check status" : apify?.configured ? "Run scraper" : "Run scraper · not connected yet"}
        </button>
      </div>
      {(runMessage || runError) && (
        <div role="status" className={cx("mb-4 rounded-xl px-3 py-2 text-[12.5px]", runError ? "bg-red-50 text-red-700" : "bg-plane text-ink-2")}>
          {runError || runMessage}
        </div>
      )}
      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table className="w-full min-w-[760px] text-left text-[12.5px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Opportunity</th>
                <th className="px-4 py-3">Funder</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Award</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Fit</th>
                <th className="px-4 py-3">Triage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr key={s.id} className="cursor-pointer hover:bg-plane/70" onClick={() => setOpen(s)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
                  <td className="relative px-4 py-3 font-semibold">
                    <button type="button" className="text-left hover:text-brand" onFocus={() => setHover(s.id)} onBlur={() => setHover(null)} onClick={() => setOpen(s)}>
                      {s.title}
                    </button>
                    {hover === s.id && (
                      <div role="tooltip" className="absolute left-4 top-full z-20 mt-1 w-80 rounded-xl bg-ink p-3 text-[11.5px] font-normal text-white shadow-pop">
                        <div className="font-bold">{s.title}</div>
                        <p className="mt-1 line-clamp-4 text-white/80">{s.eligibility || "No eligibility summary."}</p>
                        {s.rationale && <p className="mt-1.5 line-clamp-3 text-white/70">Fit: {s.rationale}</p>}
                        {s.focus.length > 0 && <p className="mt-1.5 text-white/60">{s.focus.join(" · ")}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.funder || s.funderRaw || "—"}</td>
                  <td className="px-4 py-3">{s.source || "—"}</td>
                  <td className="px-4 py-3">{range(s.min, s.max)}</td>
                  <td className="px-4 py-3">{s.deadline ? date(s.deadline) : s.deadlineType || "—"}</td>
                  <td className="px-4 py-3 font-bold">{s.fit ?? "—"}</td>
                  <td className="px-4 py-3">{s.triage ? <Pill tone={TRIAGE_TONE[s.triage] ?? "plain"}>{s.triage}</Pill> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{data.scraper.length ? "No scraped grants match." : "The Grants Scraper Database is empty."}</Empty>
      )}
      <Section title="Funders & Grantmakers">
        {data.funders.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.funders.map((f) => (
              <div key={f.id} className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{f.name}</div>
                  {f.relationship && <Pill>{f.relationship}</Pill>}
                </div>
                <div className="mt-1 text-[12px] text-muted">
                  {f.type || "—"} · {range(f.low, f.high)} · {f.apps} application{f.apps === 1 ? "" : "s"}
                </div>
                {f.website && (
                  <a href={f.website} target="_blank" rel="noopener" className="mt-2 inline-block text-[12px] font-semibold text-brand hover:underline">
                    Website
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty>No funders yet.</Empty>
        )}
      </Section>
      <Drawer open={!!open} onClose={() => setOpen(null)} eyebrow="Scraped grant" title={open?.title ?? ""}>
        {open && (
          <>
            <Field label="Funder">{open.funder || open.funderRaw}</Field>
            <Field label="Source">
              {open.source}
              {open.sourceUrl && (
                <>
                  {" · "}
                  <a href={open.sourceUrl} target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">
                    Open source
                  </a>
                </>
              )}
            </Field>
            <Field label="Award">{range(open.min, open.max)}</Field>
            <Field label="Deadline">{`${date(open.deadline)}${open.deadlineType ? ` · ${open.deadlineType}` : ""}`}</Field>
            <Field label="Fit score">{open.fit == null ? "" : String(open.fit)}</Field>
            <Field label="Fit rationale">{open.rationale}</Field>
            <Field label="Eligibility">{open.eligibility}</Field>
            <Field label="Geography">{open.geo}</Field>
            <Field label="Focus areas">{open.focus.join(", ")}</Field>
            <Field label="Triage">{[open.triage, open.rejection].filter(Boolean).join(" · ")}</Field>
            <Field label="Requires match funding">{open.requiresMatch ? "Yes" : "No"}</Field>
            <Field label="Promoted to application">{open.promotedApp.map((id) => data.applications.find((a) => a.id === id)?.name ?? id).join(", ")}</Field>
            <Field label="Date scraped">{date(open.dateScraped)}</Field>
            <Field label="Notes">{open.notes}</Field>
          </>
        )}
      </Drawer>
    </>
  );
}
