"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FeedItem, PageFooter, SidePanel, TopBar } from "@/components/AppShell";
import { IconArrowRight, IconChevron, IconExternal } from "@/components/icons";
import { CardHead, useToast } from "@/components/ui";
import {
  AIRTABLE,
  DEPARTMENTS,
  FAQS,
  KPIS,
  NAV_CARDS,
  NORTH_STAR,
  RESOURCES,
  RESOURCES_LINK,
  SUB_DASHBOARDS,
  TOOLS,
  UPDATES,
  type Target,
} from "@/lib/home-data";
import { cx } from "@/lib/utils";

export type HomeView = "overview" | "departments" | "tools" | "resources";

const VIEWS: { id: HomeView; label: string; href: string }[] = [
  { id: "overview", label: "Home", href: "/" },
  { id: "departments", label: "Departments", href: "/departments" },
  { id: "tools", label: "Tools", href: "/tools" },
  { id: "resources", label: "Team Resources", href: "/resources" },
];

const UPDATE_INITIALS: Record<string, string> = { Product: "PR", Media: "ME", Executive: "EX" };

export function HomeCommand({ view }: { view: HomeView }) {
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
        <TopBar title={title} search="Search briefs, assets, people…" query={query} onQuery={setQuery} />
        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8">
          <nav className="seg" aria-label="Home Command views">
            {VIEWS.map((v) => (
              <Link
                key={v.id}
                href={v.href}
                aria-current={v.id === view ? "page" : undefined}
                className={cx(
                  "flex h-[30px] shrink-0 items-center rounded-full px-3.5 text-[12px] font-bold",
                  v.id === view ? "bg-white text-ink shadow-card" : "text-ink-2",
                )}
              >
                {v.label}
              </Link>
            ))}
          </nav>

          {view === "overview" && <Overview has={has} />}
          {view === "departments" && <Departments has={has} />}
          {view === "tools" && <Tools has={has} />}
          {view === "resources" && <Resources has={has} />}

          <PageFooter meta="VCG Intranet — Master Design System" />
        </div>
      </main>

      <SidePanel title="Home Command" feedTitle="Company updates" footnote="Stay in the loop · snapshot">
        {UPDATES.map((u) => (
          <FeedItem
            key={u.text}
            initials={UPDATE_INITIALS[u.dept] ?? u.dept.slice(0, 2).toUpperCase()}
            name={u.dept}
            text={
              <>
                {u.text} <span className="text-muted">· {u.when}</span>
              </>
            }
          />
        ))}
      </SidePanel>
    </div>
  );
}

type Has = (...v: string[]) => boolean;

/* Renders a card/link for an internal route, an external Airtable page, or a
   page the client hasn't handed over yet. */
function TargetLink({ target, className, children, label }: { target?: Target; className: string; children: ReactNode; label: string }) {
  const toast = useToast();
  if (!target) return <div className={cx(className, "cursor-default")}>{children}</div>;
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
  if (!target) return <span className="text-[11px] font-semibold text-muted">No link yet</span>;
  if ("soon" in target) return <span className="rounded-full bg-plane px-2 py-0.5 text-[10px] font-bold uppercase text-muted">Soon</span>;
  return (
    <span className="flex items-center gap-1 text-[12px] font-bold text-brand">
      Open {target.external ? <IconExternal width={13} height={13} /> : <IconArrowRight width={13} height={13} />}
    </span>
  );
}

function NoMatch() {
  return <div className="col-span-full rounded-2xl bg-plane p-6 text-center text-[12.5px] text-muted">Nothing matches your search.</div>;
}

/* ---------------- Overview ---------------- */

