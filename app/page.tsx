import { HomePage } from "@/components/home/HomePage";

export const revalidate = 60;

export default async function Page() {
  return <HomePage view="overview" />;
}
