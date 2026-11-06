import type { Metadata } from "next";
import { ProductivityCenter } from "@/components/productivity/ProductivityCenter";
import { loadProductivity } from "@/lib/productivity-live";

export const metadata: Metadata = { title: "Productivity Center" };

/* Re-rendered at most once a minute (Airtable reads are cached 60s per table; writes
   from /api/productivity/* invalidate their table immediately). */
export const revalidate = 60;

export default async function Page() {
  const { data, live, syncedAt, error } = await loadProductivity();
  return <ProductivityCenter data={data} source={{ live, syncedAt, error }} />;
}
