import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, transactions } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { resolveDateRange } from "@/lib/date-range";

// ---------------------------------------------------------------------------
// GET /api/bestsellers
//
// Aggregates days-to-sell performance across dimensions (brand, category,
// sourceType, condition, size). Groups need ≥2 sold items to appear so one
// lucky sale doesn't skew the ranking.
// ---------------------------------------------------------------------------

const MIN_GROUP_SIZE = 2;

type Dimension = "brand" | "category" | "sourceType" | "condition" | "size";

interface SoldRow {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sourceType: string | null;
  condition: string | null;
  size: string | null;
  costPrice: string | null;
  soldPrice: string | null;
  listedAt: Date | null;
  soldAt: Date | null;
}

interface ItemStat {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  daysToSell: number;
  soldPrice: number;
  netProfit: number;
  marginPct: number;
}

interface GroupStat {
  key: string;
  count: number;
  medianDaysToSell: number;
  medianProfit: number;
  medianMarginPct: number;
  totalRevenue: number;
  fastestDays: number;
  slowestDays: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function buildGroupStats(
  sold: ItemStat[],
  getKey: (item: SoldRow) => string | null,
  rows: Map<string, SoldRow>,
): GroupStat[] {
  const byGroup = new Map<string, ItemStat[]>();

  for (const stat of sold) {
    const row = rows.get(stat.id);
    if (!row) continue;
    const rawKey = getKey(row);
    const key = rawKey && rawKey.trim() ? rawKey : "uncategorised";
    const bucket = byGroup.get(key) ?? [];
    bucket.push(stat);
    byGroup.set(key, bucket);
  }

  const result: GroupStat[] = [];
  for (const [key, bucket] of byGroup) {
    if (bucket.length < MIN_GROUP_SIZE) continue;
    const days = bucket.map((b) => b.daysToSell);
    result.push({
      key,
      count: bucket.length,
      medianDaysToSell: median(days),
      medianProfit: median(bucket.map((b) => b.netProfit)),
      medianMarginPct: median(bucket.map((b) => b.marginPct)),
      totalRevenue: bucket.reduce((sum, b) => sum + b.soldPrice, 0),
      fastestDays: Math.min(...days),
      slowestDays: Math.max(...days),
    });
  }
  return result.sort((a, b) => a.medianDaysToSell - b.medianDaysToSell);
}

export async function GET(request: NextRequest) {
  const { from, to } = resolveDateRange(request.nextUrl.searchParams);

  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      sourceType: items.sourceType,
      condition: items.condition,
      size: items.size,
      costPrice: items.costPrice,
      soldPrice: items.soldPrice,
      listedAt: items.listedAt,
      soldAt: items.soldAt,
      status: items.status,
    })
    .from(items);

  // Only items that were both listed and sold have a meaningful time-to-sell.
  // Filter by soldAt falling in the requested range (if any).
  const soldRows: SoldRow[] = rows.filter(
    (r): r is SoldRow & { status: string } => {
      if (r.status !== "sold" && r.status !== "shipped") return false;
      if (r.listedAt == null || r.soldAt == null) return false;
      if (from && r.soldAt < from) return false;
      if (to && r.soldAt > to) return false;
      return true;
    },
  );

  const soldItemIds = soldRows.map((r) => r.id);
  const relevantTx =
    soldItemIds.length > 0
      ? await db
          .select()
          .from(transactions)
          .where(inArray(transactions.itemId, soldItemIds))
      : [];
  const txByItem = new Map(relevantTx.map((t) => [t.itemId, t]));

  const rowIndex = new Map(soldRows.map((r) => [r.id, r]));
  const itemStats: ItemStat[] = [];

  for (const row of soldRows) {
    const cost = row.costPrice ? parseFloat(row.costPrice) : 0;
    const soldPrice = row.soldPrice ? parseFloat(row.soldPrice) : 0;
    const tx = txByItem.get(row.id);
    const shipping = tx ? parseFloat(tx.shippingCost ?? "0") : 0;
    const fees = tx ? parseFloat(tx.platformFees ?? "0") : 0;
    const netProfit = soldPrice - cost - shipping - fees;
    const marginPct = soldPrice > 0 ? (netProfit / soldPrice) * 100 : 0;

    const days = Math.max(
      0,
      Math.round(
        (row.soldAt!.getTime() - row.listedAt!.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    itemStats.push({
      id: row.id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      daysToSell: days,
      soldPrice,
      netProfit,
      marginPct,
    });
  }

  const overall = {
    totalSold: itemStats.length,
    medianDaysToSell: median(itemStats.map((s) => s.daysToSell)),
    medianProfit: median(itemStats.map((s) => s.netProfit)),
    medianMarginPct: median(itemStats.map((s) => s.marginPct)),
    fastestDays: itemStats.length ? Math.min(...itemStats.map((s) => s.daysToSell)) : 0,
    totalRevenue: itemStats.reduce((sum, s) => sum + s.soldPrice, 0),
  };

  const dimensionKeys: Record<Dimension, (r: SoldRow) => string | null> = {
    brand: (r) => r.brand,
    category: (r) => r.category,
    sourceType: (r) => r.sourceType,
    condition: (r) => r.condition,
    size: (r) => r.size,
  };

  const groups: Record<Dimension, GroupStat[]> = {
    brand: buildGroupStats(itemStats, dimensionKeys.brand, rowIndex),
    category: buildGroupStats(itemStats, dimensionKeys.category, rowIndex),
    sourceType: buildGroupStats(itemStats, dimensionKeys.sourceType, rowIndex),
    condition: buildGroupStats(itemStats, dimensionKeys.condition, rowIndex),
    size: buildGroupStats(itemStats, dimensionKeys.size, rowIndex),
  };

  const topFastest = [...itemStats]
    .sort((a, b) => a.daysToSell - b.daysToSell || b.netProfit - a.netProfit)
    .slice(0, 10);

  const topProfit = [...itemStats]
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 10);

  return NextResponse.json({
    overall,
    groups,
    topFastest,
    topProfit,
    minGroupSize: MIN_GROUP_SIZE,
  });
}
