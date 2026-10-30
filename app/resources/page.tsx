import type { Metadata } from "next";
import { HomeCommand } from "@/components/home/HomeCommand";

export const metadata: Metadata = { title: "Team Resources" };

export default function Page() {
  return <HomeCommand view="resources" />;
}
