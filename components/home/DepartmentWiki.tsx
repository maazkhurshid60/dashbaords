"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { IconExternal } from "@/components/icons";
import { Modal, useToast } from "@/components/ui";
import type { Department, HomeData, WikiPerson } from "@/lib/home-data";
import { DASHBOARDS, DEPT_SOPS, HIER_MANUAL, HIER_PAGES, HIER_PARENT, RES_PAGES, cu, isAnt, type DashStatus, type ResStatus } from "@/lib/home-wiki";
import { cx } from "@/lib/utils";

/* Department Wiki (DEPT-3 / DEPT-4), per the client's UAT mockup: header (overview, divisions,
   Annual budget · Department head(s) · Team members · Department goals) and six tabs. */

type Tab = "hier" | "dash" | "tools" | "res" | "work" | "map";
const TABS: { id: Tab; label: string; dev?: boolean }[] = [
  { id: "hier", label: "Hierarchy" },
  { id: "dash", label: "Related Dashboards" },
  { id: "tools", label: "Related Tools" },
  { id: "res", label: "Related Team Resources" },
  { id: "work", label: "Goals & Work" },
  { id: "map", label: "Airtable field map", dev: true },
];

const money = (v?: number | null) => (v ? `$${Math.round(v / 1000)}K` : "—");