function Overview({ has }: { has: Has }) {
  const navCards = NAV_CARDS.filter((n) => has(n.title));
  const faqs = FAQS.filter((f) => has(f.q, f.a));
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {KPIS.map((k) => (
          <TargetLink key={k.label} target={k.target} label={k.label} className="card group flex flex-col p-5 transition hover:-translate-y-0.5">
            <span className="text-[38px] font-extrabold leading-none tracking-tight">{k.value}</span>
            <span className="mt-2 flex items-center justify-between gap-2 text-[12.5px] font-semibold text-ink-2">
              {k.label}
              <IconArrowRight width={15} height={15} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </span>
          </TargetLink>
        ))}
      </div>

      <section id="north-star" className="card scroll-mt-6 p-6">
        <CardHead
          eyebrow="Company direction"
          title="North Star Goals"
          right={
            <a href={AIRTABLE} target="_blank" rel="noopener" className="btn btn-sm">
              View goals dashboard <IconExternal width={13} height={13} />
            </a>
          }
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {NORTH_STAR.map((g) => (
            <div key={g.title} className="rounded-[20px] bg-plane p-5">
              <div className="text-[14px] font-extrabold leading-snug">{g.title}</div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-linear-to-r from-brand to-violet" style={{ width: `${g.progress}%` }} />
              </div>
              <div className="mt-2 text-[12px] font-semibold text-ink-2">Progress {g.progress}%</div>
            </div>
          ))}
        </div>
      </section>

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

function Departments({ has }: { has: Has }) {
  const list = DEPARTMENTS.filter((d) => has(d.name, d.desc, ...d.tools));
  return (
    <section className="card p-6">
      <CardHead eyebrow="Find your team" title="Departments" sub="Each card opens that department's Airtable interface." />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {list.length ? (
          list.map((d) => (
            <TargetLink
              key={d.name}
              target={d.target}
              label={d.name}
              className="group flex flex-col overflow-hidden rounded-[20px] border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-center justify-between gap-3 px-5 pt-5">
                <span className="flex items-center gap-2.5 text-[16px] font-extrabold">
                  <span className="h-6 w-1.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <TargetHint target={d.target} />
              </div>
              <p className="px-5 pt-3 text-[12.5px] leading-relaxed text-ink-2">{d.desc}</p>
              <div className="mt-auto px-5 pb-5 pt-4">
                <div className="field-label">Related tools</div>
                <div className="flex flex-wrap gap-1.5">
                  {d.tools.map((tn) => {
                    const t = TOOLS.find((x) => x.name === tn);
                    return (
                      <span key={tn} className="chip gap-1.5 pl-1">
                        {t && (
                          <span className="grid size-[18px] place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: t.color }}>
                            {t.glyph}
                          </span>
                        )}
                        {tn}
                      </span>
                    );
                  })}
                </div>
              </div>
            </TargetLink>
          ))
        ) : (
          <NoMatch />
        )}
      </div>
    </section>
  );
}

/* ---------------- Tools ---------------- */

function Tools({ has }: { has: Has }) {
  const list = TOOLS.filter((t) => has(t.name, ...DEPARTMENTS.filter((d) => d.tools.includes(t.name)).map((d) => d.name)));
  return (
    <section className="card p-6">
      <CardHead
        eyebrow="Get equipped"
        title="Tools"
        sub="The company-wide tool stack and the departments that use each one."
        right={
          <a href={AIRTABLE} target="_blank" rel="noopener" className="btn btn-sm">
            View full tools library <IconExternal width={13} height={13} />
          </a>
        }
      />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {list.length ? (
          list.map((t) => {
            const usedBy = DEPARTMENTS.filter((d) => d.tools.includes(t.name)).map((d) => d.name);
            return (
              <div key={t.name} className="flex flex-col items-center rounded-[20px] bg-plane px-3 pb-4 pt-5 text-center">
                <span className="grid size-16 place-items-center rounded-[20px] text-[24px] font-bold text-white shadow-card" style={{ background: t.color }}>
                  {t.glyph}
                </span>
                <span className="mt-3 text-[14px] font-extrabold">{t.name}</span>
                <span className="mt-1 text-[11px] leading-snug text-muted">{usedBy.length ? usedBy.join(" · ") : "Company-wide"}</span>
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

function Resources({ has }: { has: Has }) {
  const res = RESOURCES.filter((r) => has(r.name));
  const subs = SUB_DASHBOARDS.filter((r) => has(r.name));
  const tile = "flex min-h-[92px] flex-col justify-between rounded-[20px] border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card";
  return (
    <>
      <section className="card p-6">
        <CardHead
          eyebrow="Support"
          title="Team Resources"
          right={
            <a href={RESOURCES_LINK} target="_blank" rel="noopener" className="btn btn-sm">
              Open team resources <IconExternal width={13} height={13} />
            </a>
          }
        />
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {res.length ? (
            res.map((r) => (
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
      <section className="card p-6">
        <CardHead eyebrow="Productivity Center" title="Sub-Dashboards" sub="Airtable interface pages for each productivity area." />
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
