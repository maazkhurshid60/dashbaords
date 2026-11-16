"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FeedItem, PageFooter, SidePanel, TopBar } from "@/components/AppShell";
import { DataSourceBadge, type Source } from "@/components/DataSource";
import { IconArrowRight, IconChevron } from "@/components/icons";
import { CardHead, Select, useToast } from "@/components/ui";
import { DepartmentWiki } from "@/components/home/DepartmentWiki";
import { GoalPreview } from "@/components/home/GoalPreview";
import type { Department, Goal, HomeData, Target, Tool } from "@/lib/home-data";
import { cx } from "@/lib/utils";

export type HomeView = "overview" | "departments" | "tools" | "resources";

const VIEWS: { id: HomeView; label: string; href: string }[] = [
  { id: "overview", label: "Home", href: "/" },
  { id: "departments", label: "Departments", href: "/departments" },
  { id: "tools", label: "Tools", href: "/tools" },
  { id: "resources", label: "Team Resources", href: "/resources" },
];

const UPDATE_INITIALS: Record<string, string> = { Product: "PR", "PR & Media": "ME", Executive: "EX" };

export function HomeCommand({ view, data, source }: { view: HomeView; data: HomeData; source: Source }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const has = (...v: string[]) => !q || v.some((x) => x.toLowerCase().includes(q));

  // Old deep links (VCG_Home_Command.html#departments) map onto routes.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const match = VIEWS.find((v) => v.id === hash && v.id !== "overview");
    if (view === "overview" && match) router.replace(match.href);
  }, [view, router]);

  const title = VIEWS.find((v) => v.id === view)!.label;

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="min-w-0 flex-1">
        <TopBar
          title={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {title}
              <DataSourceBadge source={source} />
            </span>
          }
          search="Search briefs, assets, people…"
          query={query}
          onQuery={setQuery}
        />
        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8">
          {view === "overview" && <Overview has={has} data={data} />}
          {view === "departments" && <Departments has={has} data={data} />}
          {view === "tools" && <Tools has={has} data={data} />}
          {view === "resources" && <Resources has={has} data={data} />}

          <PageFooter meta="VCG Intranet — Master Design System" />
        </div>
      </main>

      <SidePanel
        title="Home Command"
        feedTitle="Company updates"
        footnote=""
      >
        {data.updates.length ? (
          data.updates.map((u, i) => (
            <FeedItem
              key={`${i}-${u.text}`}
              initials={UPDATE_INITIALS[u.dept] ?? u.dept.slice(0, 2).toUpperCase()}
              name={u.pinned ? `${u.dept} · Pinned` : u.dept}
              text={
                <>
                  {u.text} <span className="text-muted">· {u.when}</span>
                </>
              }
            />
          ))
        ) : (
          <li className="py-4 text-[12.5px] text-muted">No published announcements right now.</li>
        )}
      </SidePanel>
    </div>
  );
}

type Has = (...v: string[]) => boolean;

/* Renders a card/link for an internal route, an external Airtable page, or a
   page the client hasn't handed over yet. */
function TargetLink({ target, className, children, label }: { target?: Target; className: string; children: ReactNode; label: string }) {
  const toast = useToast();
  if (!target) return <div className={cx(className, "cursor-default opacity-60 hover:translate-y-0 hover:shadow-none")} aria-disabled="true">{children}</div>;
  if ("soon" in target)
    return (
      <button type="button" className={cx(className, "text-left")} onClick={() => toast(`${target.soon} isn't part of this build yet`)} aria-label={`${label} (coming soon)`}>
        {children}
      </button>
    );
  if (target.external)
    return (
      <a href={target.href} target="_blank" rel="noopener" className={className} aria-label={`${label} (opens Airtable)`}>
        {children}
      </a>
    );
  if (target.href.startsWith("#"))
    return (
      <a href={target.href} className={className}>
        {children}
      </a>
    );
  return (
    <Link href={target.href} className={className}>
      {children}
    </Link>
  );
}

function TargetHint({ target }: { target?: Target }) {
  if (!target) return <span className="rounded-full bg-plane px-2 py-0.5 text-[10px] font-bold uppercase text-muted">Link needed</span>;
  if ("soon" in target) return <span className="rounded-full bg-plane px-2 py-0.5 text-[10px] font-bold uppercase text-muted">Soon</span>;
  return null;
}

function NoMatch({ text = "Nothing matches your search." }: { text?: string }) {
  return <div className="col-span-full rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">{text}</div>;
}

