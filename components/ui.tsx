"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconChevron, IconX } from "./icons";
import { cx } from "@/lib/utils";

/* ---------------- Toast ---------------- */

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={cx(
          "pointer-events-none fixed bottom-6 left-1/2 z-60 -translate-x-1/2 transition-all duration-200",
          msg ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-[13px] font-semibold text-white shadow-pop">
          <span className="size-2 rounded-full bg-[#4ade80]" />
          {msg}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ---------------- Modal ---------------- */

const modalStack: object[] = [];

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const token = {};
    modalStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      // Only the top-most modal reacts, so Escape in a nested editor doesn't close its parent.
      if (e.key === "Escape" && modalStack.at(-1) === token) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      modalStack.splice(modalStack.indexOf(token), 1);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#151726]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "animate-pop flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-pop sm:rounded-[26px]",
          wide ? "sm:max-w-3xl" : "sm:max-w-xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold leading-snug">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[12px] font-medium text-muted">{subtitle}</div>}
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
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Avatar ---------------- */

const AVATAR_TONES = [
  "bg-[#efe9fd] text-[#4a1fc4]",
  "bg-[#ffe9dc] text-[#b4461a]",
  "bg-[#dff5ec] text-[#0d7a55]",
  "bg-[#fff1cf] text-[#8a5a00]",
  "bg-[#fde4ee] text-[#b02a62]",
  "bg-[#e1edfc] text-[#1c5cab]",
];

function toneFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({
  initials,
  size = 40,
  ring,
  online,
  className,
}: {
  initials: string;
  size?: number;
  ring?: boolean;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("relative inline-flex shrink-0", className)}>
      <span
        className={cx(
          "grid place-items-center rounded-full font-extrabold",
          toneFor(initials),
          ring && "ring-[3px] ring-[#14b8a6] ring-offset-[3px] ring-offset-white",
        )}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.32) }}
      >
        {initials}
      </span>
      {online && (
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#22c55e]" />
      )}
    </span>
  );
}

/* ---------------- Status pill ---------------- */

const STATUS_TONE: Record<string, string> = {
  Completed: "bg-good-soft text-good",
  Approved: "bg-good-soft text-good",
  done: "bg-good-soft text-good",
  "In Progress": "bg-brand-soft text-brand",
  "In Review": "bg-brand-soft text-brand",
  "Ready for Review": "bg-brand-soft text-brand",
  Planning: "bg-brand-soft text-brand",
  "Agenda Prep": "bg-teal-soft text-teal",
  "At Risk": "bg-bad-soft text-bad",
  Rejected: "bg-bad-soft text-bad",
  overdue: "bg-bad-soft text-bad",
  Delayed: "bg-warn-soft text-warn",
  upcoming: "bg-warn-soft text-warn",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold",
        STATUS_TONE[status] ?? "bg-plane text-ink-2",
        className,
      )}
    >
      {status}
    </span>
  );
}

/* ---------------- Section heading inside a card ---------------- */

export function CardHead({
  icon,
  title,
  eyebrow,
  sub,
  right,
}: {
  icon?: ReactNode;
  title: ReactNode;
  eyebrow?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h3 className="flex items-center gap-2 text-[18px] font-extrabold tracking-tight">
          {icon}
          {title}
        </h3>
        {sub && <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-ink-2">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/* ---------------- Collapsible group ---------------- */

export function Collapsible({
  label,
  count,
  defaultOpen = false,
  children,
  tone = "plain",
}: {
  label: ReactNode;
  count?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  tone?: "plain" | "soft";
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cx("rounded-2xl", tone === "soft" && "bg-plane")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-plane"
      >
        <span className="flex items-center gap-2 text-[12.5px] font-extrabold">
          {label}
          {count != null && <span className="text-[11px] font-semibold text-muted">{count}</span>}
        </span>
        <IconChevron
          width={16}
          height={16}
          className={cx("text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-1 pb-2">{children}</div>}
    </div>
  );
}

/* ---------------- Select ---------------- */

export function Select({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "h-9 cursor-pointer rounded-full border border-line-2 bg-white pl-3.5 pr-8 text-[12px] font-semibold text-ink outline-none focus:border-brand",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
