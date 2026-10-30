"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconBell,
  IconBook,
  IconBuilding,
  IconChat,
  IconCommand,
  IconCube,
  IconDoc,
  IconImage,
  IconMegaphone,
  IconGrid,
  IconHeart,
  IconLayers,
  IconMenu,
  IconPie,
  IconPlus,
  IconSearch,
  IconSync,
  IconTarget,
  IconTool,
} from "./icons";
import { Avatar } from "./ui";
import { cx } from "@/lib/utils";

export const AIRTABLE_BASE_URL = "https://airtable.com/appLH1D7ME6mU1zgE";

/* Same nav as the original intranet pages. Items without an href are pages
   the client hasn't handed over yet (ANT Connector, Social Impact, …). */
const NAV: { href?: string; label: string; Icon: typeof IconGrid; mobile?: string }[] = [
  { href: "/", label: "Home", Icon: IconGrid, mobile: "Home" },
  { href: "/departments", label: "Departments", Icon: IconBuilding },
  { href: "/tools", label: "Tools", Icon: IconTool },
  { href: "/resources", label: "Team Resources", Icon: IconBook },
  { label: "ANT Connector", Icon: IconTarget },
  { href: "/pics", label: "Operations", Icon: IconLayers, mobile: "Ops" },
  { href: "/productivity", label: "Productivity", Icon: IconPie, mobile: "Productivity" },
  { href: "/product", label: "Product", Icon: IconCube, mobile: "Product" },
  { href: "/communications", label: "Communications", Icon: IconChat, mobile: "Comms" },
  { label: "Marketing & Sales", Icon: IconMegaphone },
  { label: "Social Impact", Icon: IconHeart },
  { label: "Briefs Hub", Icon: IconDoc },
  { label: "DAM", Icon: IconImage },
  { label: "Automations", Icon: IconCommand },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href?: string) => !!href && (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <div className="flex min-h-screen bg-shell">
      <nav
        aria-label="Main"
        className={cx(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-shell py-6 transition-[width] duration-200 md:flex",
          open ? "w-[236px] px-4" : "w-[88px] items-center",
        )}
      >
        <div className={cx("mb-8 flex items-center gap-3", open ? "px-1" : "justify-center")}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse menu" : "Expand menu"}
            aria-expanded={open}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-ink hover:bg-plane"
          >
            <IconMenu width={22} height={22} />
          </button>
          {open && (
            <div className="min-w-0 leading-tight">
              <div className="text-[14px] font-extrabold">VCG Intranet</div>
              <div className="text-[11px] text-muted">Operations dashboard</div>
            </div>
          )}
        </div>

        <ul className={cx("scroll-thin flex flex-1 flex-col gap-1.5 overflow-y-auto", !open && "items-center")}>
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href);
            const cls = cx(
              "flex items-center gap-3 rounded-2xl transition",
              open ? "h-11 w-full px-3" : "size-12 justify-center",
              active
                ? "bg-brand-soft text-ink"
                : href
                  ? "text-muted hover:bg-plane hover:text-ink"
                  : "cursor-not-allowed text-muted/60",
            );
            const body = (
              <>
                <Icon width={21} height={21} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                {open && <span className={cx("flex-1 truncate text-[13px] font-semibold", active && "font-bold")}>{label}</span>}
                {open && !href && (
                  <span className="rounded-full bg-plane px-2 py-0.5 text-[9.5px] font-bold uppercase text-muted">Soon</span>
                )}
              </>
            );
            return (
              <li key={label} className={cx(open && "w-full")}>
                {href ? (
                  <Link href={href} title={label} aria-label={label} aria-current={active ? "page" : undefined} className={cls}>
                    {body}
                  </Link>
                ) : (
                  <span title={`${label} — not part of this build yet`} aria-disabled="true" className={cls}>
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className={cx("mt-4 flex flex-col gap-4", open ? "px-1" : "items-center")}>
          <a
            href={AIRTABLE_BASE_URL}
            target="_blank"
            rel="noopener"
            title="Open the Airtable Intranet base"
            aria-label="Open the Airtable Intranet base"
            className={cx(
              "flex items-center justify-center gap-2 rounded-full bg-brand text-white shadow-[0_10px_24px_-6px_rgb(91_43_224/0.6)] transition hover:bg-brand-600",
              open ? "h-11 text-[12.5px] font-bold" : "size-12",
            )}
          >
            <IconPlus width={20} height={20} strokeWidth={2.4} />
            {open && "Open Airtable"}
          </a>
          <span
            title="Airtable sync pending — showing a snapshot"
            className={cx("flex items-center gap-2 text-[11.5px] font-semibold text-muted", !open && "justify-center")}
          >
            <span className="relative">
              <IconSync width={20} height={20} />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[#f5b301]" />
            </span>
            {open && "Airtable sync pending"}
          </span>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">{children}</div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-white/95 px-2 py-2 backdrop-blur md:hidden"
      >
        {NAV.filter((n) => n.mobile).map(({ href, mobile, Icon }) => (
          <Link
            key={href}
            href={href!}
            aria-current={isActive(href) ? "page" : undefined}
            className={cx(
              "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold",
              isActive(href) ? "bg-brand-soft text-brand" : "text-muted",
            )}
          >
            <Icon width={20} height={20} />
            {mobile}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/* Top bar used at the head of each page's main column. The search box filters
   the page's records; ⌘K / Ctrl+K focuses it, as on the original pages. */
export function TopBar({
  title,
  search,
  query,
  onQuery,
}: {
  title: ReactNode;
  search?: string;
  query?: string;
  onQuery?: (q: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!onQuery) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onQuery]);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-5 pb-2 pt-6 sm:px-8 sm:pt-8">
      <h1 className="text-[26px] font-medium tracking-tight sm:text-[30px]">{title}</h1>
      <div className="flex w-full items-center gap-3 sm:w-auto sm:gap-5">
        {search && onQuery && (
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-plane px-4 text-[12.5px] text-muted focus-within:ring-2 focus-within:ring-brand sm:w-72 sm:flex-none">
            <IconSearch width={16} height={16} className="shrink-0" />
            <input
              ref={ref}
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={search}
              className="w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-muted"
              aria-label={search}
            />
            <kbd className="hidden shrink-0 rounded-md bg-white px-1.5 py-0.5 font-sans text-[10.5px] font-bold text-muted lg:block">
              ⌘K
            </kbd>
          </label>
        )}
        <button type="button" aria-label="Notifications" className="relative shrink-0 text-muted hover:text-ink">
          <IconBell width={21} height={21} />
          <span className="absolute right-0 top-0 size-2 rounded-full bg-brand ring-2 ring-white" />
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <Avatar initials="ID" size={42} />
          <div className="hidden leading-tight xl:block">
            <div className="text-[13px] font-semibold">Isis Darks</div>
            <div className="text-[11px] text-muted">VCG Intranet</div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* Footer links carried over from the original pages. */
export function PageFooter({ meta }: { meta: string }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[12px]">
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
        <Link href="/pics" className="text-brand hover:underline">
          P.I.C.S Operations
        </Link>
        <Link href="/productivity" className="text-brand hover:underline">
          Productivity Center
        </Link>
        <a href={AIRTABLE_BASE_URL} target="_blank" rel="noopener" className="text-brand hover:underline">
          Airtable Intranet
        </a>
        <Link href="/" className="text-brand hover:underline">
          Home Command
        </Link>
        <span className="cursor-not-allowed text-muted" title="Not part of this build yet">
          ANT Connector · Social Impact
        </span>
      </div>
      <div className="text-[11px] text-muted">{meta}</div>
    </footer>
  );
}

/* Right-hand profile + activity column. */
export function SidePanel({
  title,
  feedTitle,
  children,
  footnote = "Snapshot · Airtable sync pending",
}: {
  title: string;
  feedTitle: string;
  children: ReactNode;
  footnote?: string;
}) {
  return (
    <aside className="w-full shrink-0 border-t border-line bg-plane px-6 py-8 xl:w-[330px] xl:border-l xl:border-t-0">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{title}</span>
        <span className="relative text-muted" title="Airtable sync pending">
          <IconSync width={18} height={18} />
        </span>
      </div>
      <div className="mt-6 flex flex-col items-center text-center">
        <Avatar initials="ID" size={78} ring />
        <div className="mt-4 text-[18px] font-semibold">Isis Darks</div>
        <div className="text-[11.5px] text-muted">CEO · Executive</div>
        <div className="mt-4 text-[24px] font-extrabold leading-tight tracking-tight">VCG Intranet</div>
        <p className="mt-2 max-w-[250px] text-[12.5px] leading-relaxed text-ink-2">
          Operations, P.I.C.S roadmaps and team productivity in one place.
        </p>
        <a href={AIRTABLE_BASE_URL} target="_blank" rel="noopener" className="btn btn-dark mt-5 h-10 px-6">
          Open Airtable
        </a>
      </div>
      <div className="mt-10">
        <div className="eyebrow mb-3">{feedTitle}</div>
        <ul className="divide-y divide-line-2">{children}</ul>
      </div>
      <p className="mt-6 text-center font-mono text-[11px] text-muted">{footnote}</p>
    </aside>
  );
}

export function FeedItem({
  initials,
  name,
  text,
  badge,
  online,
  onClick,
}: {
  initials: string;
  name: string;
  text: ReactNode;
  badge?: number;
  online?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <li>
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className="flex w-full items-start gap-3.5 rounded-2xl px-1 py-4 text-left hover:bg-white/70"
      >
        <Avatar initials={initials} size={46} online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13.5px] font-bold">{name}</span>
            {badge ? (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </div>
          <div className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{text}</div>
        </div>
      </Tag>
    </li>
  );
}
