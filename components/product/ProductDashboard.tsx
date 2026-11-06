"use client";

/* /product — VCG Product Dashboard (port of VCG_Product_Dashboard.html). */
import { buildSample, CFG, mulberry } from "@/lib/product-data";
import type { Persona, ProductData, SuiteData } from "@/lib/product-types";
import { ago } from "@/components/product-suite/format";
import { NEW_ITEMS, setSuiteClock } from "@/components/product-suite/logic";
import { SuitePage } from "@/components/product-suite/Shell";
import { useSuite, type AppDef, type LivePayload, type SuiteServer } from "@/components/product-suite/useSuite";
import { CustomersStrip, LtvView, SegmentsView } from "@/components/product-suite/views/Customers";
import { FeaturesView } from "@/components/product-suite/views/Features";
import { FeedbackView } from "@/components/product-suite/views/Feedback";
import { LaunchView, RoadmapView } from "@/components/product-suite/views/Pics";
import { WebsiteView } from "@/components/product-suite/views/Website";

/** Sections live mode replaces when the endpoint returns them; sections still waiting on a NEW
    Airtable table stay empty in live mode rather than showing sample rows. */
const LIVE_KEYS = [
  "ants", "team", "sweep", "pics", "channels", "areas", "personas", "features", "feedback", "accounts", "revenue", "spend", "sprints", "backlog",
  "health", "gates", "gtm", "releases", "pagePerf", "objectives", "themes", "adoption", "wau", "weeks", "cohorts", "experiments", "sitemapTotal", "options",
] as const;

export function mergeProductLive(j: LivePayload): SuiteData {
  const data = j.data || {};
  setSuiteClock(true); // live rows are dated by the real clock
  const base = buildSample(mulberry(20261201)) as unknown as Record<string, unknown>;
  LIVE_KEYS.forEach((k) => {
    base[k] = k in data ? data[k] : Array.isArray(base[k]) ? [] : null;
  });
  const sample = buildSample().personas;
  const out = base as unknown as ProductData;
  out.personas = ((data.personas as Persona[]) || []).map((p) => {
    const s: Partial<Persona> = sample.find((x) => x.name === p.name || x.full === p.name) || {};
    return { ...s, ...p, hex: s.hex || "#6B6E76", color: s.color || "var(--slate)" } as Persona;
  });
  /* live mode: no example deployments / uptime / vitals — /api/product/site fills what it can check */
  out.site = { ...out.site, status: "unknown", http: null, ms: null, checkedAt: null, ssl: null, deployments: [], uptime: [], vitals: null, errorRate: null };
  out.mode = "live";
  out.syncedAt = j.syncedAt || new Date().toISOString();
  out.warnings = j.warnings || [];
  out.missing = j.missing || [];
  return out;
}

export const PRODUCT_APP: AppDef = {
  key: "product",
  dept: "Product",
  name: "Product",
  cfg: CFG,
  build: () => buildSample(),
  merge: mergeProductLive,
  tabs: [
    ["performance", "Performance", "Is acrylics.world working, and how is each feature doing with customers?"],
    ["customers", "Customers", "Who uses ACRYLICS, how they feel, and what each customer is worth over time."],
    ["roadmap", "Roadmap", "What we are building and when. Pick a product P.I.C.S to see its progress — synced with P.I.C.S Roadmaps."],
    ["launch", "Launch", "Everything being launched — the MVP, feature tests, community programs, events. Pick one to see its checklist."],
  ],
  subs: {
    performance: [
      ["website", "Website"],
      ["features", "Features"],
    ],
    customers: [
      ["segments", "Segments & personas"],
      ["feedback", "Feedback"],
      ["ltv", "Lifetime value"],
    ],
  },
  newItems: NEW_ITEMS,
  site: true,
};

function LiveBanner() {
  const { D } = useSuite();
  return (
    <>
      <b>Connected to Airtable</b> · updated {ago(D.syncedAt)}. Some sections are empty until {D.warnings?.length} Airtable fields are added.{" "}
      <details className="inline">
        <summary className="inline cursor-pointer underline">Which ones?</summary>
        <div className="mt-1.5 text-[12px]">
          {(D.warnings || []).map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      </details>
    </>
  );
}
function SampleBanner() {
  const { act } = useSuite();
  return (
    <>
      <b className="text-ink">Showing example data.</b> This page isn&apos;t connected to Airtable yet, so the numbers are examples of what you&apos;ll see. Persona
      descriptions, prices, the P.I.C.S roadmap and the launch checklist are copied from Airtable.{" "}
      <button type="button" className="font-semibold text-brand underline" onClick={act.howto}>
        How to connect it
      </button>
    </>
  );
}

export function ProductDashboard({ server }: { server?: SuiteServer }) {
  return (
    <SuitePage
      app={PRODUCT_APP}
      server={server}
      shell={{
        title: "Product Dashboard",
        bannerSample: <SampleBanner />,
        bannerLive: <LiveBanner />,
        views: {
          "performance/website": WebsiteView,
          "performance/features": FeaturesView,
          "customers/segments": SegmentsView,
          "customers/feedback": FeedbackView,
          "customers/ltv": LtvView,
          roadmap: RoadmapView,
          launch: LaunchView,
        },
        introExtra: { customers: CustomersStrip },
        segBar: ({ S, has }) =>
          S.tab === "customers" && (S.sub.customers === "ltv" || (S.sub.customers === "feedback" && has("User Feedback & Insights.Related Persona"))),
        footerMeta: server?.live
          ? "Live from the Airtable VCG Intranet base · acrylics.world checked via /api/product/site"
          : "Airtable VCG Intranet base · acrylics.world via /api/product/* · example snapshot anchored to Sep 28, 2026",
      }}
    />
  );
}
