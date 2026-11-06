"use client";

/* Page frame shared by /product and /communications: the originals' render()
   shell (tabs, banners, intro, sub-tabs, segment bar), header controls (mode pill,
   sync status, acrylics.world site dot) and the drawer / modal host. */
import type { ComponentType, ReactNode } from "react";
import { PageFooter, TopBar } from "@/components/AppShell";
import { IconExternal } from "@/components/icons";
import { cx } from "@/lib/utils";
import { ago, personaColor } from "./format";
import { ClDrawer, FeatureDrawer, FindingDrawer, ManageDrawer, NoteDrawer } from "./drawers";
import { AddFeedbackModal, DeployModal, HowtoModal } from "./modals";
import { ChipBtn, Seg } from "./primitives";
import { SuiteProvider, useIsClient, useSuite, type AppDef, type SuiteServer } from "./useSuite";

/* ---------- sync gate notes ---------- */
export function PreviewRibbon() {
  const { S, act } = useSuite();
  if (!S.preview) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-[12.5px] text-ink">
      <span aria-hidden className="mt-0.5 text-warn">◐</span>
      <div>
        <b>Preview mode.</b> Sections waiting on Airtable are showing with example data so you can review the design. They are not synced.{" "}
        <button type="button" className="font-semibold underline" onClick={act.preview}>
          Turn off
        </button>
      </div>
    </div>
  );
}

/** hiddenNote(): lists the sections that stay hidden until Omni adds the Airtable fields they read. */
export function HiddenNote({ list }: { list: [string | string[], string][] }) {
  const { S, built, act } = useSuite();
  const off = list.filter(([k]) => !built(...([] as string[]).concat(k)));
  if (!off.length) return null;
  const names = off.map(([k, l], i) => {
    const keys = ([] as string[]).concat(k);
    return (
      <span key={l}>
        {i > 0 && " · "}
        <b>{l}</b>{" "}
        <span title={keys.join(", ")}>({keys.map((x) => x.split(".").pop()).join(", ")})</span>
      </span>
    );
  });
  return S.preview ? (
    <div className="border-t border-dashed border-warn pt-3 text-[12px] text-warn">
      <b>Preview on:</b> {names} are showing with example data — they are not synced until Omni adds these to Airtable.{" "}
      <button type="button" className="font-semibold underline" onClick={act.preview}>
        Hide previews
      </button>
    </div>
  ) : (
    <div className="border-t border-dashed border-line-2 pt-3 text-[12px] text-muted">
      Not shown until Omni adds the Airtable fields they read: {names}.{" "}
      <button type="button" className="font-semibold text-brand underline" onClick={act.preview}>
        Preview these designs
      </button>
    </div>
  );
}

/* ---------- header controls ---------- */
function StatusBar() {
  const { D, act, cfg, liveError } = useSuite();
  const live = D.mode === "live";
  const offline = !live && cfg.live && !!liveError;
  const st = D.site.status;
  const siteDot = st === "up" ? "bg-good" : st === "down" ? "bg-bad" : st === "degraded" ? "bg-warn" : "bg-muted";
  const siteLbl = st === "up" ? "up" : st === "down" ? "down" : st === "degraded" ? "slow" : "not checked";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={act.modePill}
        title="Data source"
        className={cx("btn btn-sm", live ? "bg-good-soft text-good hover:bg-good-soft" : "bg-warn-soft text-warn hover:bg-warn-soft")}
      >
        <span className={cx("size-2 rounded-full", live ? "bg-good" : "bg-warn")} />
        {live ? "Live" : "Example data"}
      </button>
      <span className="text-[11.5px] font-medium text-muted" title={offline ? `Airtable: ${liveError}` : undefined}>
        {live
          ? `Airtable · updated ${ago(D.syncedAt)}`
          : offline
            ? "Couldn't reach Airtable · showing example data"
            : "Not connected to Airtable yet · showing example data"}
      </span>
      <a className="btn btn-sm ml-auto" href={cfg.siteUrl} target="_blank" rel="noopener" title={`acrylics.world status: ${siteLbl}`}>
        <span className={cx("size-2 rounded-full", siteDot)} aria-label={`site ${siteLbl}`} />
        acrylics.world <IconExternal width={13} height={13} />
      </a>
    </div>
  );
}

