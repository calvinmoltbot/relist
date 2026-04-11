import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getTargets } from "@/lib/settings";

// ---------------------------------------------------------------------------
// GET /api/dashboard — Morning dashboard data
// ---------------------------------------------------------------------------
export async function GET() {
  const allItems = await db.select().from(items).orderBy(desc(items.createdAt));

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Categorise items
  const sourced = allItems.filter((i) => i.status === "sourced");
  const listed = allItems.filter((i) => i.status === "listed");
  const sold = allItems.filter((i) => i.status === "sold");
  const shipped = allItems.filter((i) => i.status === "shipped");

  // Items needing action
  const needsListing = sourced.map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand,
    daysWaiting: daysSince(i.createdAt),
  }));

  const needsShipping = sold.map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand,
    soldAt: i.soldAt?.toISOString() ?? null,
    daysSinceSold: daysSince(i.soldAt),
  }));

  // Stale listings (listed for more than 14 days)
  const staleListings = listed
    .filter((i) => daysSince(i.listedAt) > 14)
    .map((i) => ({
      id: i.id,
      name: i.name,
      brand: i.brand,
      listedPrice: i.listedPrice,
      daysListed: daysSince(i.listedAt),
    }));

  // This month's sales
  const monthSold = [...sold, ...shipped].filter(
    (i) => i.soldAt && i.soldAt.toISOString().startsWith(currentMonthKey),
  );
  const monthRevenue = monthSold.reduce(
    (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0),
    0,
  );
  const monthCost = monthSold.reduce(
    (sum, i) => sum + (i.costPrice ? parseFloat(i.costPrice) : 0),
    0,
  );
  const monthProfit = monthRevenue - monthCost;

  // This week's sales (last 7 days)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekSold = [...sold, ...shipped].filter(
    (i) => i.soldAt && i.soldAt >= weekAgo,
  );
  const weekRevenue = weekSold.reduce(
    (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0),
    0,
  );

  // Revenue targets (from DB settings)
  const targets = await getTargets();
  const MONTHLY_TARGET = targets.monthlyRevenueTarget;
  const WEEKLY_HOURS = targets.weeklyHours;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyRate = dayOfMonth > 0 ? monthRevenue / dayOfMonth : 0;
  const projectedRevenue = round(dailyRate * daysInMonth);

  // Effective hourly rate
  const hoursThisMonth = (dayOfMonth / 7) * WEEKLY_HOURS;
  const hourlyRate = hoursThisMonth > 0 ? monthProfit / hoursThisMonth : 0;

  // Recent activity (last 5 status changes)
  const recentActivity = allItems
    .filter((i) => i.updatedAt)
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      name: i.name,
      status: i.status,
      updatedAt: i.updatedAt?.toISOString() ?? null,
    }));

  return NextResponse.json({
    greeting: getGreeting(),
    stats: {
      totalItems: allItems.length,
      sourced: sourced.length,
      listed: listed.length,
      sold: sold.length,
      shipped: shipped.length,
    },
    month: {
      key: currentMonthKey,
      revenue: round(monthRevenue),
      profit: round(monthProfit),
      itemsSold: monthSold.length,
      target: MONTHLY_TARGET,
      progress: round((monthRevenue / MONTHLY_TARGET) * 100),
      projected: projectedRevenue,
      onTrack: projectedRevenue >= MONTHLY_TARGET,
      daysRemaining: daysInMonth - dayOfMonth,
    },
    week: {
      revenue: round(weekRevenue),
      itemsSold: weekSold.length,
    },
    hourlyRate: round(hourlyRate),
    targetHourlyRate: targets.targetHourlyRate,
    actions: {
      needsListing,
      needsShipping,
      staleListings,
    },
    recentActivity,
  });
}

function daysSince(date: Date | null | undefined): number {
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
