import type { Metadata } from "next";
import { PicsOperations } from "@/components/pics/PicsOperations";

export const metadata: Metadata = { title: "P.I.C.S Operations" };

/* Deep link (openFromDeepLink): /pics?open=<picsId> opens that record's detail modal on load,
   e.g. from the DAM's Asset Workflow summary. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { open } = await searchParams;
  return <PicsOperations initialOpenId={typeof open === "string" ? open : null} />;
}
