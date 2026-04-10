import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";

// ---------------------------------------------------------------------------
// GET /api/profit — Aggregate profit stats from items table
// ---------------------------------------------------------------------------
export async function GET() {
  const allItems = await db.select().from(items);

  const sold = allItems.filter(
    (i) => i.status === "sold" || i.status === "shipped",
  );
  const listed = allItems.filter((i) => i.status === "listed");
  const sourced = allItems.filter((i) => i.status === "sourced");

  // Revenue & costs
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  const itemProfits: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    cost: number;
    sold: number;
    profit: number;
    soldAt: string | null;
    sourceType: string | null;
  }[] = [];

  for (const item of sold) {
    const cost = item.costPrice ? parseFloat(item.costPrice) : 0;
    const soldPrice = item.soldPrice ? parseFloat(item.soldPrice) : 0;
    const profit = soldPrice - cost;

    totalRevenue += soldPrice;
    totalCost += cost;
    totalProfit += profit;

    itemProfits.push({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      cost,
      sold: soldPrice,
      profit,
      soldAt: item.soldAt?.toISOString() ?? null,
      sourceType: item.sourceType,
    });
  }

  // Stock value (unsold items)
  let stockCost = 0;
  let stockListed = 0;
  for (const item of [...listed, ...sourced]) {
    stockCost += item.costPrice ? parseFloat(item.costPrice) : 0;
    stockListed += item.listedPrice ? parseFloat(item.listedPrice) : 0;
  }

  // Profit by category
  const byCategory: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};
  for (const ip of itemProfits) {
    const cat = ip.category || "uncategorised";
    if (!byCategory[cat]) byCategory[cat] = { revenue: 0, cost: 0, profit: 0, count: 0 };
    byCategory[cat].revenue += ip.sold;
    byCategory[cat].cost += ip.cost;
    byCategory[cat].profit += ip.profit;
    byCategory[cat].count += 1;
  }

  // Profit by source
  const bySource: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};
  for (const ip of itemProfits) {
    const src = ip.sourceType || "unknown";
    if (!bySource[src]) bySource[src] = { revenue: 0, cost: 0, profit: 0, count: 0 };
    bySource[src].revenue += ip.sold;
    bySource[src].cost += ip.cost;
    bySource[src].profit += ip.profit;
    bySource[src].count += 1;
  }

  // Monthly timeline (for chart)
  const byMonth: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};
  for (const ip of itemProfits) {
    const month = ip.soldAt
      ? ip.soldAt.substring(0, 7) // "2026-04"
      : "unknown";
    if (!byMonth[month]) byMonth[month] = { revenue: 0, cost: 0, profit: 0, count: 0 };
    byMonth[month].revenue += ip.sold;
    byMonth[month].cost += ip.cost;
    byMonth[month].profit += ip.profit;
    byMonth[month].count += 1;
  }

  // Average margin
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgProfit = sold.length > 0 ? totalProfit / sold.length : 0;

  // Revenue targets (Lily's goals)
  const MONTHLY_TARGET = 3000;
  const SIX_MONTH_TARGET = 1500;
  const WEEKLY_HOURS = 25;

  // Current month revenue
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthItems = itemProfits.filter(
    (ip) => ip.soldAt && ip.soldAt.startsWith(currentMonthKey),
  );
  const monthRevenue = currentMonthItems.reduce((sum, ip) => sum + ip.sold, 0);
  const monthProfit = currentMonthItems.reduce((sum, ip) => sum + ip.profit, 0);
  const monthItemsSold = currentMonthItems.length;

  // Days elapsed / remaining in month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // Projected monthly revenue (run rate)
  const dailyRate = dayOfMonth > 0 ? monthRevenue / dayOfMonth : 0;
  const projectedMonthRevenue = round(dailyRate * daysInMonth);

  // Effective hourly rate (this month)
  const hoursThisMonth = (dayOfMonth / 7) * WEEKLY_HOURS;
  const effectiveHourlyRate = hoursThisMonth > 0 ? monthProfit / hoursThisMonth : 0;

  return NextResponse.json({
    summary: {
      totalRevenue: round(totalRevenue),
      totalCost: round(totalCost),
      totalProfit: round(totalProfit),
      avgMargin: round(avgMargin),
      avgProfitPerItem: round(avgProfit),
      itemsSold: sold.length,
      itemsListed: listed.length,
      itemsSourced: sourced.length,
      stockCost: round(stockCost),
      stockListedValue: round(stockListed),
    },
    targets: {
      monthlyTarget: MONTHLY_TARGET,
      sixMonthTarget: SIX_MONTH_TARGET,
      weeklyHours: WEEKLY_HOURS,
      currentMonth: currentMonthKey,
      monthRevenue: round(monthRevenue),
      monthProfit: round(monthProfit),
      monthItemsSold,
      projectedMonthRevenue,
      daysRemaining,
      revenueProgress: round((monthRevenue / MONTHLY_TARGET) * 100),
      effectiveHourlyRate: round(effectiveHourlyRate),
      targetHourlyRate: 18,
      onTrack: projectedMonthRevenue >= MONTHLY_TARGET,
    },
    itemProfits: itemProfits.sort((a, b) => b.profit - a.profit),
    byCategory: Object.entries(byCategory)
      .map(([category, data]) => ({ category, ...roundObj(data) }))
      .sort((a, b) => b.profit - a.profit),
    bySource: Object.entries(bySource)
      .map(([source, data]) => ({ source, ...roundObj(data) }))
      .sort((a, b) => b.profit - a.profit),
    byMonth: Object.entries(byMonth)
      .filter(([k]) => k !== "unknown")
      .map(([month, data]) => ({ month, ...roundObj(data) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundObj<T extends Record<string, number>>(obj: T): T {
  const result = {} as Record<string, number>;
  for (const [k, v] of Object.entries(obj)) {
    result[k] = round(v);
  }
  return result as T;
}
