import type { Metadata } from "next";
import { ProductDashboard } from "@/components/product/ProductDashboard";

export const metadata: Metadata = { title: "Product Dashboard" };

export default function Page() {
  return <ProductDashboard />;
}
