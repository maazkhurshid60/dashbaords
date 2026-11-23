"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { IconChat, IconX } from "@/components/icons";
import { cx } from "@/lib/utils";
import { ChatPanel } from "./ChatPanel";

/* Site-wide "Ask an ANT" chat (mounted once in app/layout.tsx). Hidden on /ant, which has its own Chat tab.
   Launcher sits in the bottom-right corner (24px inset): icon-only round button on mobile, icon + label on desktop.
   On /pics the P.I.C.S ✦ button owns the bottom-right corner, so the launcher shifts left of it (right: 84px).
   The panel opens above the launcher: max 600px / 90vh with its own scroll; a full-width bottom sheet on mobile. */
export function ChatWidget() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const onAnt = path === "/ant" || path.startsWith("/ant/");
  const onPics = path === "/pics" || path.startsWith("/pics/");
  if (onAnt || path === "/login") return null;
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask an ANT (AI assistant)"
          title="Ask an ANT"
          className={cx(
            "fixed bottom-20 z-40 flex size-12 md:bottom-6 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ink text-[12px] font-bold text-white shadow-pop transition hover:bg-brand md:w-auto md:px-4",
            onPics ? "right-[84px]" : "right-6",
          )}
        >
          <IconChat width={18} height={18} className="shrink-0" />
          <span className="hidden md:inline">Ask an ANT</span>
        </button>
      )}
      <div
        role="dialog"
        aria-label="ANT chat"
        hidden={!open}
        className={cx(
          "fixed inset-x-0 bottom-0 z-50 flex h-[min(600px,90vh)] flex-col overflow-hidden rounded-t-[22px] bg-white shadow-pop",
          "md:inset-x-auto md:bottom-6 md:w-[400px] md:rounded-[22px]",
          onPics ? "md:right-[84px]" : "md:right-6",
          open && "animate-pop",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
          <div className="leading-tight">
            <div className="text-[13.5px] font-extrabold">ANT Connector</div>
            <div className="text-[11px] text-white/60">Claude-powered · team only</div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
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
