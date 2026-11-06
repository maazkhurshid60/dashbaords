"use client";

/* addFeedbackModal / deployModal / howtoModal */
import { useState } from "react";
import { Modal } from "@/components/ui";
import { Field } from "./drawers";
import { SEV_ORDER } from "./format";
import { liveOpts } from "./logic";
import { useSuite } from "./useSuite";

export function AddFeedbackModal() {
  const { modal, closeAll } = useSuite();
  if (modal?.kind !== "addfb") return null;
  return <AddFeedbackBody onClose={closeAll} />;
}
function AddFeedbackBody({ onClose }: { onClose: () => void }) {
  const { D, has, act } = useSuite();
  const withPersona = has("User Feedback & Insights.Related Persona");
  const [v, setV] = useState({ text: "", acc: "", src: "In-App", sev: "Medium", feat: "", per: D.personas[0]?.name || "" });
  const up = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((o) => ({ ...o, [k]: e.target.value }));
  return (
    <Modal
      open
      onClose={onClose}
      title="Add customer feedback"
      subtitle="Saves to User Feedback & Insights"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-brand" onClick={() => act.savefb({ ...v, per: withPersona ? v.per : null })}>
            Save
          </button>
        </>
      }
    >
      <Field label="What did they say?">
        <textarea autoFocus className="field min-h-24" value={v.text} onChange={up("text")} placeholder="Paste their words or a short summary" />
      </Field>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="Who said it">
          <input className="field" value={v.acc} onChange={up("acc")} placeholder="Name or account ID" />
        </Field>
        <Field label="Where it came from">
          <select className="field" value={v.src} onChange={up("src")}>
            {liveOpts(D, "feedback.source", ["In-App", "Survey", "Support Ticket", "User Interview", "Sales Call"], v.src).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="How serious">
          <select className="field" value={v.sev} onChange={up("sev")}>
            {liveOpts(D, "feedback.sentiment", SEV_ORDER, v.sev).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Feature (optional)">
          <select className="field" value={v.feat} onChange={up("feat")}>
            <option value="">— Not sure —</option>
            {D.features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {withPersona && (
        <Field label="Segment">
          <select className="field" value={v.per} onChange={up("per")}>
            {D.personas.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
        </Field>
      )}
    </Modal>
  );
}

const DEPLOY_LABEL: Record<string, string> = {
  redeploy: "Redeploy the live site",
  promote: "Make this test copy live",
  rollback: "Put this older version back live",
};
export function DeployModal() {
  const { modal, setModal } = useSuite();
  if (modal?.kind !== "deploy") return null;
  return <DeployBody action={modal.action} dep={modal.dep} onClose={() => setModal(null)} />;
}
function DeployBody({ action, dep, onClose }: { action: string; dep: string; onClose: () => void }) {
  const { act } = useSuite();
  const [txt, setTxt] = useState("");
  const label = DEPLOY_LABEL[action];
  return (
    <Modal
      open
      onClose={onClose}
      title={`${label}?`}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn bg-bad text-white hover:bg-bad" onClick={() => void act.doDeploy(action, dep, txt)}>
            {label}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-ink-2">
        This changes what visitors see on <b>acrylics.world</b>.
      </p>
      <Field label="Type ACRYLICS to confirm">
        <input autoFocus className="field" autoComplete="off" value={txt} onChange={(e) => setTxt(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function HowtoModal() {
  const { modal, setModal } = useSuite();
  if (modal?.kind !== "howto") return null;
  const close = () => setModal(null);
  return (
    <Modal
      open
      onClose={close}
      title="Connecting this page to Airtable"
      footer={
        <button type="button" className="btn btn-brand" onClick={close}>
          Got it
        </button>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-2">
        Four small server functions go into the existing <b>vcg-ant-connector</b> project on Vercel. They read Airtable and check acrylics.world, so no
        passwords sit in this page. The steps are in the README inside <b>vcg-product-sync.zip</b>.
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        Until then everything here works as a preview: you can click around and change things, but nothing is saved.
      </p>
    </Modal>
  );
}
