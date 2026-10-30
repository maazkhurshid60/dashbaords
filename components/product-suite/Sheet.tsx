"use client";

/* Right-side sheet (the originals' #drawer): fixed, slides in, Escape / overlay
   closes it, focus moves in on open and returns on close. Full width on phones. */
import { useEffect, useRef, type ReactNode } from "react";
import { IconX } from "@/components/icons";

export function Sheet({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // A modal on top (role=dialog from components/ui) handles its own Escape.
      if (e.key === "Escape" && !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-sheet])')) onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),select,textarea,input,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-[#151726]/35 backdrop-blur-[1px]" onMouseDown={onClose} aria-hidden="true" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        data-sheet=""
        className="sheet-in absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-pop outline-none sm:w-[min(560px,92vw)] sm:rounded-l-[26px]"
        style={{ animation: "sheet-in .2s ease-out" }}
      >
        <style>{`@keyframes sheet-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold leading-snug">{title}</h2>
            {sub && <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-muted">{sub}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-plane text-ink-2 hover:bg-lav"
          >
            <IconX width={16} height={16} />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
