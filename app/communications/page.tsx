import type { Metadata } from "next";
import { CommsDashboard } from "@/components/communications/CommsDashboard";
import { airtableConfigured } from "@/lib/airtable.server";
import { loadCommsPayload } from "@/lib/product-live.server";

export const metadata: Metadata = { title: "Communications Dashboard" };
export const dynamic = "force-dynamic";

/* Live when Airtable is configured: first render carries the Communications payload (60s server
   cache), then the page polls /api/comms/data. Example snapshot otherwise. */
export default async function Page() {
  const live = airtableConfigured();
  const payload = live ? await loadCommsPayload() : null;
  return <CommsDashboard server={{ live, payload }} />;
}