function Chip({ tone, children }: { tone?: "green" | "warn" | "red"; children: ReactNode }) {
  const t = { green: "bg-[#e7f6ec] text-[#1f7a43]", warn: "bg-[#fff4e8] text-[#a24d06]", red: "bg-[#fde8ea] text-[#b4232f]" };
  return <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-bold", tone ? t[tone] : "bg-plane text-ink-2")}>{children}</span>;
}
function Ph({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line bg-plane p-4 text-center text-[12px] text-muted">{children}</div>;
}
function Sec({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h4 className="text-[13.5px] font-extrabold">{title}</h4>
      {sub && <p className="mt-0.5 text-[11.5px] text-muted">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Item({ title, desc, children }: { title: ReactNode; desc?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-3.5">
      <span className="text-[13px] font-bold">{title}</span>
      {desc && <span className="text-[11.5px] text-ink-2">{desc}</span>}
      {children && <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-semibold">{children}</div>}
    </div>
  );
}
const List = ({ children }: { children: ReactNode }) => <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>;
const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand hover:underline">
    {children} <IconExternal width={12} height={12} />
  </a>
);

function dashBadge(s: DashStatus) {
  return s === "live" ? <Chip tone="green">Live</Chip> : s === "airtable" ? <Chip>Airtable interface</Chip> : s === "soon" ? <Chip tone="warn">Soon</Chip> : <Chip tone="red">Phase 3</Chip>;
}
function resBadge(s: ResStatus) {
  return s === "missing" ? <Chip tone="warn">Page needed</Chip> : s === "verify" ? <Chip>Verify</Chip> : <Chip tone="green">Linked</Chip>;
}

export function DepartmentWiki({ dept, data, onClose }: { dept: Department | null; data: HomeData; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("hier");
  if (!dept) return null;
  const w = dept.wiki;
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={
        <span className="flex items-center gap-2.5">
          <span className="h-7 w-1.5 rounded-full" style={{ background: dept.color }} />
          {dept.name}
        </span>
      }
      subtitle={dept.desc || undefined}
      footer={
        w && (
          <a href={w.recordUrl} target="_blank" rel="noopener" className="btn btn-sm">
            Airtable record <IconExternal width={13} height={13} />
          </a>
        )
      }
    >
      {!!w?.divisions.length && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {w.divisions.map((d) => (
            <Chip key={d}>{d}</Chip>
          ))}
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [money(w?.budget), "Annual budget"],
          [String(w?.heads.length ?? dept.heads?.length ?? 0), "Department head(s)"],
          [String(w?.members.length ?? dept.members ?? 0), "Team members"],
          [String(w?.goals.length ?? 0), "Department goals"],
        ].map(([v, k]) => (
          <div key={k} className="rounded-2xl bg-plane px-3 py-2.5">
            <div className="text-[20px] font-extrabold" style={{ color: dept.color }}>
              {v}
            </div>
            <div className="text-[11px] font-semibold text-ink-2">{k}</div>
          </div>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-line pb-3" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "flex h-[30px] shrink-0 items-center rounded-full px-3.5 text-[12px] font-bold",
              tab === t.id ? "bg-ink text-white" : t.dev ? "border border-dashed border-line text-muted" : "bg-plane text-ink-2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!w ? (
        <Ph>Wiki content needs a live Airtable connection.</Ph>
      ) : tab === "hier" ? (
        <Hierarchy dept={dept} people={w.people} orgCharts={w.orgCharts} writable={!!data.hierarchyWritable} />
      ) : tab === "dash" ? (
        <Sec title="Related dashboards" sub="Shown when the department has linked records in that dashboard's source tables (see field map).">
          {w.dashboards.length ? (
            <List>
              {w.dashboards
                .map((k) => DASHBOARDS[k])
                .filter(Boolean)
                .map((x) => (
                  <Item key={x.n} title={x.n} desc={x.d}>
                    {x.s === "live" && x.u ? (
                      <Link href={x.u} className="text-brand hover:underline">
                        Go to dashboard
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {dashBadge(x.s)}
                  </Item>
                ))}
            </List>
          ) : (
            <Ph>No related dashboards yet</Ph>
          )}
        </Sec>
      ) : tab === "tools" ? (
        <RelatedTools dept={dept} data={data} />
      ) : tab === "res" ? (
        <Resources resources={w.resources} />
      ) : tab === "work" ? (
        <>
          <Sec title="Department goals">
            {w.goals.length ? (
              <List>
                {w.goals.map((g) => (
                  <Item key={g.id} title={g.title} />
                ))}
              </List>
            ) : (
              <Ph>No goals linked</Ph>
            )}
          </Sec>
          <Sec title="Active P.I.C.S">
            {w.pics.length ? (
              <div className="flex flex-wrap gap-1.5">
                {w.pics.map((p, i) => (
                  <Chip key={`${i}-${p}`}>{p}</Chip>
                ))}
              </div>
            ) : (
              <Ph>No P.I.C.S linked</Ph>
            )}
          </Sec>
          <Sec title="Meetings, status reports, metrics & announcements">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {w.work.map((x) => (
                <div key={x.label} className="rounded-2xl bg-plane px-3 py-2.5">
                  <div className="text-[18px] font-extrabold">{x.count}</div>
                  <div className="text-[11px] font-semibold text-ink-2">{x.label}</div>
                </div>
              ))}
            </div>
          </Sec>
        </>
      ) : (
        <FieldMap rows={data.fieldMap ?? []} />
      )}
    </Modal>
  );
}

/* ---------------- Hierarchy ---------------- */

const short = (n: string) => n.replace(/\s*\(.*\)\s*$/, "");
function subline(p: WikiPerson) {
  if (p.head) return "Department head";
  const m = p.name.match(/\(([^)]*)\)/);
  return m ? `${m[1]} role` : p.role || "Team member";
}

function Node({ p, color }: { p: WikiPerson; color: string }) {
  return (
    <div
      className={cx(
        "min-w-[150px] max-w-[200px] rounded-2xl border-2 bg-white px-3 py-2 text-center",
        isAnt(p.name) ? "border-dashed border-line" : p.head ? "" : "border-line",
      )}
      style={p.head && !isAnt(p.name) ? { borderColor: color } : undefined}
    >
      <b className="block text-[12.5px] leading-tight">{short(p.name)}</b>
      <span className="text-[10.5px] text-muted">{subline(p)}</span>
    </div>
  );
}
const Conn = () => <div className="mx-auto h-4 w-0.5 bg-line" />;

function Branch({ p, kids, color, seen }: { p: WikiPerson; kids: (id: string) => WikiPerson[]; color: string; seen: Set<string> }) {
  const ch = kids(p.id).filter((c) => !seen.has(c.id));
  ch.forEach((c) => seen.add(c.id));
  return (
    <div className="flex flex-col items-center">
      <Node p={p} color={color} />
      {ch.length > 0 && (
        <>
          <Conn />
          <div className="flex flex-wrap justify-center gap-3 border-t-2 border-line pt-3">
            {ch.map((c) => (
              <Branch key={c.id} p={c} kids={kids} color={color} seen={seen} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Hierarchy({ dept, people: initial, orgCharts, writable }: { dept: Department; people: WikiPerson[]; orgCharts: { thumb: string; full: string; name: string }[]; writable: boolean }) {
  const toast = useToast();
  const [people, setPeople] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [big, setBig] = useState<{ full: string; name: string } | null>(null);
  const ids = new Set(people.map((p) => p.id));
  const parent = (p: WikiPerson) => p.reportsTo.find((id) => ids.has(id) && id !== p.id);
  const kids = (id: string) => people.filter((p) => parent(p) === id);
  const roots = people.filter((p) => !parent(p));
  const headRoots = roots.filter((p) => p.head);
  const seen = new Set(roots.map((p) => p.id));
  const loose = roots.filter((p) => !p.head);
  const hierPage = HIER_PAGES[dept.name];

  async function setReportsTo(p: WikiPerson, to: string) {
    const next = to ? [to, ...p.reportsTo.filter((x) => x !== to && !ids.has(x))] : p.reportsTo.filter((x) => !ids.has(x));
    const prev = people;
    setPeople((list) => list.map((x) => (x.id === p.id ? { ...x, reportsTo: next } : x)));
    if (!writable) return;
    setSaving(p.id);
    try {
      const r = await fetch("/departments/hierarchy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: p.id, reportsTo: next }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || `Save failed (${r.status})`);
      toast(`Saved: ${short(p.name)} reports to ${to ? short(people.find((x) => x.id === to)?.name ?? "") : "nobody in this department"}`);
    } catch (e) {
      setPeople(prev);
      toast(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <Sec title="Department hierarchy" sub="Built from Department Head(s) and Team Members (and Team Members › Reports To). ANT roles shown dashed.">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {editing && !writable && <span className="text-[11.5px] text-[#a24d06]">Reports To isn&apos;t writable in Airtable — edits stay on this page only.</span>}
          <button type="button" className={cx("btn btn-sm", editing && "bg-ink text-white")} onClick={() => setEditing((e) => !e)}>
            {editing ? "Done" : "Edit hierarchy"}
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-plane p-5">
          <div className="flex min-w-max flex-col items-center">
            <div className="flex flex-wrap justify-center gap-4">
              {headRoots.length ? (
                headRoots.map((p) => <Branch key={p.id} p={p} kids={kids} color={dept.color} seen={seen} />)
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-line bg-white px-3 py-2 text-center text-[12.5px] font-bold">
                  Unassigned
                  <span className="block text-[10.5px] font-normal text-muted">Department head</span>
                </div>
              )}
            </div>
            {loose.length > 0 && (
              <>
                <Conn />
                <div className="flex flex-wrap justify-center gap-3 border-t-2 border-line pt-3">
                  {loose.map((p) => (
                    <Branch key={p.id} p={p} kids={kids} color={dept.color} seen={seen} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        {editing && (
          <div className="mt-4 rounded-2xl border border-line bg-white p-4">
            <div className="mb-2 text-[12px] font-bold">Who reports to whom</div>
            <p className="mb-3 text-[11.5px] text-muted">
              {writable
                ? "Each change saves to Team Members › Reports To in Airtable (Direct Reports updates with it) and is logged in Dashboard Sync Queue."
                : "Changes rebuild the chart above but are not saved."}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {people.map((p) => (
                <label key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-plane px-3 py-2 text-[12px] font-semibold">
                  <span className="min-w-0 truncate">{short(p.name)}</span>
                  <select
                    className="h-8 max-w-[55%] rounded-lg border border-line bg-white px-2 text-[12px]"
                    value={parent(p) ?? ""}
                    disabled={saving === p.id}
                    onChange={(e) => setReportsTo(p, e.target.value)}
                    aria-label={`${p.name} reports to`}
                  >
                    <option value="">{p.head ? "— top of department —" : "— not set —"}</option>
                    {people
                      .filter((x) => x.id !== p.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {short(x.name)}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
              {people.length === 0 && <Ph>No Department Head(s) or Team Members linked in Airtable.</Ph>}
            </div>
          </div>
        )}
      </Sec>
      <Sec title="Hierarchy charts & images" sub="From the Airtable “Dept. Org Chart” attachment field and the ClickUp Team Hierarchies page.">
        <List>
          <Item title="Dept. Org Chart (Airtable)">
            {orgCharts.length ? (
              <div className="flex w-full flex-wrap gap-2">
                {orgCharts.map((a) => (
                  <button key={a.full} type="button" onClick={() => setBig(a)} className="overflow-hidden rounded-xl border border-line" aria-label={`Enlarge ${a.name}`}>
                    {/* Airtable attachment URLs are short-lived and aren't in next/image remotePatterns. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.thumb} alt={`${dept.name} org chart`} className="max-h-48 w-full cursor-zoom-in object-contain" />
                  </button>
                ))}
              </div>
            ) : (
              <Ph>No org chart uploaded yet</Ph>
            )}
          </Item>
          <Item title="Team Hierarchy (ClickUp)" desc={hierPage ? `Resource Hub › Team Hierarchies › ${dept.name.toUpperCase()}` : "No department page yet — parent folder linked"}>
            <Ext href={cu(hierPage ?? HIER_PARENT)}>View in ClickUp</Ext>
            {hierPage ? <Chip tone="green">Linked</Chip> : <Chip tone="warn">Page needed</Chip>}
          </Item>
          <Item title="Team Hierarchy & P.I.C.S Team Deployment" desc="Resource Hub › Manuals (company-wide)">
            <Ext href={cu(HIER_MANUAL)}>View in ClickUp</Ext>
            <Chip tone="green">Linked</Chip>
          </Item>
        </List>
      </Sec>
      {big && (
        <Modal open wide onClose={() => setBig(null)} title={big.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big.full} alt={`${dept.name} org chart`} className="w-full rounded-2xl object-contain" />
        </Modal>
      )}
    </>
  );
}

/* ---------------- Tools / Resources / Field map ---------------- */

function RelatedTools({ dept, data }: { dept: Department; data: HomeData }) {
  const tools = data.tools.filter((t) => dept.tools.includes(t.name));
  const a = dept.wiki!.ants;
  return (
    <>
      <Sec title="Related tools" sub="From “Tool Registry & Access Log” (Tool Library: description, usage, access & setup).">
        {tools.length ? (
          <List>
            {tools.map((t) => (
              <Item
                key={t.name}
                title={
                  <span className="flex items-center gap-2">
                    {t.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.logo} alt="" className="size-6 rounded-md object-contain" />
                    ) : (
                      <span className="grid size-6 place-items-center rounded-md text-[11px] text-white" style={{ background: t.color }}>
                        {t.glyph}
                      </span>
                    )}
                    {t.name}
                  </span>
                }
                desc={t.desc || "No Product Description in the Tool Library yet"}
              >
                {t.url ? <Ext href={t.url}>Open tool</Ext> : <Chip tone="warn">Fix in Airtable</Chip>}
              </Item>
            ))}
          </List>
        ) : (
          <Ph>No tools linked in Airtable yet</Ph>
        )}
      </Sec>
      <Sec title="ANTs" sub="ANT Library, ANT Quick Assists, ANT Requests and Prompt Library records linked to this department.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [a.library, "ANT Library"],
            [a.quickAssists, "ANT Quick Assists"],
            [a.requests, "ANT Requests"],
            [a.prompts, "Prompt Library"],
          ].map(([n, k]) => (
            <div key={k} className="rounded-2xl bg-plane px-3 py-2.5">
              <div className="text-[18px] font-extrabold">{n}</div>
              <div className="text-[11px] font-semibold text-ink-2">{k}</div>
            </div>
          ))}
        </div>
      </Sec>
    </>
  );
}

function Resources({ resources }: { resources: { title: string; href?: string; category?: string }[] }) {
  const byCat = new Map<string, { title: string; href: string; where: string; status: ResStatus }[]>();
  for (const r of resources) {
    const m = RES_PAGES[r.title];
    const cat = m?.cat ?? r.category ?? "Other";
    const isClickUp = r.href?.includes("app.clickup.com");
    const item = {
      title: r.title,
      href: isClickUp ? r.href! : cu(m?.page ?? DEPT_SOPS),
      where: m?.where ?? (isClickUp ? "Resource Hub" : "Resource Hub › SOPs › Department SOPs"),
      status: (isClickUp ? "linked" : (m?.status ?? "missing")) as ResStatus,
    };
    byCat.set(cat, [...(byCat.get(cat) ?? []), item]);
  }
  const label = (c: string) => (c === "NDA" ? "Agreements (NDA)" : c === "SOP" ? "SOPs" : c);
  return (
    <>
      <div className="mb-5 rounded-2xl bg-[#fff8e6] p-3.5 text-[12px] text-ink-2">
        All team resources are released from ClickUp, so every item links to its ClickUp page. Items marked <b>Page needed</b> are in Airtable but have no dedicated
        ClickUp page yet; <b>Verify</b> means the closest ClickUp page is linked and should be confirmed.
      </div>
      {byCat.size === 0 && <Ph>No Employee Resources linked to this department</Ph>}
      {[...byCat].map(([cat, items]) => (
        <Sec key={cat} title={label(cat)}>
          <List>
            {items.map((r, i) => (
              <Item key={`${i}-${r.title}`} title={r.title} desc={r.where}>
                <Ext href={r.href}>Open in ClickUp</Ext>
                {resBadge(r.status)}
              </Item>
            ))}
          </List>
        </Sec>
      ))}
      <Sec title="Professional Development">
        <Ph>Phase 3 — Professional Development dashboard is out of scope for Phase 1.</Ph>
      </Sec>
    </>
  );
}

function FieldMap({ rows }: { rows: { name: string; type: string; placement: string; note?: string }[] }) {
  if (!rows.length) return <Ph>The field map is built from the live Airtable schema — not available right now.</Ph>;
  return (
    <>
      <div className="mb-4 rounded-2xl border border-dashed border-line bg-plane p-3.5 text-[12px] text-ink-2">
        <b>For the developer:</b> all {rows.length} columns in Airtable › Departments (tblC2JxYOcofjMbFm) and where each one surfaces in the wiki. Rows with notes need a decision or
        data clean-up.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase text-muted">
              <th className="py-2 pr-3">Airtable column</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Wiki placement</th>
              <th className="py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line align-top">
                <td className="py-2 pr-3 font-bold">{r.name}</td>
                <td className="py-2 pr-3 font-mono text-[11px] text-ink-2">{r.type}</td>
                <td className="py-2 pr-3">{r.placement}</td>
                <td className="py-2">{r.note && <Chip tone={/Phase 3/.test(r.note) ? "red" : "warn"}>{r.note}</Chip>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
