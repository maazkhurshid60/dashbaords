"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionItem, ActionItemInput, ActionItemsPayload } from "@/lib/productivity-action-types";
import { cx } from "@/lib/utils";
import { Empty, H } from "./shared";

/* Meeting card › Action items (PROD-7 → PROD-12, mock AI-01 → AI-07). Lists the meeting's
   linked Tasks Planning rows and saves every change straight to Airtable. */

const base = (id: string) => `/api/productivity/meetings/${id}/action-items`;

async function call<T = { ok: boolean }>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const j = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  return j as T;
}

const fmtDue = (d: string | null) =>
  d ? new Date(`${d}T12:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date";
const nowTime = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SyncRun {
  steps: number;
  newCount: number;
  result?: string;
  error?: string;
}

export function ActionItemsSection({ meetingId, compact = false }: { meetingId: string; compact?: boolean }) {
  const [data, setData] = useState<ActionItemsPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ id: string | null } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [run, setRun] = useState<SyncRun | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const d = await call<ActionItemsPayload>(base(meetingId), "GET");
    if (alive.current) setData(d);
    return d;
  }, [meetingId]);

  useEffect(() => {
    alive.current = true;
    load().catch((e: Error) => alive.current && setLoadError(e.message));
    return () => {
      alive.current = false;
    };
  }, [load]);

  /** PROD-12: every write shows "Saving…" then "Synced · time", and re-reads the list. */
  const save = async (fn: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      await load();
      setSynced(nowTime());
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return (<><H>Action items</H><Empty>Couldn&apos;t load action items: {loadError}</Empty></>);
  if (!data) return (<><H>Action items</H><div className="text-[12px] text-muted">Loading action items…</div></>);

  const roadmap = data.roadmaps.find((r) => r.id === data.roadmapId);
  const editing = form?.id ? data.items.find((i) => i.id === form.id) : undefined;

  /** PROD-8: tick Sync Action Items, poll until SUCANT unticks it, then diff the task list. */
  const syncFromRecap = async () => {
    if (!data.recapAvailable || saving) return;
    const before = new Set(data.items.map((i) => i.id));
    setRun({ steps: 0, newCount: 0 });
    setSaving(true);
    setError(null);
    try {
      await call(base(meetingId), "POST", { action: "syncRecap" });
      setRun({ steps: 1, newCount: 0 });
      const started = Date.now();
      let d = await load();
      while (d.syncing && Date.now() - started < 60_000) {
        await wait(3000);
        d = await load();
      }
      if (d.syncing) throw new Error("Sync is taking longer than expected — check back in a minute.");
      const added = d.items.filter((i) => !before.has(i.id));
      const toRoadmap = added.filter((i) => i.roadmapId).length;
      setFresh((s) => new Set([...s, ...added.map((i) => i.id)]));
      setRun({
        steps: 4,
        newCount: added.length,
        result: added.length
          ? `${added.length} created · ${added.length} linked to meeting · ${toRoadmap} linked to roadmap`
          : `0 new · ${d.items.length} already linked`,
      });
      setSynced(nowTime());
    } catch (e) {
      setRun((r) => ({ steps: r?.steps ?? 0, newCount: 0, error: (e as Error).message }));
    } finally {
      setSaving(false);
    }
  };

  const steps = run
    ? [
        "Reading action items from the recap",
        `Creating ${run.newCount} task(s) in Tasks Planning`,
        "Linking each task to this meeting",
        roadmap ? `Linking to roadmap: ${roadmap.tag || roadmap.title}` : "Linking to roadmap: skipped (no roadmap chosen)",
      ]
    : [];

  const syncTitle = !data.recapAvailable
    ? "Available after recap"
    : data.recapPending
      ? "Sync action items from the recap"
      : "Everything in the recap is synced";

  return (
    <div className={compact ? "mt-3 border-t border-line pt-3" : undefined}>
      <div className="mb-2 mt-6 flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-extrabold">
          Action items <span className="text-[12px] font-semibold text-muted">{data.items.length}</span>
        </h3>
        <button
          type="button"
          onClick={syncFromRecap}
          disabled={!data.recapAvailable || saving}
          title={syncTitle}
          aria-label={syncTitle}
          className={cx(
            "relative grid h-7 w-7 place-items-center rounded-full border text-[14px]",
            data.recapAvailable ? "border-brand text-brand hover:bg-brand-soft" : "cursor-not-allowed border-line text-muted opacity-60",
          )}
        >
          ⟳
          {data.recapAvailable && data.recapPending && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand" />}
        </button>
        {!data.recapAvailable && <span className="text-[11.5px] text-muted">Available after recap</span>}
        <label className="ml-auto flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
          Sync to roadmap
          <select
            className="rounded-lg border border-line bg-white px-2 py-1 text-[12px]"
            value={data.roadmapId ?? ""}
            disabled={saving}
            onChange={(e) => {
              const roadmapId = e.target.value || null;
              void save(() => call(base(meetingId), "POST", { action: "roadmap", roadmapId }));
            }}
          >
            <option value="">— No roadmap —</option>
            {data.roadmaps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
                {r.tag ? ` (${r.tag})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {run && (
        <div className="mb-2 grid gap-1.5 rounded-xl bg-plane px-3 py-2.5 text-[12.5px]">
          {steps.map((l, i) => {
            const done = i < run.steps;
            const skip = i === 3 && !roadmap && done;
            return (
              <div key={l} className={cx("flex items-center gap-2", done ? "text-ink-2" : "text-muted", skip && "line-through")}>
                <i className={cx("w-4 text-center not-italic", done && "text-teal")}>{done ? "✓" : "○"}</i>
                {l}
              </div>
            );
          })}
          {run.result && <div className="font-bold">{run.result}</div>}
          {run.error && <div className="font-semibold text-red-600">{run.error}</div>}
        </div>
      )}

      {data.items.length ? (
        <ul className="space-y-1.5">
          {data.items.map((i) => (
            <ItemRow
              key={i.id}
              i={i}
              isNew={fresh.has(i.id)}
              roadmapTitle={data.roadmaps.find((r) => r.id === i.roadmapId)?.title}
              disabled={saving}
              onToggle={() => {
                const status = i.status === "Completed" ? "Not Started" : "Completed";
                void save(() => call(`/api/productivity/action-items/${i.id}`, "PATCH", { status } satisfies ActionItemInput));
              }}
              onEdit={() => setForm({ id: i.id })}
              onRemove={() => setRemoving(i.id)}
              removing={removing === i.id}
              onRemoveChoice={(mode) => {
                setRemoving(null);
                if (!mode) return;
                const q = mode === "unlink" ? `mode=unlink&meeting=${meetingId}` : "mode=delete";
                void save(() => call(`/api/productivity/action-items/${i.id}?${q}`, "DELETE"));
              }}
            />
          ))}
        </ul>
      ) : (
        <Empty>No action items linked to this meeting yet.</Empty>
      )}

      {form ? (
        <ItemForm
          key={form.id ?? "new"}
          item={editing}
          data={data}
          disabled={saving}
          onCancel={() => setForm(null)}
          onSubmit={async (body) => {
            const ok = await save(async () => {
              if (form.id) return call(`/api/productivity/action-items/${form.id}`, "PATCH", body);
              const r = await call<{ id: string | null }>(base(meetingId), "POST", { action: "create", item: body });
              if (r.id) setFresh((s) => new Set([...s, r.id as string]));
            });
            if (ok) setForm(null);
          }}
        />
      ) : (
        <button type="button" className="btn btn-sm mt-2" onClick={() => setForm({ id: null })} disabled={saving}>
          ＋ Add action item
        </button>
      )}

      {(saving || synced || error) && (
        <div className={cx("mt-2 text-[11.5px] font-semibold", error ? "text-red-600" : saving ? "text-amber-600" : "text-muted")}>
          {error ? `Couldn't save: ${error}` : saving ? "Saving to Tasks Planning…" : `Synced to Tasks Planning · ${synced}`}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  i,
  isNew,
  roadmapTitle,
  disabled,
  removing,
  onToggle,
  onEdit,
  onRemove,
  onRemoveChoice,
}: {
  i: ActionItem;
  isNew: boolean;
  roadmapTitle?: string;
  disabled: boolean;
  removing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onRemoveChoice: (mode: "unlink" | "delete" | null) => void;
}) {
  const done = i.status === "Completed" || i.completed;
  return (
    <li className={cx("rounded-xl border px-3 py-2", isNew ? "border-brand bg-brand-soft/40" : "border-line bg-plane")}>
      <div className="flex items-start gap-2.5">
        <input type="checkbox" className="mt-1" checked={done} disabled={disabled} onChange={onToggle} aria-label={`Mark ${i.task} complete`} />
        <div className="min-w-0 flex-1">
          <div className={cx("text-[12.5px] font-semibold leading-snug", done && "text-muted line-through")}>
            {i.task || "Untitled task"}
            {isNew && <span className="chip ml-1.5 bg-brand text-white">NEW</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-2">
            <span>{i.owner || "Unassigned"}</span>·<span>Due {fmtDue(i.due)}</span>
            {i.priority === "High" && <span className="chip bg-red-50 text-red-600">High</span>}
            {i.status && <span className={cx("chip", done ? "bg-teal/10 text-teal" : "bg-white")}>{i.status}</span>}
            {i.roadmapTag ? (
              <span className="chip bg-brand-soft text-brand" title={roadmapTitle}>
                {i.roadmapTag}
              </span>
            ) : (
              <span className="chip bg-white">No roadmap</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="btn btn-sm" onClick={onEdit} disabled={disabled} title="Edit" aria-label="Edit">
            ✎
          </button>
          <button type="button" className="btn btn-sm" onClick={onRemove} disabled={disabled} title="Remove" aria-label="Remove">
            🗑
          </button>
        </div>
      </div>
      {removing && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <button type="button" className="btn btn-sm" onClick={() => onRemoveChoice("unlink")}>
            Remove from this meeting
          </button>
          <button type="button" className="btn btn-sm text-red-600" onClick={() => onRemoveChoice("delete")}>
            Delete task
          </button>
          <button type="button" className="text-muted hover:underline" onClick={() => onRemoveChoice(null)}>
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

function ItemForm({
  item,
  data,
  disabled,
  onCancel,
  onSubmit,
}: {
  item?: ActionItem;
  data: ActionItemsPayload;
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (b: ActionItemInput) => void;
}) {
  const [task, setTask] = useState(item?.task ?? "");
  const [ownerId, setOwnerId] = useState(item?.ownerId ?? "");
  const [due, setDue] = useState(item?.due ?? "");
  const [priority, setPriority] = useState(item?.priority ?? "");
  const [status, setStatus] = useState(item?.status ?? (data.statuses.includes("Not Started") ? "Not Started" : ""));
  const [roadmapId, setRoadmapId] = useState(item ? (item.roadmapId ?? "") : (data.roadmapId ?? ""));
  const field = "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px]";
  const lbl = "grid gap-1 text-[11.5px] font-semibold text-ink-2";
  return (
    <form
      className="mt-2 grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!task.trim()) return;
        onSubmit({ task, ownerId: ownerId || null, due: due || null, priority: priority || null, status: status || null, roadmapId: roadmapId || null });
      }}
    >
      <label className={cx(lbl, "sm:col-span-2")}>
        Action item
        <input className={field} value={task} onChange={(e) => setTask(e.target.value)} required maxLength={500} />
      </label>
      <label className={lbl}>
        Assigned to
        <select className={field} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">Unassigned</option>
          {data.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className={lbl}>
        Due date
        <input type="date" className={field} value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <label className={lbl}>
        Priority
        <select className={field} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">—</option>
          {data.priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label className={lbl}>
        Status
        <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">—</option>
          {data.statuses.map((s) => (
            <option key={s} value={s}>
              {s.trim()}
            </option>
          ))}
        </select>
      </label>
      <label className={cx(lbl, "sm:col-span-2")}>
        Roadmap
        <select className={field} value={roadmapId} onChange={(e) => setRoadmapId(e.target.value)}>
          <option value="">— No roadmap —</option>
          {data.roadmaps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
              {r.tag ? ` (${r.tag})` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn btn-brand btn-sm" disabled={disabled || !task.trim()}>
          {item ? "Save" : "Add"}
        </button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
