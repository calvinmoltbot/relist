import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceData, priceStats } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// POST /api/price-data/aggregate
// Recalculate price_stats from price_data.
// Groups by brand + category, calculates median, P25, P75.
// ---------------------------------------------------------------------------
export async function POST() {
  try {
    // Get distinct brand+category combinations with enough data
    const groups = await db
      .select({
        brand: priceData.brand,
        category: priceData.category,
        count: sql<number>`count(*)::int`,
        median: sql<string>`percentile_cont(0.5) within group (order by ${priceData.price}::numeric)`,
        p25: sql<string>`percentile_cont(0.25) within group (order by ${priceData.price}::numeric)`,
        p75: sql<string>`percentile_cont(0.75) within group (order by ${priceData.price}::numeric)`,
      })
      .from(priceData)
      .where(
        and(
          sql`${priceData.brand} is not null`,
          sql`${priceData.category} is not null`,
          sql`${priceData.price} is not null`,
          eq(priceData.status, "active"),
        ),
      )
      .groupBy(priceData.brand, priceData.category)
      .having(sql`count(*) >= 3`);

    let upserted = 0;
    const now = new Date();

    for (const group of groups) {
      if (!group.brand || !group.category) continue;

      // Check if stats row exists
      const [existing] = await db
        .select()
        .from(priceStats)
        .where(
          and(
            eq(priceStats.brand, group.brand),
            eq(priceStats.category, group.category),
          ),
        );

      const values = {
        brand: group.brand,
        category: group.category,
        medianPrice: group.median ? String(Math.round(parseFloat(group.median) * 100) / 100) : null,
        p25Price: group.p25 ? String(Math.round(parseFloat(group.p25) * 100) / 100) : null,
        p75Price: group.p75 ? String(Math.round(parseFloat(group.p75) * 100) / 100) : null,
        sampleCount: group.count,
        lastUpdatedAt: now,
      };

      if (existing) {
        await db
          .update(priceStats)
          .set(values)
          .where(eq(priceStats.id, existing.id));
      } else {
        await db.insert(priceStats).values(values);
      }
      upserted++;
    }

    return NextResponse.json({
      aggregated: upserted,
      totalGroups: groups.length,
    });
  } catch (error) {
    console.error("Price data aggregation error:", error);
    return NextResponse.json(
      { error: "Failed to aggregate price data" },
      { status: 500 },
    );
  }
}
