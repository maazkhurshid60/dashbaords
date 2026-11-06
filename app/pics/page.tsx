import type { Metadata } from "next";
import { PicsOperations } from "@/components/pics/PicsOperations";
import { loadPics } from "@/lib/pics-live";

export const metadata: Metadata = { title: "P.I.C.S Operations" };

/* Deep link (openFromDeepLink): /pics?open=<picsId> opens that record's detail modal on load,
   e.g. from the DAM's Asset Workflow summary. <picsId> is the Airtable record ID (a P.I.C.S Tag or
   exact name also works). Data is read live from Airtable, falling back to the bundled snapshot. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ open }, { data, live, syncedAt, error }] = await Promise.all([searchParams, loadPics()]);
  return (
    <PicsOperations
      initialOpenId={typeof open === "string" ? open : null}
      data={data}
      source={{ live, syncedAt, error }}
    />
  );
}
