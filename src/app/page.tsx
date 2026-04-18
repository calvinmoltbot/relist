import { getDashboardData } from "@/lib/dashboard";
import DashboardClient from "./dashboard-client";

// Cache the page render for 60s so back-navigation doesn't always hit Neon.
// Client-side mutations can trigger a router refresh or a direct call to
// /api/dashboard to update sooner.
export const revalidate = 60;

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
