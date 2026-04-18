import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchItems, priceStats } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/watch-items — list watched items, enriched with price stats
//
// Previously this issued one extra priceStats query per watched item (N+1).
// Now it's a single leftJoin on (brand, category). Multiple priceStats rows
// per key are possible (non-unique index), so we dedup by watchItem id and
// prefer the most recently updated stats row.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? "watching";

  const whereClause =
    status === "all" ? undefined : eq(watchItems.status, status);

  const rows = await db
    .select({
      watchItem: watchItems,
      stat: priceStats,
    })
    .from(watchItems)
    .leftJoin(
      priceStats,
      and(
        eq(priceStats.brand, watchItems.brand),
        eq(priceStats.category, watchItems.category),
      ),
    )
    .where(whereClause)
    .orderBy(desc(watchItems.createdAt), desc(priceStats.lastUpdatedAt));

  // Dedup: one priceStats row per watch item (the first hit after ordering
  // by lastUpdatedAt desc is the freshest match).
  const seen = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!seen.has(row.watchItem.id)) seen.set(row.watchItem.id, row);
  }

  const enriched = Array.from(seen.values()).map(({ watchItem, stat }) => {
    if (stat?.medianPrice && watchItem.currentPrice) {
      const resale = Number(stat.medianPrice);
      const cost = Number(watchItem.currentPrice);
      const margin = cost > 0 ? ((resale - cost) / cost) * 100 : 0;
      return {
        ...watchItem,
        estimatedResale: String(resale),
        estimatedMarginPct: String(Math.round(margin)),
      };
    }
    return watchItem;
  });

  return NextResponse.json(enriched, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=180",
    },
  });
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
