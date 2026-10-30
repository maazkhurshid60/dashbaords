"use client";

/* Report Build Assistant — bottom-right launcher + panel. A scripted, simulated guide (no AI API) that
   gathers the same Master Reports fields as the New report form. Closing only hides the panel: the thread
   and draft stay in page state so reopening resumes where the user left off. */
import { useEffect, useRef, useState } from "react";
import { IconX } from "@/components/icons";
import type { ReportChatState } from "@/lib/pics-types";
import { cx } from "@/lib/utils";

export function ReportBuildChat({
  open,
  state,
  onToggle,
  onClose,
  onRestart,
  onSend,
}: {
  open: boolean;
  state: ReportChatState;
  onToggle: () => void;
  onClose: () => void;
  onRestart: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages.length, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        title="Report Build Assistant"
        aria-label={open ? "Close Report Build Assistant" : "Open Report Build Assistant"}
        aria-expanded={open}
        className="fixed bottom-24 right-4 z-40 grid size-13 place-items-center rounded-full bg-brand text-[20px] text-white shadow-[0_10px_24px_-6px_rgb(91_43_224/0.6)] transition hover:bg-brand-600 md:bottom-6 md:right-6"
      >
        {open ? <IconX width={20} height={20} /> : "✦"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Report Build Assistant"
          className="animate-pop fixed inset-x-3 bottom-40 z-40 flex max-h-[min(560px,calc(100vh-12rem))] flex-col overflow-hidden rounded-[22px] bg-white shadow-pop ring-1 ring-line sm:left-auto sm:right-6 sm:w-[380px] md:bottom-24"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <div className="text-[14.5px] font-extrabold">Report Build Assistant</div>
              <div className="text-[11.5px] text-muted">RANT-guided · Master Reports table · scripted (no live AI)</div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={onRestart}
                title="Start a new report"
                aria-label="Start a new report"
                className="grid size-8 place-items-center rounded-full bg-plane text-[15px] text-ink-2 hover:bg-lav"
              >
                ↺
              </button>
              <button type="button" onClick={onClose} title="Close" aria-label="Close" className="grid size-8 place-items-center rounded-full bg-plane text-ink-2 hover:bg-lav">
                <IconX width={14} height={14} />
              </button>
            </div>
          </div>

          <div ref={bodyRef} className="scroll-thin flex-1 space-y-2.5 overflow-y-auto bg-plane/60 px-4 py-4" aria-live="polite">
            {state.messages.map((m, i) =>
              m.from === "system" ? (
                <div key={i} className="text-center text-[10.5px] font-bold uppercase tracking-wider text-muted">
                  {m.text}
                </div>
              ) : (
                <div
                  key={i}
                  className={cx(
                    "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed",
                    m.from === "user" ? "ml-auto rounded-br-md bg-brand text-white" : "rounded-bl-md bg-white text-ink shadow-card",
                  )}
                >
                  {m.text}
                </div>
              ),
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-line px-3 py-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              placeholder="Type your answer…"
              aria-label="Your answer"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="field max-h-28 min-h-9 resize-none"
            />
            <button type="button" className="btn btn-brand btn-sm h-9" onClick={send}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
