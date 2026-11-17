"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import { cx } from "@/lib/utils";
import type { Section, SocialData } from "@/lib/social-types";
import { Empty, Pill, send } from "./si-ui";

/* Application Builder: pick a Grant Application, edit its Grant Application Sections.
   Save → PATCH /api/social/sections/<id>; Save to Answer Library → POST /api/social/answers;
   Draft with AI → POST /api/chat (503 until ANTHROPIC_API_KEY is set; shown as "AI not connected yet"). */
const AREA = "Application Builder";
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function Builder({ data, appId, onApp }: { data: SocialData; appId: string | null; onApp: (id: string) => void }) {
  const apps = data.applications.filter((a) => data.sections.some((s) => s.appId === a.id));
  const app = data.applications.find((a) => a.id === appId) ?? apps[0] ?? data.applications[0];
  const sections = useMemo(
    () => (app ? data.sections.filter((s) => s.appId === app.id).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : []),
    [app, data.sections],
  );
  const [secId, setSecId] = useState<string | null>(null);
  const sec = sections.find((s) => s.id === secId) ?? sections[0];
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => setAi(!!j.configured))
      .catch(() => setAi(false));
  }, []);

  if (!data.applications.length) return <Empty>No Grant Applications yet.</Empty>;

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="flex flex-col gap-3">
        <label className="block">
          <span className="eyebrow mb-1 block">Application</span>
          <select
            value={app?.id ?? ""}
            onChange={(e) => {
              onApp(e.target.value);
              setSecId(null);
            }}
            className="h-10 w-full rounded-full border border-line-2 bg-white px-3 text-[12.5px] font-semibold outline-none focus:border-brand"
          >
            {data.applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {sections.length ? (
          <ol className="flex flex-col gap-1.5">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSecId(s.id)}
                  aria-current={sec?.id === s.id ? "true" : undefined}
                  className={cx("flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[12.5px]", sec?.id === s.id ? "bg-ink text-white" : "bg-plane hover:bg-line")}
                >
                  <span className="font-semibold">{s.title}</span>
                  <span className={cx("shrink-0 text-[10.5px] font-bold", sec?.id === s.id ? "text-white/70" : "text-muted")}>{s.status || "—"}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>This application has no sections yet.</Empty>
        )}
      </aside>
      {sec ? <SectionEditor key={sec.id} sec={sec} data={data} ai={ai} /> : <div />}
    </div>
  );
}

function SectionEditor({ sec, data, ai }: { sec: Section; data: SocialData; ai: boolean | null }) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState(sec.draft);
  const [status, setStatus] = useState(sec.status);
  const [used, setUsed] = useState(sec.answersUsed);
  const [busy, setBusy] = useState<"" | "save" | "lib" | "ai">("");
  const [aiError, setAiError] = useState("");
  const dirty = draft !== sec.draft || status !== sec.status || used.join() !== sec.answersUsed.join();
  const wc = words(draft);
  const over = (sec.wordLimit != null && wc > sec.wordLimit) || (sec.charLimit != null && draft.length > sec.charLimit);
  const library = data.answers.filter((a) => a.approved && a.body);

  async function save() {
    setBusy("save");
    const patch: Record<string, unknown> = { area: AREA };
    if (draft !== sec.draft) patch.draft = draft;
    if (status !== sec.status && status) patch.status = status;
    if (used.join() !== sec.answersUsed.join()) patch.answersUsed = used;
    const r = await send(`/api/social/sections/${sec.id}`, "PATCH", patch);
    setBusy("");
    toast(r.ok ? "Section saved" : `Couldn't save: ${r.error}`);
    if (r.ok) router.refresh();
  }

  async function toLibrary() {
    if (!draft.trim()) return toast("Write an answer first");
    setBusy("lib");
    const r = await send("/api/social/answers", "POST", { title: sec.title, body: draft, sectionId: sec.id, area: AREA });
    setBusy("");
    toast(r.ok ? "Saved to Answer Library (pending approval)" : `Couldn't save: ${r.error}`);
    if (r.ok) router.refresh();
  }

  async function draftWithAi() {
    setBusy("ai");
    setAiError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system:
            "You draft grant application answers for Vision Creative Group (VCG). Answer the funder prompt directly, in plain prose, within the limits given. Do not invent figures; mark anything to confirm in [brackets].",
          message: `Section: ${sec.title}\nFunder prompt: ${sec.prompt || "(none)"}\n${sec.wordLimit ? `Word limit: ${sec.wordLimit}\n` : ""}${sec.charLimit ? `Character limit: ${sec.charLimit}\n` : ""}Current draft:\n${draft || "(empty)"}`,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; reply?: string; error?: string };
      if (res.status === 503) setAiError("AI not connected yet — ANTHROPIC_API_KEY isn't set on the server.");
      else if (!res.ok || !j.reply) setAiError(j.error || `AI request failed (${res.status})`);
      else setDraft(j.reply);
    } catch {
      setAiError("AI request failed (network error)");
    }
    setBusy("");
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[18px] font-semibold">{sec.title}</h2>
        {sec.required && <Pill tone="warn">Required</Pill>}
        {sec.type && <Pill>{sec.type}</Pill>}
      </div>
      {sec.prompt && <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-plane p-4 text-[12.5px] text-ink-2">{sec.prompt}</p>}
      <label className="mt-4 block">
        <span className="sr-only">Draft response</span>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={16} className="w-full rounded-2xl border border-line-2 p-4 text-[13px] leading-relaxed outline-none focus:border-brand" />
      </label>
      <div className={cx("mt-1 text-[11.5px]", over ? "font-bold text-bad" : "text-muted")}>
        {wc} words{sec.wordLimit ? ` / ${sec.wordLimit}` : ""} · {draft.length} characters{sec.charLimit ? ` / ${sec.charLimit}` : ""}
      </div>
      {aiError && <div className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-warn">{aiError}</div>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          aria-label="Section status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-full border border-line-2 bg-white px-3 text-[12px] font-semibold outline-none focus:border-brand"
        >
          {!status && <option value="">Status…</option>}
          {data.choices.sectionStatus.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" disabled={!dirty || !!busy} onClick={save} className="btn btn-dark bg-ink text-white disabled:opacity-50">
          {busy === "save" ? "Saving…" : "Save"}
        </button>
        <button type="button" disabled={!!busy} onClick={toLibrary} className="btn disabled:opacity-50">
          {busy === "lib" ? "Saving…" : "Save to Answer Library"}
        </button>
        <button
          type="button"
          disabled={!!busy || ai === false}
          onClick={draftWithAi}
          title={ai === false ? "AI not connected yet (ANTHROPIC_API_KEY not set)" : "Draft this section with AI"}
          className="btn disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "ai" ? "Drafting…" : ai === false ? "Draft with AI · not connected yet" : "Draft with AI"}
        </button>
      </div>
      <div className="mt-6">
        <div className="eyebrow mb-2">Answer Library</div>
        {library.length ? (
          <ul className="flex flex-col gap-2">
            {library.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl bg-plane px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold">{a.title}</div>
                  <p className="line-clamp-2 text-[11.5px] text-ink-2">{a.body}</p>
                </div>
                <button
                  type="button"
                  className="btn h-8 shrink-0 px-3 text-[11.5px]"
                  onClick={() => {
                    setDraft((d) => (d.trim() ? `${d}\n\n${a.body}` : a.body));
                    setUsed((u) => (u.includes(a.id) ? u : [...u, a.id]));
                  }}
                >
                  Insert
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No approved answers in the Answer Library yet.</Empty>
        )}
      </div>
    </section>
  );
}
