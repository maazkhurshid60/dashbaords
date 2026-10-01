import type { Metadata } from "next";
import { ProductivityCenter } from "@/components/productivity/ProductivityCenter";

export const metadata: Metadata = { title: "Productivity Center" };

export default function Page() {
  return <ProductivityCenter />;
}
