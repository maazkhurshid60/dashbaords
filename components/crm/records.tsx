"use client";

import { useState } from "react";
import { daysIn, fmtDate, isOpenOpp, money, prob, probFrac, stageOf } from "@/lib/crm-logic";
import type { Company, Contact, CrmData, Opp } from "@/lib/crm-types";
import { ActivityList, Chip, Com, DetailsCard, Drawer, Empty, H, LogActivity, TaskList, type FieldSpec } from "./bits";
import { useCrm, type NewWhat } from "./store";

type Opts = (k: string) => string[];

/* ---------------------------------------------------------------- field specs (same for card + New form, COM-3/25) */
export const contactSpecs = (c: Partial<Contact>, o: Opts): FieldSpec[] => [
  { label: "Name", field: "Name", type: "text", value: c.name ?? "" },
  { label: "Email", field: "Email", type: "email", value: c.email ?? "" },
  { label: "Phone", field: "Phone", type: "text", value: c.phone ?? "" },
  { label: "Organization", field: "Outlet / Organization", type: "text", value: c.org ?? "" },
  { label: "Role / title", field: "Role / Title", type: "text", value: c.title ?? "" },
  { label: "Company", field: "Company", type: "company", value: c.companyIds ?? [] },
  { label: "Stage", field: "Lifecycle Stage", type: "select", value: c.stage ?? "", options: o("Contacts.Lifecycle Stage") },
  { label: "📍 Location", field: "Location", type: "text", value: c.location ?? "" },
  { label: "Source", field: "Lead Source", type: "select", value: c.source ?? "", options: o("Contacts.Lead Source") },
  { label: "Lead score", field: "Lead Score", type: "number", value: c.score ?? null },
  { label: "Owner", field: "Owner", type: "member", value: c.ownerIds ?? [] },
  { label: "Relationship", field: "Relationship", type: "select", value: c.relationship ?? "", options: o("Contacts.Relationship") },
  { label: "Tags", field: "Tags", type: "multi", value: c.tags ?? [], options: o("Contacts.Tags") },
  { label: "Last contacted", field: "Last Contacted", type: "date", value: c.lastContacted ?? "" },
  { label: "Social", field: "Social Handle", type: "text", value: c.social ?? "" },
  { label: "Website", field: "Website", type: "url", value: c.website ?? "" },
  { label: "Notes", field: "Notes", type: "textarea", value: c.notes ?? "" },
];

export const contractorSpecs = (c: Partial<Contact>, o: Opts): FieldSpec[] => [
  { label: "Name", field: "Name", type: "text", value: c.name ?? "" },
  { label: "Email", field: "Email", type: "email", value: c.email ?? "" },
  { label: "Role", field: "Role / Title", type: "text", value: c.title ?? "" },
  { label: "Status", field: "Contractor Status", type: "select", value: c.contractorStatus ?? "", options: o("Contacts.Contractor Status") },
  { label: "Engagement", field: "Engagement Type", type: "select", value: c.engagement ?? "", options: o("Contacts.Engagement Type") },
  { label: "Team member", field: "Team Member", type: "member", value: c.teamMemberIds ?? [] },
  { label: "📍 Location", field: "Location", type: "text", value: c.location ?? "" },
  { label: "Notes", field: "Notes", type: "textarea", value: c.notes ?? "" },
];

export const companySpecs = (c: Partial<Company>, o: Opts): FieldSpec[] => [
  { label: "Company", field: "Company Name", type: "text", value: c.name ?? "" },
  { label: "Type", field: "Industry", type: "select", value: c.industry ?? "", options: o("Companies.Industry") },
  { label: "Tier", field: "Tier", type: "select", value: c.tier ?? "", options: o("Companies.Tier") },
  { label: "Size", field: "Size", type: "text", value: c.size ?? "" },
  { label: "📍 City", field: "City", type: "text", value: c.city ?? "" },
  { label: "Website", field: "Website", type: "url", value: c.website ?? "" },
  { label: "Owner", field: "Owner", type: "member", value: c.ownerIds ?? [] },
  { label: "Notes", field: "Notes", type: "textarea", value: c.notes ?? "" },
];

