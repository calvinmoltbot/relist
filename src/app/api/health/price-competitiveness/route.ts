import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, priceStats } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkPrice, indexStats } from "@/lib/inventory/price-check";

// ---------------------------------------------------------------------------
// GET /api/health/price-competitiveness
//
// Surfaces listed items priced visibly above the market band. Sorted by the
// size of the gap (largest £ overshoot first) so Lily can triage.
// ---------------------------------------------------------------------------
export async function GET() {
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      size: items.size,
      listedPrice: items.listedPrice,
      hasThumbnail: sql<boolean>`${items.thumbnailUrl} IS NOT NULL`,
    })
    .from(items)
    .where(eq(items.status, "listed"));

  const statsRows = await db
    .select({
      brand: priceStats.brand,
      category: priceStats.category,
      size: priceStats.size,
      medianPrice: priceStats.medianPrice,
      p25Price: priceStats.p25Price,
      p75Price: priceStats.p75Price,
      sampleCount: priceStats.sampleCount,
    })
    .from(priceStats);
  const index = indexStats(statsRows);

  const summary = { high: 0, range: 0, low: 0, none: 0 };
  const highOutliers: Array<{
    itemId: string;
    name: string;
    brand: string | null;
    size: string | null;
    listedPrice: number;
    p25: number | null;
    p75: number | null;
    median: number | null;
    gap: number;
    matchedOn: "brand+category+size" | "brand+category" | null;
    thumbnailUrl: string | null;
  }> = [];

  for (const r of rows) {
    const listed = r.listedPrice ? parseFloat(r.listedPrice) : null;
    const check = checkPrice(
      { listedPrice: listed, brand: r.brand, category: r.category, size: r.size },
      index,
    );
    summary[check.band] += 1;
    if (check.band === "high" && listed != null) {
      highOutliers.push({
        itemId: r.id,
        name: r.name,
        brand: r.brand,
        size: r.size,
        listedPrice: listed,
        p25: check.p25,
        p75: check.p75,
        median: check.median,
        gap: check.gap ?? 0,
        matchedOn: check.matchedOn,
        thumbnailUrl: r.hasThumbnail ? `/api/inventory/thumb/${r.id}` : null,
      });
    }
  }

  highOutliers.sort((a, b) => b.gap - a.gap);

  return NextResponse.json(
    {
      count: rows.length,
      summary,
      outliers: highOutliers.slice(0, 10),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
      },
    },
  );
}
