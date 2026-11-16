"use client";

import type { ReactNode } from "react";
import { IconExternal } from "@/components/icons";
import { Modal } from "@/components/ui";
import type { Goal } from "@/lib/home-data";

const money = (v: number | null) => (v == null ? "" : v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }));
const date = (v: string) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

function Row({ label, children }: { label: string; children: ReactNode }) {
  const empty = children == null || children === "" || (Array.isArray(children) && children.length === 0);
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-line py-2.5 text-[12.5px] last:border-0">
      <dt className="font-bold text-ink-2">{label}</dt>
      <dd className="min-w-0 text-ink">{empty ? <span className="text-muted">—</span> : children}</dd>
    </div>
  );
}

function Names({ list }: { list: string[] }) {
  if (!list.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {list.map((n, i) => (
        <span key={`${i}-${n}`} className="chip text-[11px]">
          {n}
        </span>
      ))}
    </span>
  );
}

/** HOME-2: every Goals field for one goal, plus what needs correcting in Airtable. */
export function GoalPreview({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  if (!goal) return null;
  const g = goal;
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={g.title}
      subtitle={[g.type, g.active ? "Active" : "Inactive"].filter(Boolean).join(" · ")}
      footer={
        <a href={g.url} target="_blank" rel="noopener" className="btn btn-sm">
          Airtable record <IconExternal width={13} height={13} />
        </a>
      }
    >
      {g.issues.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[#f5c08a] bg-[#fff4e8] px-4 py-3 text-[12px] text-[#a24d06]">
          <div className="font-extrabold">Data to correct in Airtable</div>
          <ul className="mt-1 list-disc pl-4">
            {g.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}
      <dl>
        <Row label="Goal">{g.title}</Row>
        <Row label="Goal Type">{g.type}</Row>
        <Row label="Active">{g.active ? "Yes" : "No"}</Row>
        <Row label="Department">
          <Names list={g.departments} />
        </Row>
        <Row label="Owner">
          <Names list={g.owners} />
        </Row>
        <Row label="Description">{g.description && <span className="whitespace-pre-line">{g.description}</span>}</Row>
        <Row label="Goal Progress">{g.progress == null ? "" : `${g.progress}%`}</Row>
        <Row label="Goal Score">{g.score == null ? "" : String(g.score)}</Row>
        <Row label="Quarter">{g.quarter}</Row>
        <Row label="Month">{g.month}</Row>
        <Row label="Year">{g.year}</Row>
        <Row label="Start Date">{date(g.start)}</Row>
        <Row label="End Date">{date(g.end)}</Row>
        <Row label="Monetary Target (Monthly)">{money(g.targetMonthly)}</Row>
        <Row label="Monetary Target (Quarterly)">{money(g.targetQuarterly)}</Row>
        <Row label="Monetary Target (Annual)">{money(g.targetAnnual)}</Row>
        <Row label="Related P.I.C.S">
          <Names list={g.pics} />
        </Row>
        <Row label="Roadmap Blocks">
          <Names list={g.roadmap} />
        </Row>
        <Row label="Related Status Reports">
          <Names list={g.reports} />
        </Row>
        <Row label="Tasks Planning">
          <Names list={g.tasks} />
        </Row>
        <Row label="Company OKRs">{g.okrs}</Row>
        <Row label="Performance Metrics">
          <Names list={g.metrics} />
        </Row>
        <Row label="Master Plans">
          <Names list={g.masterPlans} />
        </Row>
        <Row label="Professional Development">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-plane px-2 py-0.5 text-[10px] font-bold uppercase text-muted">Phase 3</span>
            {g.profDev.length > 0 && <span className="text-muted">{g.profDev.length} linked</span>}
          </span>
        </Row>
      </dl>
    </Modal>
  );
}
