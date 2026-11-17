import type { Metadata } from "next";
import { SocialImpact } from "@/components/social-impact/SocialImpact";
import { loadSocial } from "@/lib/social-data.server";
import { SI_VIEWS, type SiView } from "@/lib/social-types";

export const metadata: Metadata = { title: "Social Impact" };

/* Social Impact Grant Scraper (sibling of the ANT Connector). /social-impact?view=<View name> opens a view.
   Data is read live from Airtable (60s cache); no example data — empty states when tables are empty. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ view }, { data, live, syncedAt, error }] = await Promise.all([searchParams, loadSocial()]);
  const initial = SI_VIEWS.find((v) => v === view) as SiView | undefined;
  return <SocialImpact data={data} source={{ live, syncedAt, error }} initialView={initial ?? "Overview"} />;
}
