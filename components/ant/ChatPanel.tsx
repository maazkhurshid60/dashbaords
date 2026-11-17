"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui";
import { IconArrowRight, IconExternal } from "@/components/icons";
import { cx } from "@/lib/utils";
import { OPEN_CHAT_EVENT, type AntOption, type ChatMsg, type OpenChatDetail } from "@/lib/ant-types";

/* The Claude chat used by the site-wide widget and the "Ask an ANT" section of /ant.
   Talks to POST /api/chat with {antId, messages, context:{page}}; the system prompt is built
   server-side. "Save to ANT Requests" posts the transcript to /api/ant/request (kind "chat"). */

let antCache: Promise<AntOption[]> | null = null;
const loadAnts = () =>
  (antCache ??= fetch("/api/ant/ants")
    .then((r) => r.json())
    .then((j: { ants?: AntOption[] }) => j.ants || [])
    .catch(() => {
      antCache = null;
      return [];
    }));

let configCache: Promise<boolean> | null = null;
const loadConfigured = () =>
  (configCache ??= fetch("/api/chat")
    .then((r) => r.json())
    .then((j: { configured?: boolean }) => !!j.configured)
    .catch(() => {
      configCache = null;
      return false;
    }));

const HIER_ORDER = ["Orchestrator", "Master ANT", "Command ANT", ""];

export function ChatPanel({ compact, listen, onSeed }: { compact?: boolean; listen?: boolean; onSeed?: () => void }) {
  const path = usePathname();
  const toast = useToast();
  const [ants, setAnts] = useState<AntOption[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [antId, setAntId] = useState("");
  const [qaId, setQaId] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let live = true;
    loadAnts().then((a) => live && setAnts(a));
    loadConfigured().then((c) => live && setConfigured(c));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!listen) return;
    const on = (e: Event) => {
      const d = (e as CustomEvent<OpenChatDetail>).detail || {};
      setMsgs([]);
      setSavedId("");
      setError("");
      setAntId(d.antId || "");
      setQaId(d.quickAssistId || "");
      setDraft(d.text || "");
      onSeed?.();
      setTimeout(() => input.current?.focus(), 50);
    };
    window.addEventListener(OPEN_CHAT_EVENT, on);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, on);
  }, [listen, onSeed]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const antName = ants.find((a) => a.id === antId)?.name || "VCG Intranet assistant";

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const next: ChatMsg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    setError("");
    setSavedId("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ antId: antId || undefined, messages: next, context: { page: path } }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; reply?: string; error?: string };
      if (res.status === 503) {
        setConfigured(false);
        configCache = Promise.resolve(false);
      }
      if (!j.ok) throw new Error(j.error || `Error ${res.status}`);
      setMsgs([...next, { role: "assistant", content: j.reply || "(no answer)" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function save(status: "Completed" | "Pending") {
    setSaving(true);
    try {
      const res = await fetch("/api/ant/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "chat", antId: antId || undefined, quickAssistId: qaId || undefined, status, messages: msgs }),
      });
      const j = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!j.ok) throw new Error(j.error || "Save failed");
      setSavedId(j.id || "saved");
      toast(`Saved to ANT Requests as ${status}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const grouped = HIER_ORDER.map((h) => ({ h, list: ants.filter((a) => (HIER_ORDER.includes(a.hierarchy) ? a.hierarchy : "") === h) })).filter((g) => g.list.length);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <label className="sr-only" htmlFor={compact ? "ant-pick-w" : "ant-pick"}>
          ANT
        </label>
        <select
          id={compact ? "ant-pick-w" : "ant-pick"}
          value={antId}
          onChange={(e) => {
            setAntId(e.target.value);
            setQaId("");
          }}
          className="h-9 min-w-0 flex-1 cursor-pointer rounded-full border border-line-2 bg-white pl-3.5 pr-8 text-[12px] font-semibold outline-none focus:border-brand"
        >
          <option value="">VCG Intranet assistant (orchestrator)</option>
          {grouped.map((g) => (
            <optgroup key={g.h || "other"} label={g.h || "Unassigned hierarchy"}>
              {g.list.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {msgs.length > 0 && (
          <button type="button" className="btn btn-sm" onClick={() => (setMsgs([]), setSavedId(""), setError(""))}>
            New chat
          </button>
        )}
      </div>

      {configured === false && (
        <div className="mx-4 mt-3 rounded-2xl bg-warn-soft px-4 py-3 text-[12px] leading-relaxed text-warn">
          <strong>AI not connected yet</strong> — add <code className="font-mono">ANTHROPIC_API_KEY</code> to the server environment (.env.local) and restart. Quick Assists, prompts
          and ANT Requests still work.
        </div>
      )}

      <div ref={scroller} className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && (
          <div className="rounded-2xl bg-plane p-4 text-[12.5px] leading-relaxed text-ink-2">
            Ask <strong className="text-ink">{antName}</strong> anything about your work. It knows which page you’re on
            {antId ? " and answers from this ANT’s brain, functions and expected outputs." : "; pick a specialist ANT above for department work."}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cx(
                "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                m.role === "user" ? "bg-brand text-white" : "bg-plane text-ink",
              )}
            >
              {m.role === "assistant" && <div className="eyebrow mb-1 !text-[9.5px]">{antName}</div>}
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-[12px] font-semibold text-muted">{antName} is thinking…</div>}
        {error && <div className="rounded-2xl bg-bad-soft px-3.5 py-2.5 text-[12px] text-bad">{error}</div>}
      </div>

      {msgs.some((m) => m.role === "assistant") && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2 text-[11.5px]">
          <span className="font-semibold text-muted">{savedId ? "Saved to ANT Requests ✓" : "Save to ANT Requests as"}</span>
          {!savedId && (
            <>
              <button type="button" className="btn btn-sm" disabled={saving} onClick={() => save("Completed")}>
                Completed
              </button>
              <button type="button" className="btn btn-sm" disabled={saving} onClick={() => save("Pending")}>
                Pending
              </button>
            </>
          )}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-line px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={compact ? 2 : 3}
          placeholder={configured === false ? "AI not connected yet" : `Message ${antName}…`}
          aria-label="Message"
          className="field scroll-thin max-h-40 min-h-[44px] flex-1 resize-y"
        />
        <button type="submit" className="btn btn-brand size-11 shrink-0 !px-0" disabled={busy || !draft.trim() || configured === false} aria-label="Send">
          <IconArrowRight width={18} height={18} />
        </button>
      </form>
      {compact && (
        <div className="border-t border-line px-4 py-2 text-right">
          <Link href="/ant" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand hover:underline">
            Open full ANT Connector <IconExternal width={13} height={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
