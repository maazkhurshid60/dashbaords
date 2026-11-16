"use client";

/* /product — VCG Product Dashboard (port of VCG_Product_Dashboard.html). */
import { buildSample, CFG, mulberry } from "@/lib/product-data";
import type { Persona, ProductData, SuiteData } from "@/lib/product-types";
import { NEW_ITEMS, setSuiteClock } from "@/components/product-suite/logic";
import { SuitePage } from "@/components/product-suite/Shell";
import { type AppDef, type LivePayload, type SuiteServer } from "@/components/product-suite/useSuite";
import { CustomersStrip, LtvView, SegmentsView } from "@/components/product-suite/views/Customers";
import { FeaturesView } from "@/components/product-suite/views/Features";
import { FeedbackView } from "@/components/product-suite/views/Feedback";
import { RoadmapView } from "@/components/product-suite/views/Pics";
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
    ["performance", "Performance", ""],
    ["customers", "Customers", ""],
    ["roadmap", "Roadmap", ""],
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

export function ProductDashboard({ server }: { server?: SuiteServer }) {
  return (
    <SuitePage
      app={PRODUCT_APP}
      server={server}
      shell={{
        title: "Product Dashboard",
        minimal: true,
        views: {
          "performance/website": WebsiteView,
          "performance/features": FeaturesView,
          "customers/segments": SegmentsView,
          "customers/feedback": FeedbackView,
          "customers/ltv": LtvView,
          roadmap: RoadmapView,
        },
        introExtra: { customers: CustomersStrip },
        segBar: ({ S, has }) =>
          S.tab === "customers" && (S.sub.customers === "ltv" || (S.sub.customers === "feedback" && has("User Feedback & Insights.Related Persona"))),
        footerMeta: "",
      }}
    />
  );
}
