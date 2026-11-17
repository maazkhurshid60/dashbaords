import type { Metadata } from "next";
import { ProductDashboard } from "@/components/product/ProductDashboard";
import { PicsCardDataProvider } from "@/components/pics-card/CardDataContext";
import { airtableConfigured } from "@/lib/airtable.server";
import { filterCardByDept, loadPicsCard } from "@/lib/pics-card";
import { loadProductPayload } from "@/lib/product-live.server";

export const metadata: Metadata = { title: "Product Dashboard" };
export const dynamic = "force-dynamic";

/* The server decides live vs example: when Airtable is configured the page opens on live data
   (read through the shared 60s cache) and keeps polling /api/product/data; otherwise the seeded
   example snapshot. NEXT_PUBLIC_VCG_LIVE / NEXT_PUBLIC_VCG_API_BASE still force live mode.
   PRD-6/PRD-8: the Roadmap tab renders the P.I.C.S Master Card, narrowed server-side to P.I.C.S whose
   Related Department(s) contains "Product" (plus their parents/children so the tree resolves). */
export default async function Page() {
  const live = airtableConfigured();
  const [payload, card] = await Promise.all([live ? loadProductPayload() : null, loadPicsCard()]);
  return (
    <PicsCardDataProvider data={filterCardByDept(card.data, "Product")} source={{ live: card.live, syncedAt: card.syncedAt, error: card.error }}>
      <ProductDashboard server={{ live, payload }} />
    </PicsCardDataProvider>
  );
}
