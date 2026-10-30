import type { Metadata } from "next";
import { HomeCommand } from "@/components/home/HomeCommand";

export const metadata: Metadata = { title: "Departments" };

export default function Page() {
  return <HomeCommand view="departments" />;
}
