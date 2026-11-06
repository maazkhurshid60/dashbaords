"use client";

/* Reports view (renderReportFilterTabs / renderReportGrid), report detail and New report modals. */
import { useState } from "react";
import { IconDoc, IconExternal, IconPlus } from "@/components/icons";
import { CardHead, Modal, useToast } from "@/components/ui";
import { todayISO } from "@/lib/pics";
import { REPORT_STATUS_TONE, periodLabel } from "@/lib/pics-reports";
import type { PicsReport } from "@/lib/pics-types";
import type { PicsRecord } from "@/lib/types";
import { cx, fmt, plural } from "@/lib/utils";
import { Field, Info, Note, Opts, ToggleChips, toggleIn } from "./pics-ui";
import { usePicsOptions } from "./PicsOptionsContext";

export function ReportStatus({ status }: { status: string }) {
  return (
    <span className={cx("inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold", REPORT_STATUS_TONE[status] ?? "bg-plane text-ink-2")}>
      {status}
    </span>
  );
}

function ReportType({ type }: { type: string }) {
  return <span className="whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">{type}</span>;
}

export function ReportsView({
  reports,
  byId,
  filter,
  setFilter,
  query,
  onOpen,
  onNew,
  onLaunchChat,
}: {
  reports: PicsReport[];
  byId: Record<string, PicsRecord>;
  filter: string;
  setFilter: (s: string) => void;
  query: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onLaunchChat: () => void;
}) {
  const o = usePicsOptions();
  const q = query.trim().toLowerCase();
  const list = reports
    .filter((r) => filter === "All" || r.status === filter)
    .filter(
      (r) =>
        !q ||
        [r.title, r.reportType, r.status, r.ant, r.preparedBy, r.reportRequest, ...r.depts, r.picsId ? byId[r.picsId]?.name ?? "" : ""].some((v) =>
          v.toLowerCase().includes(q),
        ),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <section className="card p-5 sm:p-6">
        <CardHead
          icon={<IconDoc width={20} height={20} />}
          eyebrow={`Operations · ${filter === "All" ? "All statuses" : filter}${q ? ` · “${query.trim()}”` : ""}`}
          title="Reports"
          right={
            <>
              <button type="button" className="btn btn-sm" onClick={onLaunchChat}>
                ✦ Launch report build
              </button>
              <button type="button" className="btn btn-brand btn-sm" onClick={onNew}>
                <IconPlus width={14} height={14} /> New report
              </button>
            </>
          }
        />
        <div className="mt-5 max-w-full">
          <div className="seg" role="group" aria-label="Filter reports by status">
            {["All", ...o.reportStatus].map((t) => (
              <button key={t} type="button" aria-pressed={filter === t} onClick={() => setFilter(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {list.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {list.map((r) => {
              const pics = r.picsId ? byId[r.picsId] : undefined;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex min-w-0 flex-col rounded-2xl border border-line p-4 text-left transition hover:-translate-y-0.5 hover:border-line-2 hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[14px] font-extrabold leading-snug">{r.title}</span>
                    <ReportType type={r.reportType} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.depts.map((d) => (
                      <span key={d} className="chip">
                        {d}
                      </span>
                    ))}
                    {pics && <span className="chip bg-brand-soft text-brand">{pics.name}</span>}
                    {r.ant && <span className="chip bg-teal-soft text-teal">{r.ant}</span>}
                    <span className="chip">{plural(r.productivityTasks, "Productivity Center task")}</span>
                    {r.deliveryLink && (
                      <span className="chip" title={r.deliveryLink}>
                        🔗 Report URL
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
                    <span className="text-[11px] text-muted">
                      {periodLabel(r)} · {fmt(r.date)} · Prepared by {r.preparedBy}
                    </span>
                    <ReportStatus status={r.status} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-plane p-8 text-center text-[13px] text-muted">No reports match this filter.</div>
        )}
      </section>
      <p className="px-1 text-[11.5px] leading-relaxed text-muted">
        Reporting mirrors entries from the Master Reports table, cross-referenced with the ANT Connector and Productivity Center tables. Edits save to this
        session only — writing back to the live Airtable base needs a connected sync.
      </p>
    </>
  );
}

export function ReportDetailModal({ report: r, pics, onClose }: { report: PicsReport; pics?: PicsRecord; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={r.title}
      subtitle={
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <ReportType type={r.reportType} />
          <ReportStatus status={r.status} />
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Info label="Reporting period">{periodLabel(r)}</Info>
        <Info label="Prepared by">{r.preparedBy}</Info>
        <Info label="Date created">{fmt(r.date)}</Info>
      </div>
      <div className="mt-3 grid gap-3">
        <Info label="Related department(s)">{r.depts.join(", ") || "—"}</Info>
        {pics && <Info label="Related P.I.C.S">{pics.name}</Info>}
        {r.ant && <Info label="Related ANT">{r.ant}</Info>}
        {r.audience?.length > 0 && <Info label="Report audience">{r.audience.join(", ")}</Info>}
        {r.reportRequest && (
          <Info label="Report request">
            <span className="font-medium text-ink-2">{r.reportRequest}</span>
          </Info>
        )}
        <Info label="Report URL (delivery link)">
          {r.deliveryLink ? (
            <a href={r.deliveryLink} target="_blank" rel="noopener" className="inline-flex items-center gap-1 break-all text-brand hover:underline">
              {r.deliveryLink} <IconExternal width={13} height={13} className="shrink-0" />
            </a>
          ) : (
            "No delivery link on file yet."
          )}
        </Info>
        <Info label="Approved">{r.approved ? "Yes" : "Not yet"}</Info>
      </div>
      <Note>Read-only view mirrored from the Master Reports table — also visible in the ANT Connector and Productivity Center dashboards.</Note>
    </Modal>
  );
}

export function NewReportModal({
  records,
  live = false,
  onClose,
  onCreate,
}: {
  records: PicsRecord[];
  live?: boolean;
  onClose: () => void;
  onCreate: (r: PicsReport) => void;
}) {
  const toast = useToast();
  const o = usePicsOptions();
  const [f, setF] = useState({
    title: "",
    reportType: o.reportTypes[0] ?? "",
    status: o.reportStatus.includes("Not Started") ? "Not Started" : (o.reportStatus[0] ?? ""),
    period: o.reportPeriods.includes("Weekly") ? "Weekly" : (o.reportPeriods[0] ?? ""),
    week: o.weekNumbers[0] ?? "1",
    picsId: "",
    ant: "",
    preparedBy: "",
    reportRequest: "",
    deliveryLink: "",
  });
  const [depts, setDepts] = useState<string[]>(() => (o.departments.includes("Operations") ? ["Operations"] : []));
  const [audience, setAudience] = useState<string[]>(() => o.reportAudience.slice(0, 1));
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const title = f.title.trim();
    if (!title) {
      toast("Add a report title before saving.");
      return;
    }
    if (!depts.length) {
      toast("Select at least one related department.");
      return;
    }
    onCreate({
      id: `r_new_${Date.now()}`,
      title,
      reportType: f.reportType,
      picsId: f.picsId || null,
      ant: f.ant.trim(),
      depts: [...depts],
      period: f.period,
      weekNumbers: [f.week],
      audience: [...audience],
      productivityTasks: 0,
      date: todayISO(),
      status: f.status,
      preparedBy: f.preparedBy.trim() || "—",
      reportRequest: f.reportRequest.trim(),
      deliveryLink: f.deliveryLink.trim(),
      approved: f.status === "Approved",
    });
    if (!live) toast("Report added to Master Reports (session only — not yet synced to Airtable)");
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New report"
      subtitle="Adds to the Master Reports table — visible here, in the ANT Connector, and the Productivity Center"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-brand" onClick={submit}>
            Add report
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Report title">
          <input className="field" value={f.title} placeholder="e.g. Sprint 4 Status Recap" onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Report type">
            <select className="field" value={f.reportType} onChange={(e) => set("reportType", e.target.value)}>
              <Opts list={o.reportTypes} />
            </select>
          </Field>
          <Field label="Status">
            <select className="field" value={f.status} onChange={(e) => set("status", e.target.value)}>
              <Opts list={o.reportStatus} />
            </select>
          </Field>
          <Field label="Reporting period">
            <select className="field" value={f.period} onChange={(e) => set("period", e.target.value)}>
              <Opts list={o.reportPeriods} />
            </select>
          </Field>
          <Field label="Week number">
            <select className="field" value={f.week} onChange={(e) => set("week", e.target.value)}>
              <Opts list={o.weekNumbers} />
            </select>
          </Field>
        </div>
        <ToggleChips label="Related department(s)" options={o.departments} selected={depts} onToggle={(d) => setDepts((p) => toggleIn(p, d))} />
        <ToggleChips label="Report audience" options={o.reportAudience} selected={audience} onToggle={(a) => setAudience((p) => toggleIn(p, a))} />
        <Field label="Related P.I.C.S">
          <select className="field" value={f.picsId} onChange={(e) => set("picsId", e.target.value)}>
            <option value="">None</option>
            {records.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Related ANT">
            <input className="field" value={f.ant} placeholder="e.g. OPANT" onChange={(e) => set("ant", e.target.value)} />
          </Field>
          <Field label="Prepared by (initials)">
            <input className="field" value={f.preparedBy} placeholder="e.g. ID" onChange={(e) => set("preparedBy", e.target.value)} />
          </Field>
        </div>
        <Field label="Report request">
          <textarea className="field" rows={2} value={f.reportRequest} placeholder="What should this report cover?" onChange={(e) => set("reportRequest", e.target.value)} />
        </Field>
        <Field label="Report URL (delivery link)">
          <input type="url" className="field" value={f.deliveryLink} placeholder="https://…" onChange={(e) => set("deliveryLink", e.target.value)} />
        </Field>
      </div>
      <Note>
        {live
          ? "Creates the report in the Airtable Master Reports table (Created Via: Dashboard form). Prepared-by initials and ANT names are linked when they match; Master Reports has no P.I.C.S field, so “Related P.I.C.S” is kept on this dashboard only."
          : "Saves to this session only. Airtable is unavailable (snapshot data), so nothing is written to the base."}
      </Note>
    </Modal>
  );
}

