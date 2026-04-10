import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceData } from "@/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/price-data/comparables?brand=X&category=Y&limit=20
// Returns recent individual listings matching criteria.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const brand = searchParams.get("brand");
  const category = searchParams.get("category");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  if (!brand && !category) {
    return NextResponse.json(
      { error: "At least one of brand or category is required" },
      { status: 400 },
    );
  }

  const conditions = [];
  if (brand) conditions.push(ilike(priceData.brand, brand));
  if (category) conditions.push(ilike(priceData.category, category));

  const condition = searchParams.get("condition");
  if (condition) conditions.push(eq(priceData.condition, condition));

  const size = searchParams.get("size");
  if (size) conditions.push(eq(priceData.size, size));

  // Only active listings
  conditions.push(eq(priceData.status, "active"));

  const where = conditions.length > 1
    ? and(...conditions)
    : conditions[0];

  const results = await db
    .select()
    .from(priceData)
    .where(where)
    .orderBy(desc(priceData.lastSeenAt))
    .limit(limit);

  return NextResponse.json({
    comparables: results.map((r) => ({
      vintedId: r.vintedId,
      title: r.title,
      brand: r.brand,
      category: r.category,
      size: r.size,
      condition: r.condition,
      price: r.price ? parseFloat(r.price) : null,
      url: r.url,
      photoUrl: r.photoUrl,
      firstSeen: r.firstSeenAt?.toISOString() ?? null,
      lastSeen: r.lastSeenAt?.toISOString() ?? null,
      seenCount: r.seenCount,
    })),
    total: results.length,
  });
}
