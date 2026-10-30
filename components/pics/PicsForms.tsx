"use client";

/* Launch P.I.C.S / Add roadmap item / Add checklist item / Edit checklist item — all session-only. */
import { useState } from "react";
import { Modal, useToast } from "@/components/ui";
import {
  APPROVAL_STATUS,
  ASSET_TYPES,
  CHECK_STATUS,
  HIERARCHY_OPTIONS,
  ITEM_TYPES,
  PHASE_ORDER,
  REAL_DEPARTMENTS,
  RECORD_TYPES,
  ROADMAP_STATUS,
  ROADMAP_TYPES,
  STAGES,
  TASK_STATUS,
  todayISO,
} from "@/lib/pics";
import type { ChecklistItem, PicsRecord, PicsType, RoadmapRow } from "@/lib/types";
import { Field, Note, Opts, ToggleChips, toggleIn } from "./pics-ui";

/* ---------------- Launch a new P.I.C.S ----------------
   Every field maps to a real column on the Airtable P.I.C.S table (tblbiIHxN97iyltFY). Link fields
   (Budgets, Meetings, Goals, Briefs…) are populated after creation in Airtable too, so they're not here. */
export function NewPicsModal({
  records,
  onClose,
  onCreate,
}: {
  records: PicsRecord[];
  onClose: () => void;
  onCreate: (rec: PicsRecord) => void;
}) {
  const toast = useToast();
  const [f, setF] = useState({
    name: "",
    type: "Project" as PicsType,
    stage: "Not Started",
    start: "",
    end: "",
    leads: "",
    overview: "",
    stakeholders: "",
    briefing: "",
    liveSite: "",
    hierarchy: "None" as (typeof HIERARCHY_OPTIONS)[number],
    parentId: "",
    active: true,
  });
  const [depts, setDepts] = useState<string[]>(["Operations"]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const name = f.name.trim();
    if (!name || !f.start || !f.end || !depts.length) {
      toast("Add a name, timeline, and at least one department before launching.");
      return;
    }
    const leads = f.leads
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((i) => ({ i }));
    const rec: PicsRecord = {
      id: `p_new_${Date.now()}`,
      type: f.type,
      name,
      stage: f.stage,
      depts: [...depts],
      start: f.start,
      end: f.end,
      leads: leads.length ? leads : [{ i: "—" }],
      meetingCount: 0,
      activityCount: 0,
      roadmapRows: [],
      checklist: [],
      overview: f.overview.trim(),
      stakeholders: f.stakeholders.trim(),
      briefingLink: f.briefing.trim() || null,
      liveSiteUrl: f.liveSite.trim() || null,
      active: f.active,
    };
    if (f.hierarchy !== "None" && f.parentId && records.some((r) => r.id === f.parentId)) {
      rec.hierarchy = f.hierarchy;
      rec.parentId = f.parentId;
    }
    onCreate(rec);
    toast(`"${name}" launched (session only — not yet synced to Airtable)`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Launch a new P.I.C.S"
      subtitle="Creates a new Project / Initiative / Campaign / Sprint / BAU / Milestone record"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-brand" onClick={submit}>
            Launch P.I.C.S
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="P.I.C.S name">
          <input className="field" value={f.name} placeholder="e.g. Q1 Vendor Consolidation" onChange={(e) => set("name", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <select className="field" value={f.type} onChange={(e) => set("type", e.target.value as PicsType)}>
              <Opts list={RECORD_TYPES} />
            </select>
          </Field>
          <Field label="Stage">
            <select className="field" value={f.stage} onChange={(e) => set("stage", e.target.value)}>
              <Opts list={STAGES} />
            </select>
          </Field>
          <Field label="Start date">
            <input type="date" className="field" value={f.start} onChange={(e) => set("start", e.target.value)} />
          </Field>
          <Field label="End date">
            <input type="date" className="field" value={f.end} onChange={(e) => set("end", e.target.value)} />
          </Field>
        </div>
        <ToggleChips label="Related department(s)" options={REAL_DEPARTMENTS} selected={depts} onToggle={(d) => setDepts((p) => toggleIn(p, d))} />
        <Field label="Project lead initials">
          <input className="field" value={f.leads} placeholder="e.g. JM, RT" onChange={(e) => set("leads", e.target.value)} />
        </Field>
        <Field label="Overview">
          <textarea className="field" rows={2} value={f.overview} placeholder="What this P.I.C.S is and why it exists…" onChange={(e) => set("overview", e.target.value)} />
        </Field>
        <Field label="Stakeholders">
          <textarea className="field" rows={2} value={f.stakeholders} placeholder="Who's involved or needs visibility…" onChange={(e) => set("stakeholders", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Briefing link">
            <input type="url" className="field" value={f.briefing} placeholder="https://…" onChange={(e) => set("briefing", e.target.value)} />
          </Field>
          <Field label="Live site URL">
            <input type="url" className="field" value={f.liveSite} placeholder="https://…" onChange={(e) => set("liveSite", e.target.value)} />
          </Field>
          <Field label="Hierarchy">
            <select
              className="field"
              value={f.hierarchy}
              onChange={(e) => set("hierarchy", e.target.value as (typeof HIERARCHY_OPTIONS)[number])}
            >
              <Opts list={HIERARCHY_OPTIONS} />
            </select>
          </Field>
          <Field label="Parent P.I.C.S (if Child/Sub-child)">
            <select className="field" value={f.parentId} onChange={(e) => set("parentId", e.target.value)}>
              <option value="">None</option>
              {records.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] font-semibold">
          <input type="checkbox" className="size-4 accent-brand" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Active
        </label>
      </div>
      <Note>{SESSION_ONLY} Writing new P.I.C.S records to the live Airtable base needs a connected sync.</Note>
    </Modal>
  );
}

const SESSION_ONLY = "Saves to this session only.";

/* ---------------- Add roadmap item ---------------- */
export function AddRoadmapModal({
  record: r,
  onClose,
  onAdd,
}: {
  record: PicsRecord;
  onClose: () => void;
  onAdd: (row: RoadmapRow) => void;
}) {
  const toast = useToast();
  const [d, setD] = useState<RoadmapRow>({
    label: "",
    type: ROADMAP_TYPES[0],
    phase: PHASE_ORDER[0],
    date: "",
    stage: STAGES[0],
    status: ROADMAP_STATUS[0],
  });
  const submit = () => {
    const label = d.label.trim();
    if (!label || !d.date) {
      toast("Add a key outcome and date before saving.");
      return;
    }
    onAdd({ ...d, label });
    toast("Roadmap item added and synced to Task Planning");
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Add roadmap item"
      subtitle={`${r.name} — syncs to the Task Planning table`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-brand" onClick={submit}>
            Add item
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Key outcome">
          <input className="field" value={d.label} placeholder="e.g. Vendor SOW signed" onChange={(e) => setD({ ...d, label: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <select className="field" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}>
              <Opts list={ROADMAP_TYPES} />
            </select>
          </Field>
          <Field label="Phase">
            <select className="field" value={d.phase} onChange={(e) => setD({ ...d, phase: e.target.value })}>
              <Opts list={PHASE_ORDER} />
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className="field" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
          </Field>
          <Field label="Stage">
            <select className="field" value={d.stage} onChange={(e) => setD({ ...d, stage: e.target.value })}>
              <Opts list={STAGES} />
            </select>
          </Field>
        </div>
        <Field label="Status">
          <select className="field" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })}>
            <Opts list={ROADMAP_STATUS} />
          </select>
        </Field>
      </div>
      <Note>Saves to this session and mirrors into the Task Planning table (shown as “Synced” on the row). Writing back to the live Airtable base needs a connected sync.</Note>
    </Modal>
  );
}

/* ---------------- Checklist fields (shared by add / edit / week editor) ---------------- */
export function ChecklistFields({
  d,
  setD,
  withStatus,
}: {
  d: ChecklistItem;
  setD: (c: ChecklistItem) => void;
  withStatus: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field label="Checklist item">
        <input className="field" value={d.item} placeholder="e.g. Final vendor contract signed" onChange={(e) => setD({ ...d, item: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Due date">
          <input type="date" className="field" value={d.due ?? ""} onChange={(e) => setD({ ...d, due: e.target.value || null })} />
        </Field>
        {withStatus && (
          <Field label="Status">
            <select className="field" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as ChecklistItem["status"] })}>
              <Opts list={CHECK_STATUS} />
            </select>
          </Field>
        )}
        <Field label="Item type">
          <select className="field" value={d.itemType ?? "Task"} onChange={(e) => setD({ ...d, itemType: e.target.value })}>
            <Opts list={ITEM_TYPES} />
          </select>
        </Field>
        <Field label="Task status">
          <select className="field" value={d.taskStatus ?? "Not Started"} onChange={(e) => setD({ ...d, taskStatus: e.target.value })}>
            <Opts list={TASK_STATUS} />
          </select>
        </Field>
        <Field label="Approval status">
          <select className="field" value={d.approvalStatus ?? "Not Started"} onChange={(e) => setD({ ...d, approvalStatus: e.target.value })}>
            <Opts list={APPROVAL_STATUS} />
          </select>
        </Field>
        <Field label="Asset type">
          <select className="field" value={d.assetType ?? "Web"} onChange={(e) => setD({ ...d, assetType: e.target.value })}>
            <Opts list={ASSET_TYPES} />
          </select>
        </Field>
      </div>
      {withStatus && (
        <div className="flex gap-5 text-[12.5px] font-semibold">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-brand" checked={!!d.complete} onChange={(e) => setD({ ...d, complete: e.target.checked })} />
            Complete
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-brand" checked={!!d.overdue} onChange={(e) => setD({ ...d, overdue: e.target.checked })} />
            Overdue
          </label>
        </div>
      )}
      <Field label="Notes (OPANT / team)">
        <textarea
          className="field"
          rows={2}
          value={d.notes ?? ""}
          placeholder="Add a note for OPANT or the team…"
          onChange={(e) => setD({ ...d, notes: e.target.value })}
        />
      </Field>
    </div>
  );
}

/** Applies the original's save rule: "done" stamps a done date (due date, else today). */
export const finalizeChecklist = (c: ChecklistItem): ChecklistItem => ({
  ...c,
  done: c.status === "done" ? (c.due ?? todayISO()) : null,
});

/* ---------------- Add checklist item ---------------- */
export function AddChecklistModal({
  record: r,
  onClose,
  onAdd,
}: {
  record: PicsRecord;
  onClose: () => void;
  onAdd: (c: ChecklistItem) => void;
}) {
  const toast = useToast();
  const [d, setD] = useState<ChecklistItem>({
    item: "",
    due: null,
    done: null,
    status: "upcoming",
    itemType: ITEM_TYPES[0],
    taskStatus: TASK_STATUS[0],
    approvalStatus: APPROVAL_STATUS[0],
    assetType: ASSET_TYPES[0],
    complete: false,
    overdue: false,
    notes: "",
  });
  const submit = () => {
    const item = d.item.trim();
    if (!item) {
      toast("Add a checklist item name before saving.");
      return;
    }
    const status = d.due && d.due < todayISO() ? "overdue" : "upcoming";
    onAdd({ ...d, item, notes: (d.notes ?? "").trim(), status, overdue: status === "overdue", complete: false, done: null });
    toast("Checklist item added (session only — not yet synced to Airtable)");
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Add checklist item"
      subtitle={r.name}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-brand" onClick={submit}>
            Add item
          </button>
        </>
      }
    >
      <ChecklistFields d={d} setD={setD} withStatus={false} />
      <Note>{SESSION_ONLY} Writing back to the live Airtable base needs a connected sync.</Note>
    </Modal>
  );
}

/* ---------------- Edit a single checklist item ---------------- */
export function EditChecklistModal({
  record: r,
  idx,
  onClose,
  onSave,
}: {
  record: PicsRecord;
  idx: number;
  onClose: () => void;
  onSave: (c: ChecklistItem) => void;
}) {
  const toast = useToast();
  const [d, setD] = useState<ChecklistItem>(() => ({ ...r.checklist[idx] }));
  return (
    <Modal
      open
      onClose={onClose}
      title="Edit checklist item"
      subtitle={r.name}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-brand"
            onClick={() => {
              onSave(finalizeChecklist(d));
              toast("Checklist item updated and resynced (session only — not yet synced to Airtable)");
            }}
          >
            Save &amp; resync
          </button>
        </>
      }
    >
      <ChecklistFields d={d} setD={setD} withStatus />
      <Note>Saves to this session and updates this card&apos;s checklist immediately. Writing back to the live Airtable P.I.C.S Checklist table needs a connected sync.</Note>
    </Modal>
  );
}
