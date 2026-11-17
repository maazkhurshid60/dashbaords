import type { Metadata } from "next";
import { CrmApp } from "@/components/crm/CrmApp";
import { loadCrm } from "@/lib/crm-live";

export const metadata: Metadata = { title: "Communications" };
export const dynamic = "force-dynamic";

/* Communications CRM: Inbox · Contacts · Pipelines · Campaigns · Insights · Updates.
   Live Airtable data is loaded server-side (lib/crm-live.ts) and handed to the client. */
export default async function Page() {
  const data = await loadCrm();
  return <CrmApp initial={data} />;
}
