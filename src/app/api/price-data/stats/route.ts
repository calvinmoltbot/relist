import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceStats } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/price-data/stats?brand=X&category=Y&condition=Z&size=S
// Returns aggregated price statistics for a brand+category combination.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const brand = searchParams.get("brand");
  const category = searchParams.get("category");

  if (!brand && !category) {
    return NextResponse.json(
      { error: "At least one of brand or category is required" },
      { status: 400 },
    );
  }

  const conditions = [];
  if (brand) conditions.push(eq(priceStats.brand, brand));
  if (category) conditions.push(eq(priceStats.category, category));

  const condition = searchParams.get("condition");
  if (condition) conditions.push(eq(priceStats.condition, condition));

  const size = searchParams.get("size");
  if (size) conditions.push(eq(priceStats.size, size));

  const where = conditions.length > 1
    ? and(...conditions)
    : conditions[0];

  const results = await db
    .select()
    .from(priceStats)
    .where(where);

  if (results.length === 0) {
    return NextResponse.json({ stats: null, message: "No price data for this combination" });
  }

  // Return the most specific match (most filters matched)
  const stat = results[0];

  return NextResponse.json({
    stats: {
      brand: stat.brand,
      category: stat.category,
      condition: stat.condition,
      size: stat.size,
      median: stat.medianPrice ? parseFloat(stat.medianPrice) : null,
      p25: stat.p25Price ? parseFloat(stat.p25Price) : null,
      p75: stat.p75Price ? parseFloat(stat.p75Price) : null,
      sampleCount: stat.sampleCount,
      lastUpdated: stat.lastUpdatedAt?.toISOString() ?? null,
    },
  });
}