/* Tool mark: the Tool Library logo when there is one, else the brand glyph. */
function ToolMark({ tool, size }: { tool: Pick<Tool, "glyph" | "color" | "logo">; size: "sm" | "lg" }) {
  const box = size === "lg" ? "size-16 rounded-[20px] text-[24px] shadow-card" : "size-[18px] rounded-full text-[9px]";
  if (tool.logo)
    return (
      // Airtable attachment URLs are short-lived and aren't in next/image remotePatterns.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={tool.logo} alt="" loading="lazy" className={cx(box, "shrink-0 bg-white object-contain", size === "lg" && "p-2.5")} />
    );
  return (
    <span className={cx(box, "grid shrink-0 place-items-center font-bold text-white")} style={{ background: tool.color }}>
      {tool.glyph}
    </span>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ has, data }: { has: Has; data: HomeData }) {
  const navCards = data.navCards.filter((n) => has(n.title));
  const faqs = data.faqs.filter((f) => has(f.q, f.a));
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalsShown, setGoalsShown] = useState(3);
  const goals = data.goals.filter((g) => has(g.title, g.type, ...g.departments));
  const openGoal = (id?: string) => setGoal(data.goals.find((g) => g.id === id) ?? null);
  return (
    <>
      <GoalPreview goal={goal} onClose={() => setGoal(null)} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {data.kpis.map((k) => (
          <TargetLink key={k.label} target={k.target} label={k.label} className="card group flex flex-col p-5 transition hover:-translate-y-0.5">
            <span className="flex items-start justify-between gap-2">
              <span className="text-[38px] font-extrabold leading-none tracking-tight">{k.value}</span>
              {k.snapshot && (
                <span className="rounded-full bg-plane px-2 py-0.5 text-[10px] font-bold uppercase text-muted" title="No Airtable table holds this figure yet">
                  Snapshot
                </span>
              )}
            </span>
            <span className="mt-2 flex items-center justify-between gap-2 text-[12.5px] font-semibold text-ink-2">
              {k.label}
              <IconArrowRight width={15} height={15} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </span>
          </TargetLink>
        ))}
      </div>

      <section id="north-star" className="card scroll-mt-6 p-6">
        <CardHead eyebrow="Company direction" title="North Star Goals" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {data.northStar.length === 0 && <NoMatch text="No active North Star goals in Airtable." />}
          {data.northStar.map((g) => (
            <button
              key={g.title}
              type="button"
              disabled={!g.id}
              onClick={() => openGoal(g.id)}
              className="rounded-[20px] bg-plane p-5 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-card"
            >
              <div className="text-[14px] font-extrabold leading-snug">{g.title}</div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-linear-to-r from-brand to-violet" style={{ width: `${g.progress}%` }} />
              </div>
              <div className="mt-2 text-[12px] font-semibold text-ink-2">Progress {g.progress}%</div>
            </button>
          ))}
        </div>
      </section>

      {data.goals.length > 0 && (
        <section className="card p-6">
          <CardHead eyebrow="Goals" title="All active goals" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {goals.length === 0 && <NoMatch />}
            {goals.slice(0, goalsShown).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g)}
                className="flex flex-col gap-2 rounded-[20px] border border-line bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="flex flex-wrap gap-1.5">
                  {g.type && <span className="chip text-[10.5px]">{g.type}</span>}
                  {g.departments.map((d, i) => (
                    <span key={`${i}-${d}`} className="chip text-[10.5px] text-white" style={{ background: data.deptColors[d] ?? "#6b7280" }}>
                      {d}
                    </span>
                  ))}
                </span>
                <span className="text-[13.5px] font-extrabold leading-snug">{g.title}</span>
                <span className="mt-auto h-2 overflow-hidden rounded-full bg-plane">
                  <span className="block h-full rounded-full bg-linear-to-r from-brand to-violet" style={{ width: `${g.progress ?? 0}%` }} />
                </span>
                <span className="flex items-center justify-between text-[11.5px] font-semibold text-ink-2">
                  Progress {g.progress ?? 0}%
                  {g.issues.length > 0 && <span className="rounded-full bg-[#fff4e8] px-2 py-0.5 text-[10px] font-bold text-[#a24d06]">Data to correct</span>}
                </span>
              </button>
            ))}
          </div>
          {goals.length > 3 && (
            <button type="button" className="btn btn-sm mt-4" onClick={() => setGoalsShown((n) => (n >= goals.length ? 3 : n + 3))}>
              {goalsShown >= goals.length ? "Show fewer" : `Show more (${goals.length - goalsShown} more)`}
            </button>
          )}
        </section>
      )}

      <section className="card flex flex-wrap items-center justify-between gap-4 bg-ink p-6 text-white">
        <div>
          <div className="eyebrow text-white/60">Ask the system</div>
          <h3 className="mt-1 text-[20px] font-extrabold">ANTs</h3>
          <p className="mt-1 max-w-prose text-[12.5px] text-white/75">
            Search the ANT library, launch a Quick Assist prompt, or review the ANT Request Queue.
          </p>
        </div>
        <TargetLink target={{ soon: "ANT Connector" }} label="Open ANTs" className="btn h-11 bg-white px-6 text-ink hover:bg-lav">
          Open ANTs →
        </TargetLink>
      </section>

      <section className="card p-6">
        <CardHead eyebrow="Jump in" title="Intranet Navigation" />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {navCards.length ? (
            navCards.map((n) => (
              <TargetLink
                key={n.title}
                target={n.target}
                label={n.title}
                className={cx(
                  "flex items-center justify-between gap-3 rounded-[20px] border px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-card",
                  n.highlight ? "border-transparent bg-brand-soft" : "border-line bg-white",
                )}
              >
                <span className="text-[14px] font-extrabold">{n.title}</span>
                <TargetHint target={n.target} />
              </TargetLink>
            ))
          ) : (
            <NoMatch />
          )}
        </div>
      </section>

      <section className="card p-6">
        <CardHead eyebrow="Need a hand" title="Frequently Asked Questions" />
        <div className="mt-4 divide-y divide-line">
          {faqs.length ? faqs.map((f) => <Faq key={f.q} q={f.q} a={f.a} />) : <NoMatch />}
        </div>
      </section>
    </>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-[13.5px] font-bold"
      >
        {q}
        <span
          className={cx(
            "grid size-7 shrink-0 place-items-center rounded-full transition",
            open ? "rotate-180 bg-ink text-white" : "bg-plane text-ink-2",
          )}
        >
          <IconChevron width={14} height={14} />
        </span>
      </button>
      {open && <p className="-mt-1 pb-4 pr-10 text-[12.5px] leading-relaxed text-ink-2">{a}</p>}
    </div>
  );
}