export const oppSpecs = (x: Partial<Opp>, o: Opts, D: CrmData): FieldSpec[] => [
  { label: "Opportunity", field: "Opportunity Name", type: "text", value: x.name ?? "" },
  { label: "Pipeline", field: "Pipeline", type: "select", value: x.pipeline ?? "", options: o("Opportunities.Pipeline").length ? o("Opportunities.Pipeline") : D.pipelines.map((p) => p.name) },
  { label: "Stage", field: "Pipeline Stage", type: "stage", value: x.stageId ? [x.stageId] : [] },
  { label: "Value", field: "Value", type: "number", value: x.value ?? null, display: money(x.value) },
  { label: "Close date", field: "Close Date", type: "date", value: x.closeDate ?? "" },
  { label: "Next step", field: "Next Step", type: "text", value: x.nextStep ?? "" },
  { label: "Next step due", field: "Next Step Date", type: "date", value: x.nextStepDate ?? "" },
  { label: "Primary contact", field: "Primary Contact", type: "contact", value: x.contactIds ?? [] },
  { label: "Company", field: "Company", type: "company", value: x.companyIds ?? [] },
  { label: "Owner", field: "Owner", type: "member", value: x.ownerIds ?? [] },
  { label: "Plan", field: "Plan", type: "select", value: x.plan ?? "", options: o("Opportunities.Plan") },
  { label: "Lost reason", field: "Lost Reason", type: "select", value: x.lostReason ?? "", options: o("Opportunities.Lost Reason") },
];

/* ---------------------------------------------------------------- contact drawer (COM-9) */
export function ContactDrawer({ id }: { id: string }) {
  const { D, setPanel, write, opts, name, me } = useCrm();
  const c = D.contacts.find((x) => x.id === id);
  const [log, setLog] = useState<null | "Call" | "Note">(null);
  if (!c) return null;
  const contractor = c.stage === "Contractor";
  const opps = D.opps.filter((o) => o.contactIds.includes(c.id) || c.oppIds.includes(o.id));
  const msgs = D.msgs.filter((m) => m.contactIds.includes(c.id));
  const following = !!me && c.followedByIds.includes(me.id);
  const close = () => setPanel(null);
  return (
    <Drawer
      title={c.name || c.email || "Contact"}
      sub={[c.title, c.org, c.email].filter(Boolean).join(" · ")}
      onClose={close}
      actions={
        <>
          {c.email && (
            <a className="btn btn-sm" href={`mailto:${c.email}`}>
              ✉ Email
            </a>
          )}
          <button type="button" className="btn btn-sm" onClick={() => setLog("Call")}>
            Log call
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setLog("Note")}>
            Add note
          </button>
          {!contractor && (
            <button type="button" className="btn btn-sm" onClick={() => setPanel({ kind: "new", what: "Opportunity", prefill: { "Primary Contact": [c.id], Company: c.companyIds } })}>
              ＋ Opportunity
            </button>
          )}
          {me && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => write("saveContact", { id: c.id, fields: { "Followed By": following ? c.followedByIds.filter((x) => x !== me.id) : [...c.followedByIds, me.id] } }, following ? "Unfollowed" : "Following")}
            >
              {following ? "★ Following" : "☆ Follow"}
            </button>
          )}
          <Com id="COM-9" />
        </>
      }
    >
      {log && <LogActivity type={log} tab="Contacts" link={{ contactIds: [c.id] }} onDone={() => setLog(null)} />}
      <DetailsCard key={c.id} specs={contractor ? contractorSpecs(c, opts) : contactSpecs(c, opts)} onSave={async (f) => !!(await write("saveContact", { id: c.id, fields: f }))?.ok} />
      {contractor ? (
        <section className="flex flex-wrap gap-1.5 text-[12.5px]">
          {c.deptIds.map((d) => (
            <Chip key={d}>{name(d)}</Chip>
          ))}
        </section>
      ) : (
        <>
          <section>
            <H>Opportunities ({opps.length})</H>
            {opps.length ? <OppMiniList opps={opps} /> : <Empty>No opportunities yet.</Empty>}
          </section>
          {c.companyIds.length ? (
            <section>
              <H>Company</H>
              {c.companyIds.map((cid) => (
                <button key={cid} type="button" className="btn btn-sm" onClick={() => setPanel({ kind: "company", id: cid })}>
                  {name(cid)}
                </button>
              ))}
            </section>
          ) : null}
          <section>
            <H>Messages ({msgs.length})</H>
            {msgs.slice(0, 8).map((m) => (
              <div key={m.id} className="flex gap-2 border-b border-line py-1.5 text-[13px]">
                <span className="flex-1 truncate">{m.subject || "(no subject)"}</span>
                <span className="text-muted">{fmtDate(m.date)}</span>
              </div>
            ))}
            {!msgs.length && <Empty>No messages linked.</Empty>}
          </section>
        </>
      )}
      <TaskList tab="Contacts" tasks={D.tasks.filter((t) => t.contactIds.includes(c.id) || (contractor && c.teamMemberIds.some((m) => t.assigneeIds.includes(m))))} link={{ contactIds: [c.id], picsIds: c.picsIds }} />
      <section>
        <H>Activity</H>
        <ActivityList items={D.activities.filter((a) => a.contactIds.includes(c.id))} />
      </section>
    </Drawer>
  );
}

