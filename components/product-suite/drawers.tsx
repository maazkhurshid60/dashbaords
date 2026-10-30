"use client";

/* featureDrawer / manageDrawer / findingDrawer / clDrawer / noteDrawer */
import { useState, type ReactNode } from "react";
import { AT, atUrl } from "@/lib/product-data";
import { cx } from "@/lib/utils";
import { ago, fmt$, fmtD, shortPics, STAGE } from "./format";
import {
  CL_GROUPS, clByKey, clClean, featPerf, isLate, roadRows, todayIso, type Checklist,
} from "./logic";
import {
  AirtableLink, Empty, H5, Help, Item, Kpi, MoodPill, PDot, Pill, SentPill, Seg, StagePill, StatusPill2, Small, TONE_PILL,
} from "./primitives";
import { Sheet } from "./Sheet";
import { useSuite } from "./useSuite";

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="field-label">
        {label}
        {help && <Help t={help} />}
      </span>
      {children}
    </label>
  );
}

/* ---------------- feature ---------------- */
export function FeatureDrawer() {
  const { D, S, drawer, closeAll, has, act } = useSuite();
  const f = drawer?.kind === "feature" ? D.features.find((x) => x.id === drawer.id) : undefined;
  if (!f) return null;
  const p = featPerf(D, S.segment, f);
  const notes = D.feedback.filter((x) => x.feature === f.id);
  const pr = p.pics ? roadRows(D, p.pics.id) : [];
  const mini: [ReactNode, string][] = [];
  if (has("Accounts (Reference).Features Used")) mini.push([p.users || "—", "customers use it"]);
  mini.push([f.status === "Live" ? <MoodPill m={p.mood} /> : <span className="text-[12px] text-muted">Not live yet</span>, "how they feel"]);
  mini.push([p.notes || "0", "feedback notes"]);
  if (has("Accounts (Reference).Features Used", "Accounts (Reference).MRR")) mini.push([p.rev ? fmt$(p.rev) : "—", "monthly revenue from users"]);
  return (
    <Sheet
      open
      onClose={closeAll}
      title={f.name}
      sub={
        <>
          {has("Product Features.Product Area") && <span>{f.area} ·</span>}
          <StagePill s={f.status} />
        </>
      }
      footer={
        <>
          <AirtableLink href={atUrl(AT.features.id, f.id)} />
          <button type="button" className="btn btn-brand" onClick={closeAll}>
            Done
          </button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-2">{f.core || ""}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {mini.map(([a, b]) => (
          <div key={b} className="rounded-2xl bg-plane p-3">
            <div className="text-[18px] font-extrabold">{a}</div>
            <Small>{b}</Small>
          </div>
        ))}
      </div>
      <Field label="Stage" help="Changing this updates Product Features in Airtable">
        <select className="field" value={f.status} onChange={(e) => act.fstatus(f.id, e.target.value)}>
          {["Backlog", "In Discovery", "In Development", "QA", "Live", "Deprecated"].map((x) => (
            <option key={x} value={x}>
              {STAGE[x]}
            </option>
          ))}
        </select>
      </Field>
      <H5>Who it&apos;s for</H5>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
        {f.personas.length ? (
          f.personas.map((x) => (
            <span key={x} className="flex items-center gap-1.5">
              <PDot name={x} /> {x}
            </span>
          ))
        ) : (
          <Small>No personas linked</Small>
        )}
      </div>
      <H5>On the roadmap · Product Backlogs → P.I.C.S</H5>
      {p.pics ? (
        <>
          <div className="text-[12.5px]">
            <b>{shortPics(p.pics.name)}</b> · {fmtD(p.pics.start)} – {fmtD(p.pics.end)}
          </div>
          {pr.slice(0, 4).map((r, i) => (
            <Item key={i} d={fmtD(r.date)} right={<StatusPill2 s={isLate(r) ? "At Risk" : r.status} />}>
              {r.label}
            </Item>
          ))}
        </>
      ) : (
        <Small>Not scheduled in P.I.C.S Roadmaps yet.</Small>
      )}
      <H5>What customers said ({notes.length})</H5>
      {notes.length ? (
        notes.slice(0, 8).map((n) => (
          <button key={n.id} type="button" onClick={() => act.note(n.id)} className="mb-2 block w-full rounded-2xl bg-plane px-3 py-2.5 text-left hover:bg-lav/50">
            <Small>
              {n.account} · {fmtD(n.date)}
            </Small>
            <div className="mt-0.5 text-[12.5px] text-ink">{n.summary}</div>
          </button>
        ))
      ) : (
        <Small>No feedback linked yet</Small>
      )}
    </Sheet>
  );
}

