import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, or, inArray, sql } from "drizzle-orm";
import { scoreItem, summarise } from "@/lib/inventory/completeness";

// ---------------------------------------------------------------------------
// GET /api/health/completeness
//
// Listing completeness across currently-listed (or still-sourced) items.
// Sold inventory is excluded — we only score what's still affecting visibility.
//
// Performance: the previous version selected full `description`, `photoUrls`
// (base64 text[]) and `thumbnailUrl` for every row, which dragged the warm
// response over 2s. Now we pull only scoring signals via SQL (length/count)
// and fetch thumbnails/prices for the tiny biggest-impact subset only.
// ---------------------------------------------------------------------------
export async function GET() {
  const scoringRows = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      size: items.size,
      condition: items.condition,
      descriptionLength: sql<number>`COALESCE(LENGTH(${items.description}), 0)::int`,
      photoCount: sql<number>`COALESCE(array_length(${items.photoUrls}, 1), 0)::int`,
    })
    .from(items)
    .where(or(eq(items.status, "listed"), eq(items.status, "sourced")));

  // Stub strings/arrays of the right size so the scorer's length checks pass
  // without us having to ship the real payload over the wire.
  const asScored = scoringRows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    category: r.category,
    size: r.size,
    condition: r.condition,
    description: r.descriptionLength >= 40 ? "x".repeat(r.descriptionLength) : null,
    photoUrls:
      r.photoCount > 0 ? Array.from({ length: r.photoCount }, () => "x") : null,
  }));

  const summary = summarise(asScored, 5);

  // Targeted follow-up: thumbnails + prices only for the 5 items we'll render.
  const impactIds = summary.biggestImpact.map((b) => b.itemId);
  const extras = impactIds.length
    ? await db
        .select({
          id: items.id,
          name: items.name,
          thumbnailUrl: items.thumbnailUrl,
          listedPrice: items.listedPrice,
        })
        .from(items)
        .where(inArray(items.id, impactIds))
    : [];
  const extraById = new Map(extras.map((e) => [e.id, e]));

  const enrichedImpact = summary.biggestImpact.map((entry) => {
    const extra = extraById.get(entry.itemId);
    return {
      ...entry,
      name: extra?.name ?? "",
      thumbnailUrl: extra?.thumbnailUrl ?? null,
      listedPrice: extra?.listedPrice ?? null,
    };
  });

  return NextResponse.json(
    {
      count: summary.count,
      averageScore: summary.averageScore,
      healthyPct: summary.healthyPct,
      bands: summary.bands,
      biggestImpact: enrichedImpact,
      scores: asScored.map((r) => ({ id: r.id, score: scoreItem(r).score })),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
