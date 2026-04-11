import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, transactions, expenses } from "@/db/schema";
import { eq, and, gte, lte, or, sql } from "drizzle-orm";
import { getTargets } from "@/lib/settings";

// ---------------------------------------------------------------------------
// GET /api/profit — Financial analytics with date filtering
//
// Query params:
//   from=YYYY-MM-DD  — start date (inclusive)
//   to=YYYY-MM-DD    — end date (inclusive)
//   preset=this_month|last_month|last_90_days|this_year|tax_year|all_time
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targets = await getTargets();

  // ── Date range resolution ────────────────────────────────────
  const { from, to } = resolveDateRange(searchParams);

  // ── Load all items ───────────────────────────────────────────
  const allItems = await db.select().from(items);

  // Sold items (optionally filtered by date range)
  const hasDateFilter = from != null || to != null;
  const sold = allItems.filter((i) => {
    if (i.status !== "sold" && i.status !== "shipped") return false;
    if (hasDateFilter && !i.soldAt) return false;
    if (from && i.soldAt && i.soldAt < from) return false;
    if (to && i.soldAt && i.soldAt > to) return false;
    return true;
  });

  const listed = allItems.filter((i) => i.status === "listed");
  const sourced = allItems.filter((i) => i.status === "sourced");

  // ── Load transactions for net profit ─────────────────────────
  const soldItemIds = new Set(sold.map((i) => i.id));
  const allTransactions = await db.select().from(transactions);
  const relevantTx = allTransactions.filter((t) => soldItemIds.has(t.itemId));

  // Map item → transaction for fee data
  const txByItem = new Map(relevantTx.map((t) => [t.itemId, t]));

  // ── Calculate financials ─────────────────────────────────────
  let totalRevenue = 0;
  let totalCost = 0;
  let grossProfit = 0;
  let totalShipping = 0;
  let totalFees = 0;

  interface ItemProfit {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    cost: number;
    sold: number;
    profit: number;
    netProfit: number;
    soldAt: string | null;
    sourceType: string | null;
    listedAt: string | null;
    daysToSell: number | null;
  }

  const itemProfits: ItemProfit[] = [];

  for (const item of sold) {
    const cost = item.costPrice ? parseFloat(item.costPrice) : 0;
    const soldPrice = item.soldPrice ? parseFloat(item.soldPrice) : 0;
    const profit = soldPrice - cost;

    const tx = txByItem.get(item.id);
    const shipping = tx ? parseFloat(tx.shippingCost ?? "0") : 0;
    const fees = tx ? parseFloat(tx.platformFees ?? "0") : 0;
    const netProfit = soldPrice - cost - shipping - fees;

    totalRevenue += soldPrice;
    totalCost += cost;
    grossProfit += profit;
    totalShipping += shipping;
    totalFees += fees;

    // Days to sell
    let daysToSell: number | null = null;
    if (item.listedAt && item.soldAt) {
      daysToSell = Math.round(
        (item.soldAt.getTime() - item.listedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    itemProfits.push({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      cost,
      sold: soldPrice,
      profit,
      netProfit,
      soldAt: item.soldAt?.toISOString() ?? null,
      sourceType: item.sourceType,
      listedAt: item.listedAt?.toISOString() ?? null,
      daysToSell,
    });
  }

  // ── Load business expenses ────────────────────────────────────
  const expenseConditions = [];
  if (from) expenseConditions.push(gte(expenses.incurredAt, from));
  if (to) expenseConditions.push(lte(expenses.incurredAt, to));

  const allExpenses = await db
    .select()
    .from(expenses)
    .where(expenseConditions.length ? and(...expenseConditions) : undefined);

  let totalExpenses = 0;
  const byExpenseCategory: Record<string, number> = {};
  for (const exp of allExpenses) {
    const amt = parseFloat(exp.amount);
    totalExpenses += amt;
    byExpenseCategory[exp.category] = (byExpenseCategory[exp.category] ?? 0) + amt;
  }

  const netProfit = grossProfit - totalShipping - totalFees - totalExpenses;

  // ── Stock value (always current, not date-filtered) ──────────
  let stockCost = 0;
  let stockListed = 0;
  for (const item of [...listed, ...sourced]) {
    stockCost += item.costPrice ? parseFloat(item.costPrice) : 0;
    stockListed += item.listedPrice ? parseFloat(item.listedPrice) : 0;
  }

  // ── Breakdowns ───────────────────────────────────────────────
  const byCategory: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};
  const bySource: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};
  const byMonth: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};

  for (const ip of itemProfits) {
    // Category
    const cat = ip.category || "uncategorised";
    if (!byCategory[cat]) byCategory[cat] = { revenue: 0, cost: 0, profit: 0, count: 0 };
    byCategory[cat].revenue += ip.sold;
    byCategory[cat].cost += ip.cost;
    byCategory[cat].profit += ip.netProfit;
    byCategory[cat].count += 1;

    // Source
    const src = ip.sourceType || "unknown";
    if (!bySource[src]) bySource[src] = { revenue: 0, cost: 0, profit: 0, count: 0 };
    bySource[src].revenue += ip.sold;
    bySource[src].cost += ip.cost;
    bySource[src].profit += ip.netProfit;
    bySource[src].count += 1;

    // Month
    const month = ip.soldAt ? ip.soldAt.substring(0, 7) : "unknown";
    if (!byMonth[month]) byMonth[month] = { revenue: 0, cost: 0, profit: 0, count: 0 };
    byMonth[month].revenue += ip.sold;
    byMonth[month].cost += ip.cost;
    byMonth[month].profit += ip.netProfit;
    byMonth[month].count += 1;
  }

  // ── Metrics ──────────────────────────────────────────────────
  const avgMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const avgProfit = sold.length > 0 ? netProfit / sold.length : 0;
  const sellThroughRate =
    sold.length + listed.length > 0
      ? (sold.length / (sold.length + listed.length)) * 100
      : 0;

  // Average days to sell
  const itemsWithDays = itemProfits.filter((ip) => ip.daysToSell != null);
  const avgDaysToSell =
    itemsWithDays.length > 0
      ? itemsWithDays.reduce((sum, ip) => sum + ip.daysToSell!, 0) / itemsWithDays.length
      : null;

  // ── Current month target (always current, not date-filtered) ─
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Filter all sold/shipped items for current month (regardless of date range)
  const allSold = allItems.filter((i) => i.status === "sold" || i.status === "shipped");
  const currentMonthItems = allSold.filter(
    (i) => i.soldAt && i.soldAt.toISOString().startsWith(currentMonthKey)
  );
  const monthRevenue = currentMonthItems.reduce(
    (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0),
    0
  );
  const monthCost = currentMonthItems.reduce(
    (sum, i) => sum + (i.costPrice ? parseFloat(i.costPrice) : 0),
    0
  );
  const monthProfit = monthRevenue - monthCost;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const dailyRate = dayOfMonth > 0 ? monthRevenue / dayOfMonth : 0;
  const projectedMonthRevenue = round(dailyRate * daysInMonth);
  const hoursThisMonth = (dayOfMonth / 7) * targets.weeklyHours;
  const effectiveHourlyRate = hoursThisMonth > 0 ? monthProfit / hoursThisMonth : 0;

  // ── Previous period comparison ───────────────────────────────
  const prevFrom = from ? new Date(from.getTime() - (to!.getTime() - from.getTime())) : null;
  const prevTo = from ? new Date(from.getTime() - 1) : null;

  let prevRevenue = 0;
  let prevProfit = 0;
  let prevItemsSold = 0;

  if (prevFrom && prevTo) {
    const prevSold = allSold.filter((i) => {
      if (!i.soldAt) return false;
      return i.soldAt >= prevFrom && i.soldAt <= prevTo;
    });
    prevRevenue = prevSold.reduce((sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0), 0);
    const prevCost = prevSold.reduce((sum, i) => sum + (i.costPrice ? parseFloat(i.costPrice) : 0), 0);
    prevProfit = prevRevenue - prevCost;
    prevItemsSold = prevSold.length;
  }

  // ── Inventory health (always current) ────────────────────────
  const inventoryHealth = computeInventoryHealth(listed, sourced, allSold);

  // ── Weekly pulse ─────────────────────────────────────────────
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekSold = allSold.filter((i) => i.soldAt && i.soldAt >= weekAgo);
  const lastWeekSold = allSold.filter((i) => i.soldAt && i.soldAt >= twoWeeksAgo && i.soldAt < weekAgo);

  const weekRevenue = thisWeekSold.reduce(
    (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0),
    0
  );
  const lastWeekRevenue = lastWeekSold.reduce(
    (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0),
    0
  );

  return NextResponse.json({
    summary: {
      totalRevenue: round(totalRevenue),
      totalCost: round(totalCost),
      grossProfit: round(grossProfit),
      netProfit: round(netProfit),
      totalShipping: round(totalShipping),
      totalFees: round(totalFees),
      totalExpenses: round(totalExpenses),
      avgMargin: round(avgMargin),
      avgProfitPerItem: round(avgProfit),
      itemsSold: sold.length,
      itemsListed: listed.length,
      itemsSourced: sourced.length,
      stockCost: round(stockCost),
      stockListedValue: round(stockListed),
      sellThroughRate: round(sellThroughRate),
      avgDaysToSell: avgDaysToSell != null ? round(avgDaysToSell) : null,
    },
    comparison: {
      revenueDelta: prevRevenue > 0 ? round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null,
      profitDelta: prevProfit > 0 ? round(((netProfit - prevProfit) / prevProfit) * 100) : null,
      itemsSoldDelta: prevItemsSold > 0 ? round(((sold.length - prevItemsSold) / prevItemsSold) * 100) : null,
    },
    targets: {
      monthlyTarget: targets.monthlyRevenueTarget,
      weeklyHours: targets.weeklyHours,
      marginTarget: targets.marginTargetPct,
      currentMonth: currentMonthKey,
      monthRevenue: round(monthRevenue),
      monthProfit: round(monthProfit),
      monthItemsSold: currentMonthItems.length,
      projectedMonthRevenue,
      daysRemaining,
      revenueProgress: round((monthRevenue / targets.monthlyRevenueTarget) * 100),
      effectiveHourlyRate: round(effectiveHourlyRate),
      targetHourlyRate: targets.targetHourlyRate,
      onTrack: projectedMonthRevenue >= targets.monthlyRevenueTarget,
    },
    weeklyPulse: {
      itemsSold: thisWeekSold.length,
      revenue: round(weekRevenue),
      revenueDelta:
        lastWeekRevenue > 0
          ? round(((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
          : null,
    },
    inventoryHealth,
    itemProfits: itemProfits.sort((a, b) => b.netProfit - a.netProfit),
    byCategory: Object.entries(byCategory)
      .map(([category, data]) => ({ category, ...roundObj(data) }))
      .sort((a, b) => b.profit - a.profit),
    bySource: Object.entries(bySource)
      .map(([source, data]) => ({ source, ...roundObj(data) }))
      .sort((a, b) => b.profit - a.profit),
    byExpenseCategory: Object.entries(byExpenseCategory)
      .map(([category, amount]) => ({ category, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    byMonth: Object.entries(byMonth)
      .filter(([k]) => k !== "unknown")
      .map(([month, data]) => ({ month, ...roundObj(data) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  });
}

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------
function resolveDateRange(params: URLSearchParams): { from: Date | null; to: Date | null } {
  const preset = params.get("preset");
  const now = new Date();

  if (preset) {
    switch (preset) {
      case "this_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        };
      case "last_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        };
      case "last_90_days":
        return {
          from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          to: now,
        };
      case "this_year":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: now,
        };
      case "tax_year": {
        // UK tax year: April 6 to April 5
        const taxYearStart =
          now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
            ? new Date(now.getFullYear(), 3, 6) // Apr 6 this year
            : new Date(now.getFullYear() - 1, 3, 6); // Apr 6 last year
        return { from: taxYearStart, to: now };
      }
      case "all_time":
      default:
        return { from: null, to: null };
    }
  }

  const fromStr = params.get("from");
  const toStr = params.get("to");

  return {
    from: fromStr ? new Date(fromStr + "T00:00:00") : null,
    to: toStr ? new Date(toStr + "T23:59:59") : null,
  };
}

// ---------------------------------------------------------------------------
// Inventory health computation
// ---------------------------------------------------------------------------
function computeInventoryHealth(
  listed: typeof items.$inferSelect[],
  sourced: typeof items.$inferSelect[],
  allSold: typeof items.$inferSelect[]
) {
  const now = new Date();
  const unsold = [...listed, ...sourced];

  // Aging buckets
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const bucketValues = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

  const deadStock: {
    id: string;
    name: string;
    brand: string | null;
    listedPrice: number;
    daysListed: number;
  }[] = [];

  for (const item of unsold) {
    const refDate = item.listedAt ?? item.createdAt ?? now;
    const days = Math.round((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const value = item.listedPrice ? parseFloat(item.listedPrice) : (item.costPrice ? parseFloat(item.costPrice) : 0);

    if (days <= 30) {
      buckets["0-30"]++;
      bucketValues["0-30"] += value;
    } else if (days <= 60) {
      buckets["31-60"]++;
      bucketValues["31-60"] += value;
    } else if (days <= 90) {
      buckets["61-90"]++;
      bucketValues["61-90"] += value;
    } else {
      buckets["90+"]++;
      bucketValues["90+"] += value;
    }

    if (days >= 60) {
      deadStock.push({
        id: item.id,
        name: item.name,
        brand: item.brand,
        listedPrice: item.listedPrice ? parseFloat(item.listedPrice) : 0,
        daysListed: days,
      });
    }
  }

  // Inventory turnover: COGS / avg inventory value
  const totalCOGS = allSold.reduce(
    (sum, i) => sum + (i.costPrice ? parseFloat(i.costPrice) : 0),
    0
  );
  const totalStockValue = Object.values(bucketValues).reduce((a, b) => a + b, 0);
  const inventoryTurnover = totalStockValue > 0 ? totalCOGS / totalStockValue : 0;

  // Stock value at risk (90+ days)
  const stockAtRisk = round(bucketValues["90+"]);

  return {
    agingBuckets: buckets,
    agingValues: {
      "0-30": round(bucketValues["0-30"]),
      "31-60": round(bucketValues["31-60"]),
      "61-90": round(bucketValues["61-90"]),
      "90+": round(bucketValues["90+"]),
    },
    deadStock: deadStock.sort((a, b) => b.daysListed - a.daysListed),
    totalUnsold: unsold.length,
    inventoryTurnover: round(inventoryTurnover),
    stockAtRisk,
  };
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
