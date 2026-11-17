import type { Metadata } from "next";
import { AntConnector } from "@/components/ant/AntConnector";
import { loadAntData } from "@/lib/ant-data.server";

export const metadata: Metadata = { title: "ANT Connector" };
export const dynamic = "force-dynamic";

/* ANT Connector — ANT Library, Quick Assists, Prompt Library and ANT Requests, read live from Airtable
   (shared 60s cache). No example data: if Airtable fails the page renders empty with the error badge. */
export default async function Page() {
  const { data, live, syncedAt, error } = await loadAntData();
  return <AntConnector data={data} source={{ live, syncedAt, error }} />;
}
