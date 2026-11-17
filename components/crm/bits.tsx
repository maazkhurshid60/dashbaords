"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ago, fmtDate, openTasks, ts } from "@/lib/crm-logic";
import { nowMs } from "@/lib/crm-logic";
import type { Activity, Task } from "@/lib/crm-types";
import { useCrm } from "./store";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** COM change tag — hidden unless “Show change tags (COM)” is on (COM-1). */
export function Com({ id }: { id: string }) {
  const { showTags } = useCrm();
  if (!showTags) return null;
  return <span className="ml-1.5 inline-block rounded bg-[#fff1b8] px-1.5 py-px align-middle text-[10px] font-bold tracking-wide text-[#7a5b00]">{id}</span>;
}

const TONES: Record<string, string> = {
  brand: "bg-brand-soft text-brand",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  teal: "bg-teal-soft text-teal",
  gray: "bg-plane text-ink-2",
};
export function Chip({ children, tone = "gray", title, onClick }: { children: ReactNode; tone?: keyof typeof TONES | string; title?: string; onClick?: () => void }) {
  const cls = cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold", TONES[tone] || TONES.gray, onClick && "cursor-pointer hover:opacity-80");
  return onClick ? (
    <button type="button" className={cls} title={title} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}

export function Stat({ label, value, sub, active, onClick, tone }: { label: string; value: ReactNode; sub?: ReactNode; active?: boolean; onClick?: () => void; tone?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx("card min-w-0 flex-1 px-4 py-3 text-left transition", active && "ring-2 ring-brand", onClick && "hover:border-brand")}
    >
      <div className="text-[11.5px] font-semibold text-muted">{label}</div>
      <div className={cx("mt-1 text-[22px] font-bold leading-tight", tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-ink")}>{value}</div>
      {sub ? <div className="mt-0.5 text-[11.5px] text-ink-2">{sub}</div> : null}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line-2 px-4 py-8 text-center text-[13px] text-muted">{children}</div>;
}

export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[13px] font-bold text-ink">{children}</h3>
      {right}
    </div>
  );
}

export function Drawer({ title, sub, onClose, children, actions, wide }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" onClick={onClose}>
      <aside
        className={cx("flex h-full w-full flex-col bg-shell shadow-2xl", wide ? "max-w-[760px]" : "max-w-[560px]")}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-[17px] font-bold text-ink">{title}</div>
            {sub ? <div className="mt-0.5 text-[12.5px] text-ink-2">{sub}</div> : null}
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        {actions ? <div className="flex flex-wrap gap-2 border-b border-line px-5 py-2.5">{actions}</div> : null}
        <div className="scroll-thin flex-1 space-y-6 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- editable details card (COM-25) */
export type FieldType = "text" | "textarea" | "number" | "date" | "email" | "url" | "select" | "multi" | "member" | "company" | "contact" | "stage" | "check";
export interface FieldSpec {
  label: string;
  /** Airtable field name the value is saved to. */
  field: string;
  type: FieldType;
  value: unknown;
  options?: string[];
  display?: ReactNode;
}

const asIds = (v: unknown) => (Array.isArray(v) ? (v as string[]) : v ? [String(v)] : []);

export function FieldInput({ spec, value, onChange }: { spec: FieldSpec; value: unknown; onChange: (v: unknown) => void }) {
  const { D } = useCrm();
  const link = (list: { id: string; name: string }[]) => (
    <select className="field" value={asIds(value)[0] || ""} onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}>
      <option value="">—</option>
      {list.map((x) => (
        <option key={x.id} value={x.id}>
          {x.name}
        </option>
      ))}
    </select>
  );
  switch (spec.type) {
    case "textarea":
      return <textarea className="field min-h-20" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <input className="field" type="number" value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
    case "date":
      return <input className="field" type="date" value={String(value ?? "").slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
    case "check":
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    case "select":
      return (
        <select className="field" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(spec.options || []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    case "multi": {
      const cur = asIds(value);
      return (
        <div className="flex flex-wrap gap-1.5">
          {(spec.options || []).map((o) => (
            <Chip key={o} tone={cur.includes(o) ? "brand" : "gray"} onClick={() => onChange(cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o])}>
              {o}
            </Chip>
          ))}
        </div>
      );
    }
    case "member":
      return link(D.members);
    case "company":
      return link(D.companies);
    case "contact":
      return link(D.contacts.map((c) => ({ id: c.id, name: c.name || c.email })));
    case "stage":
      return link(D.stages);
    default:
      return <input className="field" type={spec.type === "email" ? "email" : spec.type === "url" ? "url" : "text"} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function displayOf(spec: FieldSpec, name: (id: string) => string): ReactNode {
  if (spec.display !== undefined) return spec.display;
  const v = spec.value;
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return <span className="text-muted">—</span>;
  if (["member", "company", "contact", "stage"].includes(spec.type))
    return (
      <span className="flex flex-wrap gap-1">
        {asIds(v).map((id) => (
          <Chip key={id} tone="brand">
            {name(id) || id}
          </Chip>
        ))}
      </span>
    );
  if (spec.type === "multi")
    return (
      <span className="flex flex-wrap gap-1">
        {asIds(v).map((x) => (
          <Chip key={x} tone="teal">
            {x}
          </Chip>
        ))}
      </span>
    );
  if (spec.type === "select") return <Chip tone="brand">{String(v)}</Chip>;
  if (spec.type === "date") return fmtDate(String(v));
  if (spec.type === "check") return v ? "Yes" : "No";
  if (spec.type === "url")
    return (
      <a className="text-brand underline" href={String(v)} target="_blank" rel="noreferrer">
        {String(v)}
      </a>
    );
  return <span className="whitespace-pre-wrap">{String(v)}</span>;
}

/** Click any row or ✎ Edit to edit in place → “Save to Airtable”. Only changed fields are sent. */
export function DetailsCard({ title = "Details", specs, onSave, startEditing, com = "COM-25" }: { title?: string; specs: FieldSpec[]; onSave: (fields: Record<string, unknown>) => Promise<boolean>; startEditing?: boolean; com?: string }) {
  const { name, busy } = useCrm();
  const [edit, setEdit] = useState(!!startEditing);
  const [vals, setVals] = useState<Record<string, unknown>>(() => (startEditing ? Object.fromEntries(specs.map((s) => [s.field, s.value])) : {}));
  const begin = () => {
    setVals(Object.fromEntries(specs.map((s) => [s.field, s.value])));
    setEdit(true);
  };
  const save = async () => {
    const changed: Record<string, unknown> = {};
    for (const s of specs) if (JSON.stringify(vals[s.field] ?? null) !== JSON.stringify(s.value ?? null)) changed[s.field] = vals[s.field];
    if (!Object.keys(changed).length) return setEdit(false);
    if (await onSave(changed)) setEdit(false);
  };
  return (
    <section className="card p-4">
      <H
        right={
          edit ? (
            <span className="flex gap-1.5">
              {!startEditing && (
                <button type="button" className="btn btn-sm" onClick={() => setEdit(false)}>
                  Cancel
                </button>
              )}
              <button type="button" className="btn btn-sm btn-brand" disabled={busy} onClick={save}>
                Save to Airtable
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-sm" onClick={begin}>
              ✎ Edit
            </button>
          )
        }
      >
        {title}
        <Com id={com} />
      </H>
      <dl className="divide-y divide-line">
        {specs.map((s) => (
          <div key={s.field} className={cx("grid grid-cols-[140px_1fr] items-start gap-3 py-2 text-[13px]", !edit && "cursor-pointer hover:bg-plane")} onClick={edit ? undefined : begin}>
            <dt className="pt-0.5 font-semibold text-ink-2">{s.label}</dt>
            <dd className="min-w-0">{edit ? <FieldInput spec={s} value={vals[s.field]} onChange={(v) => setVals((x) => ({ ...x, [s.field]: v }))} /> : displayOf(s, name)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------------------------------------------------------- tasks (COM-27) */
export interface TaskLink {
  contactIds?: string[];
  oppIds?: string[];
  msgIds?: string[];
  picsIds?: string[];
  picsTag?: string;
  title?: string;
}

export function TaskForm({ link, onDone, tab }: { link: TaskLink; onDone?: () => void; tab: string }) {
  const { D, write, opts, me, busy, name } = useCrm();
  const [task, setTask] = useState(link.title || "");
  const [who, setWho] = useState(me?.id || "");
  const [due, setDue] = useState(new Date(nowMs() + 86400000).toISOString().slice(0, 10));
  const [prio, setPrio] = useState("Medium");
  const save = async () => {
    if (!task.trim()) return;
    const r = await write(
      "saveTask",
      {
        tab,
        fields: {
          Task: task.trim(),
          "Assigned To": who ? [who] : [],
          "Due Date": due,
          Priority: prio,
          Status: "Not Started",
          "Related P.I.C.S": link.picsIds || [],
          "P.I.C.S Tag": link.picsTag || (link.picsIds?.[0] ? name(link.picsIds[0]) : ""),
          "Related Communications": link.msgIds || [],
          "Related Opportunity": link.oppIds || [],
          "Related Contact": link.contactIds || [],
          "Task Type": "Action Item",
        },
      },
      "Task added to Tasks Planning",
    );
    if (r?.ok) {
      setTask("");
      onDone?.();
    }
  };
  return (
    <div className="grid gap-2 rounded-lg bg-plane p-3 sm:grid-cols-[1fr_150px_130px_100px_auto]">
      <input className="field" placeholder="Task or follow-up…" value={task} onChange={(e) => setTask(e.target.value)} />
      <select className="field" value={who} onChange={(e) => setWho(e.target.value)}>
        <option value="">Unassigned</option>
        {D.members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <input className="field" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <select className="field" value={prio} onChange={(e) => setPrio(e.target.value)}>
        {(opts("Tasks Planning.Priority").length ? opts("Tasks Planning.Priority").filter((p) => ["High", "Medium", "Low"].includes(p)) : ["High", "Medium", "Low"]).map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <button type="button" className="btn btn-sm btn-brand" disabled={busy || !task.trim()} onClick={save}>
        Add
      </button>
    </div>
  );
}

export function TaskList({ tasks, link, tab }: { tasks: Task[]; link: TaskLink; tab: string }) {
  const { write, name } = useCrm();
  const [adding, setAdding] = useState(false);
  const open = openTasks(tasks);
  return (
    <section>
      <H
        right={
          <button type="button" className="btn btn-sm" onClick={() => setAdding((a) => !a)}>
            ＋ Add task
          </button>
        }
      >
        Tasks ({open.length} open)
        <Com id="COM-27" />
      </H>
      {adding && <TaskForm link={link} tab={tab} onDone={() => setAdding(false)} />}
      {!tasks.length && !adding ? <Empty>No tasks yet.</Empty> : null}
      <ul className="mt-2 space-y-1">
        {tasks
          .slice()
          .sort((a, b) => Number(a.completed) - Number(b.completed) || ts(a.due) - ts(b.due))
          .map((t) => {
            const late = !t.completed && ts(t.due) && ts(t.due) < nowMs() - 86400000;
            return (
              <li key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-plane">
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={(e) => write("saveTask", { id: t.id, tab, fields: { Completed: e.target.checked, Status: e.target.checked ? "Completed" : "In Progress" } }, e.target.checked ? "Task completed" : "Task reopened")}
                />
                <span className={cx("flex-1", t.completed && "text-muted line-through")}>{t.task || "(untitled task)"}</span>
                {t.assigneeIds.length ? <Chip>{name(t.assigneeIds[0])}</Chip> : <Chip tone="bad">Unassigned</Chip>}
                {t.due ? <Chip tone={late ? "bad" : "gray"}>{fmtDate(t.due)}</Chip> : null}
              </li>
            );
          })}
      </ul>
    </section>
  );
}

export function ActivityList({ items }: { items: Activity[] }) {
  const { name } = useCrm();
  if (!items.length) return <Empty>No activity logged yet.</Empty>;
  return (
    <ol className="space-y-2">
      {items
        .slice()
        .sort((a, b) => ts(b.date) - ts(a.date))
        .slice(0, 40)
        .map((a) => (
          <li key={a.id} className="rounded-lg border border-line px-3 py-2 text-[13px]">
            <div className="flex items-center gap-2">
              <Chip tone="brand">{a.type || "Note"}</Chip>
              <span className="flex-1 truncate font-semibold">{a.subject}</span>
              <span className="text-[11.5px] text-muted">{ago(a.date)}</span>
            </div>
            {a.body ? <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-ink-2">{a.body}</p> : null}
            {a.ownerIds[0] ? <div className="mt-1 text-[11.5px] text-muted">by {name(a.ownerIds[0])}</div> : null}
          </li>
        ))}
    </ol>
  );
}

/** Quick note / call logger → Activities. */
export function LogActivity({ type, link, onDone, tab }: { type: "Call" | "Note" | "Meeting"; link: { contactIds?: string[]; oppIds?: string[] }; onDone: () => void; tab: string }) {
  const { write, busy } = useCrm();
  const [subject, setSubject] = useState(type === "Call" ? "Call" : type === "Meeting" ? "Meeting" : "Note");
  const [body, setBody] = useState("");
  return (
    <div className="space-y-2 rounded-lg bg-plane p-3">
      <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="field min-h-20" placeholder={type === "Call" ? "What was discussed?" : "Write a note…"} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-sm" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-sm btn-brand"
          disabled={busy}
          onClick={async () => {
            const r = await write("logActivity", { tab, fields: { Subject: subject, Type: type, Body: body, Contact: link.contactIds || [], Opportunity: link.oppIds || [] } }, `${type} logged`);
            if (r?.ok) onDone();
          }}
        >
          Save {type.toLowerCase()}
        </button>
      </div>
    </div>
  );
}
