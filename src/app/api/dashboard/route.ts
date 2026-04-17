import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, userSettings } from "@/db/schema";
import { eq, sql, and, gte, lt, or } from "drizzle-orm";
import { getTargets } from "@/lib/settings";
import { buildDailyPlan } from "@/lib/daily-plan";

// ---------------------------------------------------------------------------
// GET /api/dashboard — Morning dashboard data
// ---------------------------------------------------------------------------
export async function GET() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 1);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Run targeted queries in parallel instead of fetching all items
  const [
    statusCounts,
    needsListingRows,
    needsShippingRows,
    staleListingRows,
    monthSoldRows,
    weekSoldRows,
    recentActivityRows,
    targets,
    dailyPlan,
  ] = await Promise.all([
    // Count by status
    db.select({
      status: items.status,
      count: sql<number>`count(*)::int`,
    }).from(items).groupBy(items.status),

    // Sourced items (needs listing)
    db.select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      createdAt: items.createdAt,
    }).from(items).where(eq(items.status, "sourced")),

    // Sold items (needs shipping)
    db.select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      soldAt: items.soldAt,
    }).from(items).where(eq(items.status, "sold")),

    // Stale listings (listed 14+ days ago)
    db.select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      listedPrice: items.listedPrice,
      listedAt: items.listedAt,
    }).from(items).where(
      and(
        eq(items.status, "listed"),
        lt(items.listedAt, fourteenDaysAgo),
      ),
    ),

    // This month's sold/shipped items
    db.select({
      soldPrice: items.soldPrice,
      costPrice: items.costPrice,
    }).from(items).where(
      and(
        or(eq(items.status, "sold"), eq(items.status, "shipped")),
        gte(items.soldAt, monthStart),
        lt(items.soldAt, monthEnd),
      ),
    ),

    // This week's sold/shipped items (with soldAt for daily breakdown)
    db.select({
      soldPrice: items.soldPrice,
      soldAt: items.soldAt,
    }).from(items).where(
      and(
        or(eq(items.status, "sold"), eq(items.status, "shipped")),
        gte(items.soldAt, weekAgo),
      ),
    ),

    // Recent activity (last 5 updated)
    db.select({
      id: items.id,
      name: items.name,
      status: items.status,
      updatedAt: items.updatedAt,
    }).from(items)
      .orderBy(sql`${items.updatedAt} DESC NULLS LAST`)
      .limit(5),

    getTargets(),
    buildDailyPlan(),
  ]);

  // Parse status counts
  const counts: Record<string, number> = {};
  let totalItems = 0;
  for (const row of statusCounts) {
    counts[row.status] = row.count;
    totalItems += row.count;
  }

  // Month calculations
  const monthRevenue = monthSoldRows.reduce(
    (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0), 0,
  );
  const monthCost = monthSoldRows.reduce(
    (sum, i) => sum + (i.costPrice ? parseFloat(i.costPrice) : 0), 0,
  );
  const monthProfit = monthRevenue - monthCost;

  // Week calculations
  const weekRevenue = weekSoldRows.reduce(
    (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0), 0,
  );

  // Daily buckets for the last 7 days (index 0 = 6 days ago, index 6 = today)
  const dailyBuckets: { date: string; dayOfWeek: number; count: number; revenue: number }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    dailyBuckets.push({
      date: d.toISOString().slice(0, 10),
      dayOfWeek: d.getDay(),
      count: 0,
      revenue: 0,
    });
  }
  const todayKey = dailyBuckets[6].date;
  const startKey = dailyBuckets[0].date;
  const bucketByDate = new Map(dailyBuckets.map((b) => [b.date, b]));
  for (const row of weekSoldRows) {
    if (!row.soldAt) continue;
    const key = row.soldAt.toISOString().slice(0, 10);
    if (key < startKey || key > todayKey) continue;
    const bucket = bucketByDate.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.revenue += row.soldPrice ? parseFloat(row.soldPrice) : 0;
  }
  const todayItemsSold = dailyBuckets[6].count;

  // Revenue targets
  const MONTHLY_TARGET = targets.monthlyRevenueTarget;
  const WEEKLY_HOURS = targets.weeklyHours;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyRate = dayOfMonth > 0 ? monthRevenue / dayOfMonth : 0;
  const projectedRevenue = round(dailyRate * daysInMonth);

  const hoursThisMonth = (dayOfMonth / 7) * WEEKLY_HOURS;
  const hourlyRate = hoursThisMonth > 0 ? monthProfit / hoursThisMonth : 0;

  return NextResponse.json(
    {
    greeting: getGreeting(),
    stats: {
      totalItems,
      sourced: counts["sourced"] ?? 0,
      listed: counts["listed"] ?? 0,
      sold: counts["sold"] ?? 0,
      shipped: counts["shipped"] ?? 0,
    },
    month: {
      key: currentMonthKey,
      revenue: round(monthRevenue),
      profit: round(monthProfit),
      itemsSold: monthSoldRows.length,
      target: MONTHLY_TARGET,
      progress: round((monthRevenue / MONTHLY_TARGET) * 100),
      projected: projectedRevenue,
      onTrack: projectedRevenue >= MONTHLY_TARGET,
      daysRemaining: daysInMonth - dayOfMonth,
    },
    week: {
      revenue: round(weekRevenue),
      itemsSold: weekSoldRows.length,
      todayItemsSold,
      daily: dailyBuckets.map((b) => ({
        date: b.date,
        dayOfWeek: b.dayOfWeek,
        count: b.count,
        revenue: round(b.revenue),
      })),
    },
    hourlyRate: round(hourlyRate),
    targetHourlyRate: targets.targetHourlyRate,
    activeListingsTarget: targets.activeListingsTarget,
    urgentShipDays: targets.urgentShipDays,
    lastBackupAt: await (async () => {
      const [row] = await db
        .select({ value: userSettings.value })
        .from(userSettings)
        .where(eq(userSettings.key, "last_backup_at"))
        .limit(1);
      return row?.value ?? null;
    })(),
    actions: {
      needsListing: needsListingRows.map((i) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        daysWaiting: daysSince(i.createdAt),
      })),
      needsShipping: needsShippingRows.map((i) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        soldAt: i.soldAt?.toISOString() ?? null,
        daysSinceSold: daysSince(i.soldAt),
      })),
      staleListings: staleListingRows.map((i) => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        listedPrice: i.listedPrice,
        daysListed: daysSince(i.listedAt),
      })),
    },
    recentActivity: recentActivityRows.map((i) => ({
      id: i.id,
      name: i.name,
      status: i.status,
      updatedAt: i.updatedAt?.toISOString() ?? null,
    })),
    dailyPlan,
    },
    {
      headers: {
        // Short private cache so rapid dashboard refreshes don't re-hit origin
        "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
      },
    },
  );
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
