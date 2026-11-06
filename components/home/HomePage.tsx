import { HomeCommand, type HomeView } from "@/components/home/HomeCommand";
import { loadHome } from "@/lib/home-live";

/* Server wrapper shared by /, /departments, /tools and /resources: one Airtable load
   (lib/home-live.ts), handed to the client component as props. */
export async function HomePage({ view }: { view: HomeView }) {
  const { data, live, syncedAt, error } = await loadHome();
  return <HomeCommand view={view} data={data} source={{ live, syncedAt, error }} />;
}
