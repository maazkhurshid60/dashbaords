import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";

export const metadata: Metadata = { title: "Tools" };
export const revalidate = 60;

export default async function Page() {
  return <HomePage view="tools" />;
}
