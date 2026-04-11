import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchItems, priceStats } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/watch-items — list watched items, enriched with price stats
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? "watching";

  const conditions =
    status === "all" ? [] : [eq(watchItems.status, status)];

  const rows = await db
    .select()
    .from(watchItems)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(watchItems.createdAt));

  // Enrich with latest price stats for margin estimation
  const enriched = await Promise.all(
    rows.map(async (row) => {
      if (!row.brand && !row.category) return row;

      const statsConditions = [];
      if (row.brand) statsConditions.push(eq(priceStats.brand, row.brand));
      if (row.category)
        statsConditions.push(eq(priceStats.category, row.category));

      const [stat] = statsConditions.length
        ? await db
            .select()
            .from(priceStats)
            .where(and(...statsConditions))
            .limit(1)
        : [];

      if (stat?.medianPrice && row.currentPrice) {
        const resale = Number(stat.medianPrice);
        const cost = Number(row.currentPrice);
        const margin = cost > 0 ? ((resale - cost) / cost) * 100 : 0;
        return {
          ...row,
          estimatedResale: String(resale),
          estimatedMarginPct: String(Math.round(margin)),
        };
      }

      return row;
    }),
  );

  return NextResponse.json(enriched);
}

// ---------------------------------------------------------------------------
// POST /api/watch-items — create a new watched item
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.vintedUrl || !body.title) {
    return NextResponse.json(
      { error: "vintedUrl and title are required" },
      { status: 400 },
    );
  }

  // Check for existing watch on this URL
  const [existing] = await db
    .select()
    .from(watchItems)
    .where(eq(watchItems.vintedUrl, body.vintedUrl))
    .limit(1);

  if (existing) {
    return NextResponse.json({ watchItem: existing, alreadyWatching: true });
  }

  const [watchItem] = await db
    .insert(watchItems)
    .values({
      vintedUrl: body.vintedUrl,
      vintedId: body.vintedId ?? null,
      title: body.title,
      brand: body.brand ?? null,
      category: body.category ?? null,
      size: body.size ?? null,
      condition: body.condition ?? null,
      currentPrice: body.price ? String(body.price) : null,
      targetBuyPrice: body.targetBuyPrice ? String(body.targetBuyPrice) : null,
      photoUrl: body.photoUrl ?? null,
    })
    .returning();

  return NextResponse.json({ watchItem }, { status: 201 });
}
