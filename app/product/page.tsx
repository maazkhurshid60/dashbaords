import type { Metadata } from "next";
import { ProductDashboard } from "@/components/product/ProductDashboard";
import { airtableConfigured } from "@/lib/airtable.server";
import { loadProductPayload } from "@/lib/product-live.server";

export const metadata: Metadata = { title: "Product Dashboard" };
export const dynamic = "force-dynamic";

/* The server decides live vs example: when Airtable is configured the page opens on live data
   (read through the shared 60s cache) and keeps polling /api/product/data; otherwise the seeded
   example snapshot. NEXT_PUBLIC_VCG_LIVE / NEXT_PUBLIC_VCG_API_BASE still force live mode. */
export default async function Page() {
  const live = airtableConfigured();
  const payload = live ? await loadProductPayload() : null;
  return <ProductDashboard server={{ live, payload }} />;
}
