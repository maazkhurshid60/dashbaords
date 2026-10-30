"use client";

/* /communications — VCG Communications Dashboard (port of VCG_Communications_Dashboard.html):
   the shared Product engine + the Communications layer (Inbox / Insights / Updates). */
import { buildComms } from "@/lib/comms-data";
import { COMMS_CFG } from "@/lib/product-data";
import type { SuiteData } from "@/lib/product-types";
import { ago } from "@/components/product-suite/format";
import { COMMS_NEW_ITEMS } from "@/components/product-suite/logic";
import { Pill } from "@/components/product-suite/primitives";
import { SuitePage } from "@/components/product-suite/Shell";
import { useSuite, type AppDef, type LivePayload } from "@/components/product-suite/useSuite";
import { bucket, visibleTickets } from "./comms";
import { InboxView } from "./Inbox";
import { InsightsView } from "./Insights";
import { UpdatesView, UpModal } from "./Updates";

export function mergeCommsLive(j: LivePayload): SuiteData {
  const data = j.data || {};
  const base = buildComms() as unknown as Record<string, unknown>;
  ["tickets", "team", "announcements", "depts"].forEach((k) => {
    base[k] = k in data ? data[k] : [];
  });
  const out = base as unknown as SuiteData;
  out.mode = "live";
  out.syncedAt = j.syncedAt || new Date().toISOString();
  out.warnings = j.warnings || [];
  out.missing = j.missing || [];
  return out;
}

export const COMMS_APP: AppDef = {
  key: "comms",
  dept: "Communications",
  name: "Communications",
  cfg: COMMS_CFG,
  build: buildComms,
  merge: mergeCommsLive,
  tabs: [
    [
      "inbox",
      "Inbox",
      "Everything people send us — Gmail, the site contact form, the chatbot and the community help board — in one list. Start with “Needs a reply”. Sweeps and auto-reply rules are managed on the Automations dashboard.",
    ],
    ["insights", "Insights", "How much is coming in, what it is about, and how fast we answer — for the dates you pick."],
    ["updates", "Updates", "Every update posted to the intranet — the Home page and each department page. Department leads and admins post here with “Create new”."],
  ],
  subs: {},
  newItems: COMMS_NEW_ITEMS,
  site: false,
};

function SampleBanner() {
  const { act } = useSuite();
  return (
    <>
      <b className="text-ink">Showing example data.</b> Not connected to Airtable yet. The Gmail messages are copied from the Communications table (logged by
      SUCANT&apos;s daily Email Intake Scan). Site contact form, chatbot and community messages are examples — those sources aren&apos;t flowing in yet.{" "}
      <button type="button" className="font-semibold text-brand underline" onClick={act.howto}>
        How to connect it
      </button>
    </>
  );
}
function LiveBanner() {
  const { D } = useSuite();
  return (
    <>
      <b>Connected to Airtable</b> · updated {ago(D.syncedAt)}. {D.warnings?.length} Airtable items still to add — their sections stay hidden.
    </>
  );
}
function InboxBadge() {
  const { D, has } = useSuite();
  const need = visibleTickets(D, has).filter((t) => bucket(t) === "needs").length;
  return need ? (
    <Pill tone="bad" className="h-5 px-1.5 text-[10px]">
      {need}
    </Pill>
  ) : null;
}

export function CommsDashboard() {
  return (
    <SuitePage
      app={COMMS_APP}
      shell={{
        title: "Communications Dashboard",
        bannerSample: <SampleBanner />,
        bannerLive: <LiveBanner />,
        views: { inbox: InboxView, insights: InsightsView, updates: UpdatesView },
        tabBadge: (k) => (k === "inbox" ? <InboxBadge /> : null),
        extraModals: <UpModal />,
        footerMeta: "Communications table · Gmail via SUCANT's Email Intake Scan · example snapshot anchored to Sep 28, 2026",
      }}
    />
  );
}