function Banner({ sample, live }: { sample: ReactNode; live?: ReactNode }) {
  const { D } = useSuite();
  if (D.mode === "sample")
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-plane px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
        <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-warn" />
        <div>{sample}</div>
      </div>
    );
  if (!D.warnings || !D.warnings.length || !live) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-good-soft px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
      <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-good" />
      <div>{live}</div>
    </div>
  );
}

/** Persona segment filter (Customers › Feedback / Lifetime value). */
export function SegBar() {
  const { D, S, act } = useSuite();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1">Show</span>
      <ChipBtn on={S.segment.length === 0} onClick={() => act.seg("")}>
        All customers
      </ChipBtn>
      {D.personas.map((p) => (
        <ChipBtn key={p.name} on={S.segment.includes(p.name)} onClick={() => act.seg(p.name)}>
          <span className="size-2 rounded-full" style={{ background: personaColor(p.name) }} />
          {p.name}
        </ChipBtn>
      ))}
    </div>
  );
}

export interface ShellProps {
  title: string;
  bannerSample: ReactNode;
  bannerLive?: ReactNode;
  views: Record<string, ComponentType>;
  /** extra block under the intro for a tab (customersStrip) */
  introExtra?: Record<string, ComponentType>;
  showSegBar?: boolean;
  tabBadge?: (tab: string) => ReactNode;
  extraModals?: ReactNode;
  footerMeta: string;
}

function ShellInner(p: ShellProps) {
  const s = useSuite();
  const { app, S, act, query, setQuery } = s;
  const T = app.tabs.find((t) => t[0] === S.tab) || app.tabs[0];
  const subs = app.subs[T[0]];
  const subKey = subs ? S.sub[T[0]] || subs[0][0] : null;
  const View = p.views[subKey ? `${T[0]}/${subKey}` : T[0]] || p.views[T[0]];
  const Extra = p.introExtra?.[T[0]];
  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="min-w-0 flex-1">
        <TopBar title={p.title} search="Search this page…" query={query} onQuery={setQuery} />
        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8">
          <StatusBar />
          <Seg
            label={`${app.name} views`}
            value={T[0]}
            onChange={act.tab}
            options={app.tabs.map(([k, l]) => ({
              id: k,
              label: (
                <span className="flex items-center gap-1.5">
                  {l}
                  {p.tabBadge?.(k)}
                </span>
              ),
            }))}
          />
          <div className="space-y-3">
            <Banner sample={p.bannerSample} live={p.bannerLive} />
            <PreviewRibbon />
          </div>
          <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-2">{T[2]}</p>
          {Extra && <Extra />}
          {subs && (
            <Seg label={`${T[1]} sections`} value={subKey} onChange={act.sub} options={subs.map(([k, l]) => ({ id: k, label: l }))} />
          )}
          {p.showSegBar && <SegBar />}
          {View && <View />}
          <PageFooter meta={p.footerMeta} />
        </div>
      </main>
      <FeatureDrawer />
      <ManageDrawer />
      <FindingDrawer />
      <ClDrawer />
      <NoteDrawer />
      <AddFeedbackModal />
      <DeployModal />
      <HowtoModal />
      {p.extraModals}
    </div>
  );
}

function Skeleton({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="min-w-0 flex-1">
        <TopBar title={title} />
        <div className="space-y-6 px-5 pb-10 pt-4 sm:px-8" aria-busy="true">
          <div className="h-9 w-72 max-w-full animate-pulse rounded-full bg-plane" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-[22px] bg-plane" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-[22px] bg-plane" />
        </div>
      </main>
    </div>
  );
}

/** A suite page: renders on the client only (local clock, hash, storage) with the shared engine. */
export function SuitePage({
  app, shell, server, children,
}: { app: AppDef; shell: Omit<ShellProps, "showSegBar"> & { segBar?: (s: ReturnType<typeof useSuite>) => boolean }; server?: SuiteServer; children?: ReactNode }) {
  const client = useIsClient();
  if (!client) return <Skeleton title={shell.title} />;
  return (
    <SuiteProvider app={app} server={server}>
      <ShellWithSeg shell={shell} />
      {children}
    </SuiteProvider>
  );
}
function ShellWithSeg({ shell }: { shell: Omit<ShellProps, "showSegBar"> & { segBar?: (s: ReturnType<typeof useSuite>) => boolean } }) {
  const s = useSuite();
  const { segBar, ...rest } = shell;
  return <ShellInner {...rest} showSegBar={segBar ? segBar(s) : false} />;
}