/* ---------------- Departments ---------------- */

function Departments({ has, data }: { has: Has; data: HomeData }) {
  const list = data.departments.filter((d) => has(d.name, d.desc, ...d.tools, ...(d.heads ?? [])));
  const [open, setOpen] = useState<Department | null>(null);
  return (
    <section className="card p-6">
      <DepartmentWiki key={open?.name} dept={open} data={data} onClose={() => setOpen(null)} />
      <CardHead eyebrow="Find your team" title="Departments" sub="Each card opens the Department Wiki." />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {list.length ? (
          list.map((d) => (
            <button
              key={d.id ?? d.name}
              type="button"
              onClick={() => setOpen(d)}
              aria-label={`${d.name} — open Department Wiki`}
              className="group flex flex-col overflow-hidden rounded-[20px] border border-line bg-white text-left transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-center gap-3 px-5 pt-5">
                <span className="flex items-center gap-2.5 text-[16px] font-extrabold">
                  <span className="h-6 w-1.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
              </div>
              {d.desc && <p className="px-5 pt-3 text-[12.5px] leading-relaxed text-ink-2">{d.desc}</p>}
              {d.members != null && (
                <div className="flex flex-wrap gap-1.5 px-5 pt-3 text-[11.5px] font-bold">
                  {[`${d.members} members`, `${d.activePics ?? 0} active P.I.C.S`, `${d.openAnt ?? 0} open ANT requests`].map((m) => (
                    <span key={m} className="rounded-full px-2.5 py-0.5" style={{ color: d.color, background: `${d.color}1a` }}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {!!d.heads?.length && (
                <p className="px-5 pt-2 text-[11.5px] text-muted">
                  Head{d.heads.length > 1 ? "s" : ""}: {d.heads.join(", ")}
                </p>
              )}
              <div className="mt-auto px-5 pb-5 pt-4">
                <div className="field-label">Related tools</div>
                <div className="flex flex-wrap gap-1.5">
                  {d.tools.length === 0 && <span className="text-[11.5px] text-muted">None linked in the Tool Library</span>}
                  {d.tools.map((tn) => {
                    const t = data.tools.find((x) => x.name === tn);
                    return (
                      <span key={tn} className="chip gap-1.5 pl-1">
                        {t && <ToolMark tool={t} size="sm" />}
                        {tn}
                      </span>
                    );
                  })}
                </div>
              </div>
            </button>
          ))
        ) : (
          <NoMatch />
        )}
      </div>
    </section>
  );
}

/* ---------------- Tools ---------------- */

function Tools({ has, data }: { has: Has; data: HomeData }) {
  const [dept, setDept] = useState("");
  const depts = [...new Set(data.tools.flatMap((t) => t.departments))].sort();
  const list = data.tools.filter((t) => (!dept || t.departments.includes(dept)) && has(t.name, t.desc ?? "", ...(t.layers ?? []), ...t.departments));
  const tile = "flex flex-col items-center rounded-[20px] bg-plane px-3 pb-4 pt-5 text-center";
  return (
    <section className="card p-6">
      <CardHead
        eyebrow="Get equipped"
        title="Tools"
        right={
          <Select
            label="Filter by department"
            value={dept}
            onChange={setDept}
            options={[{ value: "", label: "All departments" }, ...depts.map((d) => ({ value: d, label: d }))]}
          />
        }
      />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {list.length ? (
          list.map((t) => {
            const body = (
              <>
                <ToolMark tool={t} size="lg" />
                <span className="mt-3 text-[14px] font-extrabold">{t.name}</span>
                {t.desc && <span className="mt-1 line-clamp-3 text-[11.5px] leading-snug text-ink-2">{t.desc}</span>}
                <span className="mt-2 flex flex-wrap justify-center gap-1">
                  {t.departments.length ? (
                    t.departments.map((d) => (
                      <span key={d} className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: data.deptColors[d] ?? "#6b7280" }}>
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10.5px] text-muted">Company-wide</span>
                  )}
                </span>
                {!!t.missing?.length && (
                  <span className="mt-2 rounded-full bg-[#fff4e8] px-2 py-0.5 text-[10px] font-bold text-[#a24d06]" title={`Missing: ${t.missing.join(", ")}`}>
                    Fix in Airtable
                  </span>
                )}
              </>
            );
            return t.url ? (
              <a
                key={t.id ?? t.name}
                href={t.url}
                target="_blank"
                rel="noopener"
                aria-label={`${t.name} (opens in a new tab)`}
                className={cx(tile, "transition hover:-translate-y-0.5 hover:shadow-card")}
              >
                {body}
              </a>
            ) : (
              <div key={t.id ?? t.name} className={tile}>
                {body}
              </div>
            );
          })
        ) : (
          <NoMatch />
        )}
      </div>
    </section>
  );
}

/* ---------------- Team resources ---------------- */

function Resources({ has, data }: { has: Has; data: HomeData }) {
  const res = data.resources.filter((r) => has(r.name, r.detail ?? ""));
  const docs = data.docs.filter((d) => has(d.title, d.category, d.desc, ...d.departments));
  const subs = data.subDashboards.filter((r) => has(r.name));
  const tile = "flex min-h-[92px] flex-col justify-between rounded-[20px] border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card";
  return (
    <>
      <section className="card p-6">
        <CardHead eyebrow="Support" title="Team Resources" />
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {res.length ? (
            res.map((r) => (
              <TargetLink key={r.name} target={r.target} label={r.name} className={tile}>
                <span>
                  <span className="block text-[14px] font-extrabold">{r.name}</span>
                  {r.detail && <span className="mt-0.5 block text-[11.5px] font-semibold text-muted">{r.detail}</span>}
                </span>
                <TargetHint target={r.target} />
              </TargetLink>
            ))
          ) : (
            <NoMatch />
          )}
        </div>
      </section>
      {data.docs.length > 0 && (
        <section className="card p-6">
          <CardHead
            eyebrow="Employee Resources"
            title="Policies, SOPs & Agreements"
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {docs.length ? (
              docs.map((d) => (
                <TargetLink
                  key={d.id}
                  target={d.target}
                  label={d.title}
                  className="flex flex-col gap-1.5 rounded-[20px] border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[13.5px] font-extrabold leading-snug">{d.title}</span>
                    <span className="flex shrink-0 gap-1">
                      <span className="chip text-[10.5px]">{d.category}</span>
                      <TargetHint target={d.target} />
                    </span>
                  </span>
                  {d.desc && <span className="line-clamp-2 text-[12px] leading-relaxed text-ink-2">{d.desc}</span>}
                  {d.departments.length > 0 && <span className="text-[11px] text-muted">{d.departments.join(" · ")}</span>}
                </TargetLink>
              ))
            ) : (
              <NoMatch />
            )}
          </div>
        </section>
      )}
      <section className="card p-6">
        <CardHead eyebrow="Productivity Center" title="Sub-Dashboards" />
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {subs.length ? (
            subs.map((r) => (
              <TargetLink key={r.name} target={r.target} label={r.name} className={tile}>
                <span className="text-[14px] font-extrabold">{r.name}</span>
                <TargetHint target={r.target} />
              </TargetLink>
            ))
          ) : (
            <NoMatch />
          )}
        </div>
      </section>
    </>
  );
}
