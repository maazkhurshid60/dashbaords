"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { IconX } from "@/components/icons";
import { cx } from "@/lib/utils";
import { ChatPanel } from "./ChatPanel";

/* Site-wide "Ask an ANT" chat (mounted once in app/layout.tsx). Hidden on /ant, which has the chat inline.
   Sits bottom-right; on /pics it stacks above the P.I.C.S "Report Build Assistant" ✦ button
   (bottom-24/right-4 mobile, bottom-6/right-6 desktop) so the two never overlap. */
export function ChatWidget() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const onAnt = path === "/ant" || path.startsWith("/ant/");
  const onPics = path === "/pics" || path.startsWith("/pics/");
  if (onAnt) return null;
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask an ANT (AI assistant)"
          title="Ask an ANT"
          className={cx(
            "fixed right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-[12px] font-bold text-white shadow-pop transition hover:bg-brand md:right-6",
            onPics ? "bottom-40 md:bottom-24" : "bottom-24 md:bottom-6",
          )}
        >
          <span className="grid size-6 place-items-center rounded-full bg-white/15 text-[11px] font-extrabold">AI</span>
          Ask an ANT
        </button>
      )}
      <div
        role="dialog"
        aria-label="ANT chat"
        hidden={!open}
        className={cx(
          "fixed inset-x-2 bottom-20 top-16 z-50 flex flex-col overflow-hidden rounded-[22px] bg-white shadow-pop md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:h-[min(640px,calc(100vh-48px))] md:w-[400px]",
          open && "animate-pop",
        )}
      >
        <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
          <div className="leading-tight">
            <div className="text-[13.5px] font-extrabold">ANT Connector</div>
            <div className="text-[11px] text-white/60">Claude-powered · team only</div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <IconX width={15} height={15} />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <ChatPanel compact listen onSeed={show} />
        </div>
      </div>
    </>
  );
}