/* ---------------- manage site updates ---------------- */
export function ManageDrawer() {
  const { D, drawer, closeAll, act } = useSuite();
  if (drawer?.kind !== "manage") return null;
  const deps = D.site.deployments || [];
  return (
    <Sheet
      open
      onClose={closeAll}
      title="Manage site updates"
      sub="Only needed if something on the live site broke."
      footer={
        <>
          <AirtableLink href="https://vercel.com/dashboard" label="Vercel" />
          <button type="button" className="btn btn-brand" onClick={closeAll}>
            Close
          </button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-2">
        <b>Redeploy</b> rebuilds the current live version. <b>Roll back</b> puts an older version back on the live site. <b>Promote</b> takes a test
        copy and makes it live. Each one asks you to type ACRYLICS first and is recorded in Releases &amp; Deployment Log.
      </p>
      <button type="button" className="btn btn-brand mb-3 mt-4" onClick={() => act.deploy("redeploy")}>
        Redeploy live site
      </button>
      {deps.map((d) => (
        <Item
          key={d.id}
          d={ago(d.createdAt)}
          right={
            <>
              <StatusPill2 s={d.state} />
              {d.state === "READY" && !d.current ? (
                <button type="button" className="btn btn-sm" onClick={() => act.deploy(d.target === "production" ? "rollback" : "promote", d.id)}>
                  {d.target === "production" ? "Roll back" : "Promote"}
                </button>
              ) : d.current ? (
                <Pill tone="good">Current</Pill>
              ) : null}
            </>
          }
        >
          <b>{d.message}</b>
          <Small>
            {d.target === "production" ? "Live site" : "Test copy"} · {d.commit}
          </Small>
        </Item>
      ))}
    </Sheet>
  );
}

/* ---------------- PRANT sweep finding ---------------- */
export function FindingDrawer() {
  const { D, drawer } = useSuite();
  const f = drawer?.kind === "finding" ? (D.sweep?.findings || []).find((x) => x.id === drawer.id) : undefined;
  if (!f) return null;
  return <FindingBody key={f.id + f.status} id={f.id} />;
}
function FindingBody({ id }: { id: string }) {
  const { D, closeAll, has, act } = useSuite();
  const f = (D.sweep?.findings || []).find((x) => x.id === id)!;
  const [notes, setNotes] = useState(f.notes || "");
  const [who, setWho] = useState("");
  const canPerson = has("IT & Systems Registry.Fix Task");
  const assigned = f.antReqs.length
    ? `ANT Request “${f.antReqs[0].title}” → ${f.antReqs[0].ant || "ANT"}`
    : f.task
      ? `Tasks Planning “${f.task.name}” → ${f.task.assignee}`
      : "";
  const kv: [string, ReactNode][] = [
    [
      "Severity",
      <span key="s" className="flex flex-wrap items-center gap-2">
        <Pill tone={f.sev === "High" ? "bad" : f.sev === "Medium" ? "warn" : "plain"}>{f.sev}</Pill>
        <Small>from Health/Build Status: {f.health}</Small>
      </span>,
    ],
    ["Page", f.page || "—"],
    ["Environment", f.env || "—"],
    ["Sync status", f.sync || "—"],
    [
      "Tags",
      (f.tags || []).length ? (
        <span key="t" className="flex flex-wrap gap-1">
          {f.tags.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </span>
      ) : (
        "—"
      ),
    ],
  ];
  if (assigned) kv.push(["Assigned", assigned]);
  return (
    <Sheet
      open
      onClose={closeAll}
      title={f.asset}
      sub={[f.type, f.env, "swept " + fmtD(f.swept)].filter(Boolean).join(" · ")}
      footer={
        <>
          <AirtableLink href={atUrl(AT.registry.id, f.id)} />
          <button type="button" className="btn" onClick={() => void act.fixNotes(f.id, notes)}>
            Save notes
          </button>
          {f.status !== "Dismissed" && f.status !== "Assigned" && (
            <button type="button" className="btn bg-bad-soft text-bad hover:bg-bad-soft" onClick={() => void act.fixDismiss(f.id)}>
              Dismiss
            </button>
          )}
          {f.status !== "Assigned" && (
            <button type="button" className="btn btn-brand" onClick={() => void act.fixApprove(f.id, who, notes)}>
              Approve fix &amp; assign
            </button>
          )}
        </>
      }
    >
      <H5 first>What PRANT found</H5>
      <p className="text-[14px] leading-relaxed text-ink">{f.fix}</p>
      <dl className="mt-4 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2 text-[12.5px]">
        {kv.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-bold text-muted">{k}</dt>
            <dd className="min-w-0">{v}</dd>
          </div>
        ))}
      </dl>
      <Field label="Notes for the fix" help="Saved to the Notes field on this IT & Systems Registry record and copied into the ANT Request or task">
        <textarea className="field min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What exactly should be fixed, links, acceptance criteria…" />
      </Field>
      <Field label="Fix assignee">
        <select className="field" value={who} onChange={(e) => setWho(e.target.value)} disabled={f.status === "Assigned"}>
          <option value="">— Choose who fixes it —</option>
          <optgroup label="ANTs · creates an ANT Request">
            {(D.ants || []).map((a) => (
              <option key={a.id} value={`ant:${a.id}`}>
                {a.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={`Team members · creates a Tasks Planning task${canPerson ? "" : " (needs Fix Task field)"}`}>
            {(D.team || []).map((t) => (
              <option key={t.id} value={`person:${t.id}`} disabled={!canPerson}>
                {t.name}
              </option>
            ))}
          </optgroup>
        </select>
      </Field>
      <Small className="mt-3">Approving saves your notes, then creates the work item and links it back to this finding.</Small>
    </Sheet>
  );
}

/* ---------------- checklist (P.I.C.S Checklist) ---------------- */
export function ClDrawer() {
  const { D, drawer } = useSuite();
  if (drawer?.kind !== "cl") return null;
  const cl = clByKey(D, drawer.key);
  if (!cl) return null;
  return <ClBody cl={cl} />;
}
function ClBody({ cl }: { cl: Checklist }) {
  const { S, closeAll, act } = useSuite();
  const f = S.clFilter || "All";
  const pc = cl.st.total ? Math.round((100 * cl.st.done) / cl.st.total) : 0;
  const keep = (c: Checklist["items"][number]) =>
    f === "All" ||
    (f === "To do" && c.status !== "Completed") ||
    (f === "Late" && c.status !== "Completed" && !!c.due && c.due < todayIso) ||
    (f === "Done" && c.status === "Completed");
  const groups: Record<string, Checklist["items"]> = {};
  cl.items.filter(keep).forEach((c) => {
    const k = cl.coded ? c.item[0] : "";
    (groups[k] = groups[k] || []).push(c);
  });
  const blocked = cl.items.filter((c) => c.status === "Blocked").length;
  return (
    <Sheet
      open
      onClose={closeAll}
      title={cl.name}
      sub={`${shortPics(cl.pics.name)}${cl.phase ? " · " + cl.phase : ""} · P.I.C.S Checklist`}
      footer={
        <>
          <AirtableLink href={atUrl(AT.checklist.id)} />
          <button type="button" className="btn btn-brand" onClick={closeAll}>
            Done
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi num={pc + "%"} lbl="Done" explain={`${cl.st.done} of ${cl.st.total}`} />
        <Kpi num={cl.st.late} lbl="Overdue" />
        <Kpi num={cl.st.soon} lbl="Coming up" explain="next 2 weeks" />
        <Kpi num={blocked} lbl="Blocked" tone={blocked ? "warn" : "good"} />
      </div>
      <Seg
        className="mt-4"
        label="Filter checklist"
        value={f}
        onChange={act.clFilter}
        options={["All", "To do", "Late", "Done"].map((x) => ({ id: x, label: x }))}
      />
      {Object.keys(groups).length ? (
        Object.keys(groups)
          .sort()
          .map((k) => (
            <div key={k || "_"}>
              {k ? <H5>{CL_GROUPS[k] || k}</H5> : <div className="h-2.5" />}
              {groups[k]
                .sort((a, b) => String(a.item).localeCompare(String(b.item), undefined, { numeric: true }))
                .map((c) => (
                  <ClRow key={c.id + c.notes + c.due} cl={cl} c={c} />
                ))}
            </div>
          ))
      ) : (
        <Empty className="mt-4">Nothing here</Empty>
      )}
      <Small className="mt-4">Changes save to P.I.C.S Checklist (Status, Due Date, General Notes).{cl.coded ? " 💳 = involves a payment." : ""}</Small>
    </Sheet>
  );
}
function ClRow({ cl, c }: { cl: Checklist; c: Checklist["items"][number] }) {
  const { S, act } = useSuite();
  const late = c.status !== "Completed" && !!c.due && c.due < todayIso;
  const open = S.clEdit === c.id;
  const done = c.status === "Completed";
  const [notes, setNotes] = useState(c.notes || "");
  return (
    <div className={cx("flex items-start gap-3 border-b border-line py-3", done && "opacity-70")}>
      <button
        type="button"
        onClick={() => act.clTick(c.id)}
        aria-label={done ? "Mark not done" : "Mark done"}
        title={done ? "Mark not done" : "Mark done"}
        className={cx(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-black",
          done ? "border-good bg-good text-white" : "border-line-2 bg-white hover:border-brand",
        )}
      >
        {done ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cx("text-[12.5px] font-bold", done && "line-through")}>
          {cl.coded && <span className="mr-1 text-muted">{c.item.slice(0, 2)}</span>}
          {clClean(c, cl.pics)}
        </div>
        <Small>
          Due{" "}
          <span className={cx(late && "font-bold text-bad")}>
            {fmtD(c.due)}
            {late ? " · late" : ""}
          </span>
          {(c.owners || []).length ? " · " + c.owners.join(", ") : ""}
        </Small>
        {c.notes && !open && <div className="mt-1 line-clamp-2 text-[12px] text-ink-2">{c.notes}</div>}
        {open && (
          <div className="mt-2 grid gap-2">
            <label className="text-[12px] font-bold">
              Due date
              <input type="date" className="field mt-1" defaultValue={c.due || ""} onChange={(e) => act.clDue(c.id, e.target.value)} />
            </label>
            <label className="text-[12px] font-bold">
              Notes · what to check / what happened
              <textarea className="field mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <div className="flex gap-1.5">
              <button type="button" className="btn btn-sm btn-brand" onClick={() => act.clNotes(c.id, notes)}>
                Save notes
              </button>
              <button type="button" className="btn btn-sm" onClick={() => act.clEdit(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="grid shrink-0 justify-items-end gap-1.5">
        <select
          aria-label="Status"
          className={cx("h-7 cursor-pointer rounded-full border-0 px-2 text-[11px] font-bold outline-none", TONE_PILL[late ? "bad" : done ? "good" : c.status === "Blocked" ? "bad" : c.status === "In Progress" ? "info" : "plain"])}
          value={c.status}
          onChange={(e) => act.clStatus(c.id, e.target.value)}
        >
          {["Not Started", "In Progress", "Blocked", "Completed"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {!open && (
          <button type="button" className="btn btn-sm" onClick={() => act.clEdit(c.id)}>
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- customer feedback note ---------------- */
export function NoteDrawer() {
  const { D, drawer, closeAll, has, act } = useSuite();
  const n = drawer?.kind === "note" ? D.feedback.find((x) => x.id === drawer.id) : undefined;
  if (!n) return null;
  return (
    <Sheet
      open
      onClose={closeAll}
      title="Customer feedback"
      sub={
        <>
          <span>
            {n.account} · {n.source} · {fmtD(n.date)} ·
          </span>
          <SentPill s={n.sentiment} />
        </>
      }
      footer={
        <>
          <AirtableLink href={atUrl(AT.feedback.id, n.id)} />
          {has("User Feedback & Insights.Triage Status") && n.status === "Unprocessed" ? (
            <button type="button" className="btn btn-brand" onClick={() => act.processed(n.id)}>
              Mark as reviewed
            </button>
          ) : (
            <button type="button" className="btn btn-brand" onClick={closeAll}>
              Done
            </button>
          )}
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-ink">“{n.summary}”</p>
      <Field label="Which feature is this about?" help="Mapped Feature">
        <select className="field" value={n.feature || ""} onChange={(e) => act.nfeat(n.id, e.target.value)}>
          <option value="">— Not linked —</option>
          {D.features.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </Field>
      {has("User Feedback & Insights.Theme") && (
        <Field label="Topic">
          <select className="field" value={n.theme || ""} onChange={(e) => act.ntheme(n.id, e.target.value)}>
            {D.themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {has("User Feedback & Insights.Importance") && (
        <Field label="How important">
          <select className="field" value={n.importance} onChange={(e) => act.nimp(n.id, e.target.value)}>
            {["Nice to have", "Important", "Critical"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
      )}
    </Sheet>
  );
}
