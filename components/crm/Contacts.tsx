"use client";

import { useMemo, useState } from "react";
import { fmtDate, hit, isOpenOpp, money, monthKey, monthLabel, ts } from "@/lib/crm-logic";
import { nowMs } from "@/lib/crm-logic";
import type { Company, Contact, SavedView } from "@/lib/crm-types";
import { Chip, Com, Empty, Stat, cx } from "./bits";
import { useCrm } from "./store";

type Section = "People" | "Companies" | "Contractors";

/* Contacts tab (COM-8 → COM-11, COM-29): People · Companies · Contractors, views bar,
   ＋ New view (one compact filter panel → Saved Views), group by, sort, duplicate banner. */
export function Contacts() {
  const { D, nav, setPanel, name, write, busy } = useCrm();
  const [sec, setSec] = useState<Section>(nav.contactsSection || "People");
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<"all" | "active">("all");
  const [viewId, setViewId] = useState("");
  const [draft, setDraft] = useState<Partial<SavedView> | null>(null);
  const [group, setGroup] = useState("");
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: "name", dir: 1 });
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const people = D.contacts.filter((c) => c.stage !== "Contractor");
  const contractors = D.contacts.filter((c) => c.stage === "Contractor");
  const obj = sec === "Companies" ? "Companies" : "People";
  const views = D.views.filter((v) => v.object === obj);
  const view = draft || views.find((v) => v.id === viewId) || null;

  const matchView = (c: Contact | Company) => {
    if (!view) return true;
    if ("stage" in c) {
      if (view.stages?.length && !view.stages.includes(c.stage)) return false;
      if (view.sources?.length && !view.sources.includes(c.source)) return false;
      if (view.locations && !hit(view.locations, c.location)) return false;
      if (view.months && monthKey(c.created) !== view.months) return false;
    } else {
      if (view.tiers?.length && !view.tiers.includes(c.tier)) return false;
      if (view.industries?.length && !view.industries.includes(c.industry)) return false;
      if (view.locations && !hit(view.locations, c.city)) return false;
      if (view.months && monthKey(c.created) !== view.months) return false;
    }
    if (view.ownerIds?.length && !c.ownerIds.some((o) => view.ownerIds!.includes(o))) return false;
    return true;
  };

  type Row = { id: string; cells: Record<string, string>; sortv: Record<string, string | number>; open: () => void; example?: boolean };
  const rows = useMemo((): Row[] => {
    if (sec === "Companies")
      return D.companies
        .filter((c) => hit(q, c.name, c.city, c.industry) && matchView(c))
        .map((c) => {
          const ppl = D.contacts.filter((p) => p.companyIds.includes(c.id)).length || c.contactIds.length;
          const open = c.openPipeline ?? D.opps.filter((o) => o.companyIds.includes(c.id) && isOpenOpp(o, D.stages)).reduce((s, o) => s + (o.value || 0), 0);
          return {
            id: c.id,
            open: () => setPanel({ kind: "company", id: c.id }),
            cells: { name: c.name, type: c.industry, size: c.size, tier: c.tier, city: c.city, people: String(ppl), owner: c.ownerIds.map(name).join(", "), pipeline: money(open) },
            sortv: { name: c.name, people: ppl, pipeline: open || 0 },
          };
        });
    const src = sec === "People" ? people : contractors;
    return src
      .filter((c) => hit(q, c.name, c.email, c.org, c.location) && matchView(c))
      .filter((c) => quick === "all" || (sec === "Contractors" ? c.contractorStatus === "Active" : ["VIP", "Active"].includes(c.relationship) || ts(c.lastMessageAt || c.lastContacted) > nowMs() - 90 * 864e5))
      .map((c): Row =>
        sec === "People"
          ? {
              id: c.id,
              open: () => setPanel({ kind: "contact", id: c.id }),
              cells: {
                name: c.name || c.email,
                email: c.email,
                org: c.org || c.companyIds.map(name).join(", "),
                location: c.location,
                stage: c.stage,
                score: c.score != null ? String(c.score) : "",
                owner: c.ownerIds.map(name).join(", "),
                last: fmtDate(c.lastContacted || c.lastMessageAt),
                lastMonth: monthLabel(monthKey(c.lastContacted || c.lastMessageAt)),
                msgs: c.msgCount != null ? String(c.msgCount) : "",
                source: c.source,
              },
              sortv: { name: c.name.toLowerCase(), score: c.score ?? -1, last: ts(c.lastContacted || c.lastMessageAt), msgs: c.msgCount ?? 0 },
            }
          : {
              id: c.id,
              open: () => setPanel({ kind: "contact", id: c.id }),
              cells: {
                name: c.name,
                email: c.email,
                role: c.title,
                status: c.contractorStatus,
                dept: c.deptIds.map(name).join(", "),
                engagement: c.engagement,
                tasks: c.openTasks != null ? String(c.openTasks) : "",
                member: c.teamMemberIds.map(name).join(", "),
              },
              sortv: { name: c.name.toLowerCase(), tasks: c.openTasks ?? 0 },
            },
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D, sec, q, quick, view]);

  const sorted = [...rows].sort((a, b) => {
    const x = a.sortv[sort.k] ?? a.cells[sort.k] ?? "";
    const y = b.sortv[sort.k] ?? b.cells[sort.k] ?? "";
    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
  });

  const COLS: Record<Section, [string, string][]> = {
    People: [["name", "Name"], ["org", "Organization"], ["location", "📍 Location"], ["stage", "Stage"], ["score", "Score"], ["owner", "Owner"], ["last", "Last contacted"], ["msgs", "Messages"], ["source", "Source"]],
    Companies: [["name", "Company"], ["type", "Type"], ["size", "Size"], ["tier", "Tier"], ["city", "City"], ["people", "People"], ["owner", "Owner"], ["pipeline", "Open pipeline"]],
    Contractors: [["name", "Name"], ["role", "Role"], ["status", "Status"], ["dept", "Department"], ["engagement", "Engagement"], ["tasks", "Open tasks"], ["member", "Team member"]],
  };
  const GROUPS: Record<Section, [string, string][]> = {
    People: [["stage", "Stage"], ["org", "Organization"], ["owner", "Owner"], ["source", "Source"], ["location", "Location"], ["lastMonth", "Last contacted month"]],
    Companies: [["tier", "Tier"], ["type", "Type"], ["city", "City"]],
    Contractors: [["status", "Status"], ["dept", "Department"], ["engagement", "Engagement"], ["role", "Role"]],
  };
  const groups = group ? [...new Set(sorted.map((r) => r.cells[group] || "—"))].sort() : [""];

  /* duplicate banner (COM-10): same email on 2+ contacts */
  const dupes = useMemo(() => {
    const by = new Map<string, Contact[]>();
    people.forEach((c) => c.email && by.set(c.email.toLowerCase(), [...(by.get(c.email.toLowerCase()) || []), c]));
    return [...by.values()].filter((l) => l.length > 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D.contacts]);

  const stat = sec === "People"
    ? [["People", people.length], ["Leads", people.filter((c) => ["Lead", "MQL", "SQL"].includes(c.stage)).length], ["Customers", people.filter((c) => c.stage === "Customer").length], ["No stage", people.filter((c) => !c.stage).length]]
    : sec === "Companies"
      ? [["Companies", D.companies.length], ["With open pipeline", D.companies.filter((c) => (c.openPipeline || 0) > 0).length]]
      : [["Contractors", contractors.length], ["Active", contractors.filter((c) => c.contractorStatus === "Active").length]];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="seg">
          {(["People", "Companies", "Contractors"] as Section[]).map((s) => (
            <button key={s} type="button" aria-pressed={sec === s} onClick={() => { setSec(s); setViewId(""); setDraft(null); setGroup(""); }}>
              {s}
            </button>
          ))}
        </div>
        <Com id="COM-8" />
        <input className="field ml-auto w-64" placeholder={`Search ${sec.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {stat.map(([l, v]) => (
          <Stat key={l} label={String(l)} value={v} />
        ))}
      </div>

      {sec === "People" && dupes.length > 0 && (
        <div className="rounded-xl bg-warn-soft p-3 text-[13px]">
          <b>{dupes.length} possible duplicate{dupes.length > 1 ? "s" : ""}</b> (same email):
          {dupes.slice(0, 5).map((l) => (
            <div key={l[0].id} className="mt-1 flex flex-wrap items-center gap-2">
              {l.map((c) => (
                <Chip key={c.id} tone="brand" onClick={() => setPanel({ kind: "contact", id: c.id })}>
                  {c.name || c.email} · {c.msgCount ?? 0} msgs
                </Chip>
              ))}
              <button type="button" className="btn btn-sm" disabled={busy} onClick={() => write("saveContact", { id: l[1].id, fields: { "Duplicate Of": [l[0].id] } }, "Marked as duplicate")}>
                Mark 2nd as duplicate of 1st
              </button>
            </div>
          ))}
        </div>
      )}

      {/* views bar (COM-10/11) */}
      <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
        <Chip tone={!viewId && !draft && quick === "all" ? "brand" : "gray"} onClick={() => { setViewId(""); setDraft(null); setQuick("all"); }}>
          {sec === "Contractors" ? "All contractors" : sec === "Companies" ? "All companies" : "All people"} · {(sec === "People" ? people : sec === "Contractors" ? contractors : D.companies).length}
        </Chip>
        {sec !== "Companies" && (
          <Chip tone={quick === "active" ? "brand" : "gray"} onClick={() => setQuick(quick === "active" ? "all" : "active")}>
            Active
          </Chip>
        )}
        {sec !== "Contractors" &&
          views.map((v) => (
            <span key={v.id} className="inline-flex items-center">
              <Chip tone={viewId === v.id ? "brand" : "gray"} onClick={() => { setDraft(null); setViewId(v.id); }}>
                {v.name}
              </Chip>
              <button type="button" className="px-1 text-muted hover:text-bad" title="Delete view" onClick={() => write("saveView", { id: v.id, remove: true, tab: "Contacts" }, "View deleted")}>
                ×
              </button>
            </span>
          ))}
        {sec !== "Contractors" && (
          <button type="button" className="btn btn-sm" onClick={() => setDraft(draft ? null : { object: obj, stages: [], sources: [], tiers: [], industries: [], ownerIds: [] })}>
            ＋ New view
          </button>
        )}
        <Com id="COM-10" />
        <label className="ml-auto flex items-center gap-1.5">
          Group by
          <select className="field w-auto py-1" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">None</option>
            {GROUPS[sec].map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {draft && <ViewPanel draft={draft} setDraft={setDraft} count={rows.length} tab="Contacts" onSaved={(id) => { setDraft(null); setViewId(id); }} />}

      <div className="card overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11.5px] text-muted">
              {COLS[sec].map(([k, l]) => (
                <th key={k} className="cursor-pointer px-3 py-2 font-semibold" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : 1 }))}>
                  {l}
                  {sort.k === k ? (sort.dir > 0 ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => {
            const list = group ? sorted.filter((r) => (r.cells[group] || "—") === g) : sorted;
            const isCol = collapsed.includes(g);
            return (
              <tbody key={g || "all"}>
                {group && (
                  <tr className="cursor-pointer bg-plane" onClick={() => setCollapsed((c) => (isCol ? c.filter((x) => x !== g) : [...c, g]))}>
                    <td colSpan={COLS[sec].length} className="px-3 py-1.5 text-[12px] font-bold">
                      {isCol ? "▸" : "▾"} {g} · {list.length}
                    </td>
                  </tr>
                )}
                {!isCol &&
                  list.slice(0, 500).map((r) => (
                    <tr key={r.id} className="cursor-pointer border-b border-line hover:bg-plane" onClick={r.open}>
                      {COLS[sec].map(([k]) => (
                        <td key={k} className="px-3 py-2">
                          {k === "name" ? (
                            <div>
                              <div className="font-semibold">{r.cells.name || "(no name)"}</div>
                              {r.cells.email && <div className="text-[11.5px] text-muted">{r.cells.email}</div>}
                            </div>
                          ) : k === "stage" ? (
                            r.cells.stage ? <Chip tone="brand">{r.cells.stage}</Chip> : <span className="text-[12px] text-brand">Set stage</span>
                          ) : k === "status" && r.cells.status ? (
                            <Chip tone={r.cells.status === "Active" ? "good" : "gray"}>{r.cells.status}</Chip>
                          ) : (
                            <span className={cx(!r.cells[k] && "text-muted")}>{r.cells[k] || "—"}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            );
          })}
        </table>
        {!rows.length && (
          <div className="p-4">
            <Empty>{sec === "Companies" ? "No companies match." : "Nobody matches."}</Empty>
          </div>
        )}
      </div>
      <Com id="COM-29" />
    </div>
  );
}

/** One compact filter panel; “Save view” only while the view is unsaved → Saved Views (COM-11). */
export function ViewPanel({ draft, setDraft, count, tab, onSaved }: { draft: Partial<SavedView>; setDraft: (v: Partial<SavedView> | null) => void; count: number; tab: string; onSaved: (id: string) => void }) {
  const { D, opts, write, busy } = useCrm();
  const toggle = (k: "stages" | "sources" | "tiers" | "industries" | "pipelines" | "stageTypes", v: string) => {
    const cur = (draft[k] as string[]) || [];
    setDraft({ ...draft, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const chips = (k: "stages" | "sources" | "tiers" | "industries" | "pipelines" | "stageTypes", label: string, list: string[]) => (
    <div className="flex flex-wrap items-center gap-1">
      <span className="w-24 text-[12px] font-semibold text-ink-2">{label}</span>
      {list.map((o) => (
        <Chip key={o} tone={((draft[k] as string[]) || []).includes(o) ? "brand" : "gray"} onClick={() => toggle(k, o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
  const obj = draft.object;
  return (
    <div className="card space-y-2 p-3">
      {obj === "People" && chips("stages", "Stage", opts("Saved Views.Stages"))}
      {obj === "People" && chips("sources", "Source", opts("Contacts.Lead Source"))}
      {obj === "Companies" && chips("tiers", "Tier", opts("Companies.Tier"))}
      {obj === "Companies" && chips("industries", "Type", opts("Companies.Industry"))}
      {obj === "Deals" && chips("pipelines", "Pipeline", opts("Saved Views.Pipelines"))}
      {obj === "Deals" && chips("stageTypes", "Stage type", [...new Set(D.stages.map((s) => s.type))])}
      <div className="flex flex-wrap items-center gap-2">
        {obj !== "Deals" && <input className="field w-44" placeholder="Location contains…" value={draft.locations || ""} onChange={(e) => setDraft({ ...draft, locations: e.target.value })} />}
        <input className="field w-40" type="month" value={(obj === "Deals" ? draft.closeMonths : draft.months) || ""} onChange={(e) => setDraft({ ...draft, [obj === "Deals" ? "closeMonths" : "months"]: e.target.value })} title={obj === "Deals" ? "Close month" : "Month added"} />
        <select className="field w-44" value={draft.ownerIds?.[0] || ""} onChange={(e) => setDraft({ ...draft, ownerIds: e.target.value ? [e.target.value] : [] })}>
          <option value="">Any owner</option>
          {D.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <span className="text-[12.5px] text-ink-2">{count} match</span>
        <input className="field ml-auto w-44" placeholder="View name" value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <button
          type="button"
          className="btn btn-sm btn-brand"
          disabled={busy || !draft.name}
          onClick={async () => {
            const r = await write(
              "saveView",
              {
                tab,
                fields: {
                  "View Name": draft.name,
                  Object: obj,
                  Stages: draft.stages || [],
                  Sources: draft.sources || [],
                  Tiers: draft.tiers || [],
                  Industries: draft.industries || [],
                  Pipelines: draft.pipelines || [],
                  "Stage Types": draft.stageTypes || [],
                  Locations: draft.locations || "",
                  Months: draft.months || "",
                  "Close Months": draft.closeMonths || "",
                  Owners: draft.ownerIds || [],
                },
              },
              "View saved",
            );
            const id = r?.records?.[0]?.record.id;
            if (id) onSaved(id);
          }}
        >
          Save view
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setDraft(null)}>
          Cancel
        </button>
        <Com id="COM-11" />
      </div>
    </div>
  );
}