export function OppMiniList({ opps }: { opps: Opp[] }) {
  const { D, setPanel, name } = useCrm();
  return (
    <ul className="space-y-1.5">
      {opps.map((o) => (
        <li key={o.id}>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-[13px] hover:border-brand" onClick={() => setPanel({ kind: "opp", id: o.id })}>
            <span className="flex-1 truncate font-semibold">{o.name}</span>
            <Chip>{o.pipeline}</Chip>
            <Chip tone={isOpenOpp(o, D.stages) ? "brand" : "gray"}>{stageOf(o, D.stages)?.name || o.stage || "No stage"}</Chip>
            <span className="text-ink-2">{money(o.value)}</span>
            {o.ownerIds[0] ? <span className="text-muted">{name(o.ownerIds[0])}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- company drawer */
export function CompanyDrawer({ id }: { id: string }) {
  const { D, setPanel, write, opts } = useCrm();
  const c = D.companies.find((x) => x.id === id);
  if (!c) return null;
  const people = D.contacts.filter((p) => p.companyIds.includes(c.id) || c.contactIds.includes(p.id));
  const opps = D.opps.filter((o) => o.companyIds.includes(c.id));
  return (
    <Drawer title={c.name} sub={[c.industry, c.city].filter(Boolean).join(" · ")} onClose={() => setPanel(null)}>
      <DetailsCard key={c.id} specs={companySpecs(c, opts)} onSave={async (f) => !!(await write("saveCompany", { id: c.id, fields: f }))?.ok} />
      <section>
        <H>People ({people.length})</H>
        <div className="flex flex-wrap gap-1.5">
          {people.map((p) => (
            <Chip key={p.id} tone="brand" onClick={() => setPanel({ kind: "contact", id: p.id })}>
              {p.name || p.email}
            </Chip>
          ))}
        </div>
        {!people.length && <Empty>No people linked.</Empty>}
      </section>
      <section>
        <H>Opportunities</H>
        {opps.length ? <OppMiniList opps={opps} /> : <Empty>No opportunities.</Empty>}
      </section>
    </Drawer>
  );
}

/* ---------------------------------------------------------------- stage move (COM-14/15) */
export function useStageMove() {
  const { D, write } = useCrm();
  return async (o: Opp, stageId: string, lostReason?: string) => {
    const st = D.stages.find((s) => s.id === stageId);
    if (!st || st.id === o.stageId) return;
    const fields: Record<string, unknown> = { "Pipeline Stage": [st.id] };
    if (st.type === "Lost") {
      if (!lostReason) return "need-reason";
      fields["Lost Reason"] = lostReason;
    }
    await write("saveDeal", { id: o.id, fields, stageName: st.name }, st.type === "Won" ? "Won! Posted to Updates" : `Moved to ${st.name}`);
  };
}

export function StagePath({ o }: { o: Opp }) {
  const { D, opts, busy } = useCrm();
  const move = useStageMove();
  const [askLost, setAskLost] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const cur = stageOf(o, D.stages);
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {D.stages.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={async () => {
              if ((await move(o, s.id)) === "need-reason") setAskLost(s.id);
            }}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              cur?.id === s.id ? (s.type === "Won" ? "bg-good text-white" : s.type === "Lost" ? "bg-bad text-white" : "bg-brand text-white") : (cur && s.order < cur.order ? "bg-brand-soft text-brand" : "bg-plane text-ink-2") + " hover:bg-lav"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      {askLost && (
        <div className="mt-2 flex gap-2 rounded-lg bg-bad-soft p-2">
          <select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Why was it lost?</option>
            {opts("Opportunities.Lost Reason").map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-sm btn-dark"
            disabled={!reason}
            onClick={async () => {
              await move(o, askLost, reason);
              setAskLost(null);
            }}
          >
            Mark lost
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setAskLost(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- opportunity drawer (COM-14) */
export function OppDrawer({ id }: { id: string }) {
  const { D, setPanel, write, opts, name } = useCrm();
  const o = D.opps.find((x) => x.id === id);
  const [log, setLog] = useState<null | "Call" | "Note">(null);
  if (!o) return null;
  const st = stageOf(o, D.stages);
  const p = prob(o, D.stages);
  return (
    <Drawer
      wide
      title={o.name}
      sub={[o.pipeline, o.companyIds.map(name).join(", ")].filter(Boolean).join(" · ")}
      onClose={() => setPanel(null)}
      actions={
        <>
          <button type="button" className="btn btn-sm" onClick={() => setLog("Call")}>
            Log call
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setLog("Note")}>
            Add note
          </button>
          <Com id="COM-14" />
        </>
      }
    >
      <StagePath o={o} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Value", money(o.value)],
          ["Probability", `${Math.round(probFrac(p) * 100)}%`],
          ["Close", o.closeDate ? fmtDate(o.closeDate) : "—"],
          ["Owner", o.ownerIds.map(name).join(", ") || "—"],
        ].map(([l, v]) => (
          <div key={l} className="card px-3 py-2">
            <div className="text-[11px] font-semibold text-muted">{l}</div>
            <div className="truncate text-[14px] font-bold">{v}</div>
          </div>
        ))}
      </div>
      {st?.guidance ? (
        <section className="rounded-xl bg-brand-soft p-3 text-[13px]">
          <div className="mb-1 font-bold text-brand">How to win this stage</div>
          <p className="whitespace-pre-wrap text-ink-2">{st.guidance}</p>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2 text-[12.5px] text-ink-2">
        {daysIn(o) != null && <Chip tone={o.stale ? "bad" : "gray"}>{daysIn(o)} days in stage{o.stale ? " · stale" : ""}</Chip>}
        {o.picsIds.map((pid) => (
          <Chip key={pid} tone="teal">
            ◆ {name(pid)}
          </Chip>
        ))}
      </div>
      {log && <LogActivity type={log} tab="Pipelines" link={{ oppIds: [o.id], contactIds: o.contactIds }} onDone={() => setLog(null)} />}
      <TaskList tab="Pipelines" tasks={D.tasks.filter((t) => t.oppIds.includes(o.id))} link={{ oppIds: [o.id], contactIds: o.contactIds, picsIds: o.picsIds }} />
      <section>
        <H>People + company</H>
        <div className="flex flex-wrap gap-1.5">
          {o.contactIds.map((c) => (
            <Chip key={c} tone="brand" onClick={() => setPanel({ kind: "contact", id: c })}>
              {name(c)}
            </Chip>
          ))}
          {o.companyIds.map((c) => (
            <Chip key={c} tone="teal" onClick={() => setPanel({ kind: "company", id: c })}>
              {name(c)}
            </Chip>
          ))}
          {!o.contactIds.length && !o.companyIds.length && <span className="text-[13px] text-muted">Nobody linked yet.</span>}
        </div>
      </section>
      <DetailsCard key={o.id} specs={oppSpecs(o, opts, D)} onSave={async (f) => !!(await write("saveDeal", { id: o.id, fields: f, stageName: f["Pipeline Stage"] ? name((f["Pipeline Stage"] as string[])[0]) : "" }))?.ok} />
      <section>
        <H>Activity</H>
        <ActivityList items={D.activities.filter((a) => a.oppIds.includes(o.id))} />
      </section>
    </Drawer>
  );
}

/* ---------------------------------------------------------------- ＋ New (COM-3) */
export function NewDrawer({ what, prefill }: { what: NewWhat; prefill?: Record<string, unknown> }) {
  const { D, setPanel, write, opts, isAdmin } = useCrm();
  const close = () => setPanel(null);
  const withPre = (specs: FieldSpec[]) => specs.map((s) => (prefill && s.field in prefill ? { ...s, value: prefill[s.field] } : s));
  const done = (kind: "contact" | "company" | "opp") => (r: { ok: boolean; records?: { record: { id: string } }[] } | null) => {
    const nid = r?.records?.[0]?.record.id;
    if (r?.ok && nid) setPanel({ kind, id: nid });
    return !!r?.ok;
  };
  if (what === "Task") {
    return (
      <Drawer title="New task or follow-up" onClose={close}>
        <TaskListNew prefill={prefill} />
      </Drawer>
    );
  }
  if (what === "Update") {
    return (
      <Drawer title="New update" onClose={close}>
        {isAdmin ? <p className="text-[13px]">Use the composer on the Updates tab.</p> : <Empty>Only admins post updates.</Empty>}
      </Drawer>
    );
  }
  const map = {
    Contact: { specs: withPre(contactSpecs({}, opts)), action: "saveContact", kind: "contact" as const, extra: {} },
    Contractor: { specs: withPre(contractorSpecs({}, opts)), action: "saveContact", kind: "contact" as const, extra: { "Lifecycle Stage": "Contractor" } },
    Company: { specs: withPre(companySpecs({}, opts)), action: "saveCompany", kind: "company" as const, extra: {} },
    Opportunity: {
      specs: withPre(oppSpecs({ stageId: D.stages[0]?.id }, opts, D)).filter((s) => s.field !== "Lost Reason"),
      action: "saveDeal",
      kind: "opp" as const,
      extra: {},
    },
  }[what];
  return (
    <Drawer title={`New ${what.toLowerCase()}`} sub="Saved straight to Airtable" onClose={close}>
      <DetailsCard
        title={what}
        startEditing
        specs={map.specs}
        onSave={async (f) => {
          const all = { ...Object.fromEntries(map.specs.map((s) => [s.field, s.value])), ...f, ...map.extra };
          const fields = Object.fromEntries(Object.entries(all).filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length)));
          return done(map.kind)(await write(map.action, { fields, stageName: what === "Opportunity" ? "" : undefined }, `${what} created`));
        }}
      />
    </Drawer>
  );
}

function TaskListNew({ prefill }: { prefill?: Record<string, unknown> }) {
  const p = prefill || {};
  const ids = (k: string) => (Array.isArray(p[k]) ? (p[k] as string[]) : []);
  return <TaskList tab="Header" tasks={[]} link={{ contactIds: ids("contactIds"), oppIds: ids("oppIds"), msgIds: ids("msgIds"), picsIds: ids("picsIds") }} />;
}
