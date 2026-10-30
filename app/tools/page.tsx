import type { Metadata } from "next";
import { HomeCommand } from "@/components/home/HomeCommand";

export const metadata: Metadata = { title: "Tools" };

export default function Page() {
  return <HomeCommand view="tools" />;
}
