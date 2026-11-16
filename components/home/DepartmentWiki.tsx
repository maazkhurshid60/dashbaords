"use client";

import { useState } from "react";
import { IconExternal } from "@/components/icons";
import { Modal } from "@/components/ui";
import type { Department, HomeData } from "@/lib/home-data";
import { cx } from "@/lib/utils";

type Tab = "hierarchy" | "tools" | "resources" | "goals";
const TABS: { id: Tab; label: string }[] = [
  { id: "hierarchy", label: "Hierarchy" },
  { id: "tools", label: "Related Tools" },
  { id: "resources", label: "Related Team Resources" },
  { id: "goals", label: "Goals & Work" },
];

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl bg-plane p-4 text-center text-[12px] text-muted">{text}</p>;
}

function People({ title, list, color }: { title: string; list: string[]; color: string }) {
  return (
    <div>
      <div className="field-label">{title}</div>
      {list.length ? (
        <div className="flex flex-wrap gap-2">
          {list.map((n, i) => (
            <span key={`${i}-${n}`} className="chip border-l-4" style={{ borderLeftColor: color }}>
              {n}
            </span>
          ))}
        </div>
      ) : (
        <Empty text="None linked in Airtable" />
      )}
    </div>
  );
}

/* Interim in-app Department Wiki (DEPT-3), until the client's UAT mockup arrives. */
export function DepartmentWiki({ dept, data, onClose }: { dept: Department | null; data: HomeData; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("hierarchy");
  if (!dept) return null;
  const w = dept.wiki;
  const tools = data.tools.filter((t) => dept.tools.includes(t.name));
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={
        <span className="flex items-center gap-2.5">
          <span className="h-5 w-1.5 rounded-full" style={{ background: dept.color }} />
          {dept.name} · Department Wiki
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
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Budget", w?.budget != null ? w.budget.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—"],
          ["Heads", String(w?.heads.length ?? 0)],
          ["Members", String(w?.members.length ?? dept.members ?? 0)],
          ["Goals", String(w?.goals.length ?? 0)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-plane px-3 py-2.5">
            <div className="text-[18px] font-extrabold" style={{ color: dept.color }}>
              {v}
            </div>
            <div className="text-[11px] font-semibold text-ink-2">{k}</div>
          </div>
        ))}
      </div>
      <div className="seg mb-4" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx("flex h-[30px] shrink-0 items-center rounded-full px-3.5 text-[12px] font-bold", tab === t.id ? "bg-white text-ink shadow-card" : "text-ink-2")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!w ? (
        <Empty text="Wiki content needs a live Airtable connection." />
      ) : tab === "hierarchy" ? (
        <div className="space-y-4">
          <People title="Department Head(s)" list={w.heads} color={dept.color} />
          <People title="Team Members" list={w.members} color={dept.color} />
          <div>
            <div className="field-label">Dept. Org Chart</div>
            {w.orgChart ? (
              // Airtable attachment URLs are short-lived and aren't in next/image remotePatterns.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={w.orgChart} alt={`${dept.name} org chart`} className="max-h-[420px] w-full rounded-2xl border border-line object-contain" />
            ) : (
              <Empty text="No org chart attached in Airtable" />
            )}
          </div>
        </div>
      ) : tab === "tools" ? (
        tools.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {tools.map((t) => {
              const cls = "flex items-center gap-3 rounded-2xl border border-line bg-white p-3 text-[13px] font-bold";
              const body = (
                <>
                  {t.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.logo} alt="" className="size-8 rounded-lg object-contain" />
                  ) : (
                    <span className="grid size-8 place-items-center rounded-lg text-white" style={{ background: t.color }}>
                      {t.glyph}
                    </span>
                  )}
                  {t.name}
                </>
              );
              return t.url ? (
                <a key={t.name} href={t.url} target="_blank" rel="noopener" className={cx(cls, "transition hover:shadow-card")}>
                  {body}
                </a>
              ) : (
                <div key={t.name} className={cls}>
                  {body}
                </div>
              );
            })}
          </div>
        ) : (
          <Empty text="No tools linked in the Tool Library" />
        )
      ) : tab === "resources" ? (
        w.resources.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {w.resources.map((r, i) =>
              r.href ? (
                <a key={`${i}-${r.title}`} href={r.href} target="_blank" rel="noopener" className="rounded-2xl border border-line bg-white p-3 text-[13px] font-bold transition hover:shadow-card">
                  {r.title}
                </a>
              ) : (
                <div key={`${i}-${r.title}`} className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-line bg-white p-3 text-[13px] font-bold text-ink-2">
                  {r.title}
                  <span className="rounded-full bg-plane px-2 py-0.5 text-[10px] font-bold uppercase text-muted">Link needed</span>
                </div>
              ),
            )}
          </div>
        ) : (
          <Empty text="No Employee Resources linked to this department" />
        )
      ) : (
        <div className="space-y-4">
          <div>
            <div className="field-label">Department Goals</div>
            {w.goals.length ? (
              <ul className="space-y-1.5 text-[12.5px]">
                {w.goals.map((g) => (
                  <li key={g.id} className="rounded-xl bg-plane px-3 py-2 font-semibold">
                    {g.title}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="No goals linked" />
            )}
          </div>
          <div>
            <div className="field-label">Active P.I.C.S</div>
            {w.pics.length ? (
              <ul className="space-y-1.5 text-[12.5px]">
                {w.pics.map((p, i) => (
                  <li key={`${i}-${p}`} className="rounded-xl bg-plane px-3 py-2 font-semibold">
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="No active P.I.C.S" />
            )}
          </div>
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
            Professional Development
            <span className="rounded-full bg-plane px-2 py-0.5 text-[10px] font-bold uppercase text-muted">Phase 3</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
