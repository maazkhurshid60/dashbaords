import type { Metadata } from "next";
import { PicsOperations } from "@/components/pics/PicsOperations";
import { loadPics } from "@/lib/pics-live";
import { loadPicsCard } from "@/lib/pics-card";
import { packCard, packOps } from "@/lib/pics-pack";
import { isPicsTab } from "@/lib/pics-tabs";

export const metadata: Metadata = { title: "P.I.C.S Operations" };

/* Deep link (openFromDeepLink): /pics?open=<picsId> opens that record's master card on load,
   e.g. from the DAM's Asset Workflow summary or a copied "view-only link". <picsId> is the Airtable record ID
   (a P.I.C.S Tag or exact name also works). Department view: /pics#dept=<Department> (OPS-24).
   Data is read live from Airtable, falling back to the bundled snapshot. Both datasets are packed
   (lib/pics-pack.ts) so the page doesn't ship the same records twice. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ open, tab, stage }, { data, live, syncedAt, error }, card] = await Promise.all([searchParams, loadPics(), loadPicsCard()]);
  // ?tab=<section> picks the Operations sub-page; a deep link (?open=) lands on Records, where the card opens.
  const initialTab = isPicsTab(tab) ? tab : typeof open === "string" ? "records" : "overview";
  return (
    <PicsOperations
      initialTab={initialTab}
      initialStage={typeof stage === "string" ? stage : null}
      initialOpenId={typeof open === "string" ? open : null}
      data={packOps(data, card.data)}
      source={{ live, syncedAt, error }}
      card={packCard(card.data)}
      cardSource={{ live: card.live, syncedAt: card.syncedAt, error: card.error }}
    />
  );
}
