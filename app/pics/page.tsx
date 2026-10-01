import type { Metadata } from "next";
import { PicsOperations } from "@/components/pics/PicsOperations";

export const metadata: Metadata = { title: "P.I.C.S Operations" };

export default function Page() {
  return <PicsOperations />;
}
