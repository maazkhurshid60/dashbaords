import { HomePage } from "@/components/home/HomePage";

export const revalidate = 15;

export default async function Page() {
  return <HomePage view="overview" />;
}
