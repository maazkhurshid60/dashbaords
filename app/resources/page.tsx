import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";

export const metadata: Metadata = { title: "Team Resources" };
export const revalidate = 60;

export default async function Page() {
  return <HomePage view="resources" />;
}
