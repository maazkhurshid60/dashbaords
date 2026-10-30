import type { Metadata } from "next";
import { CommsDashboard } from "@/components/communications/CommsDashboard";

export const metadata: Metadata = { title: "Communications Dashboard" };

export default function Page() {
  return <CommsDashboard />;
}
