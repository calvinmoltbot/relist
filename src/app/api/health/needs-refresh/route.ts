import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { scoreItem } from "@/lib/inventory/completeness";

// ---------------------------------------------------------------------------
// GET /api/health/needs-refresh
//
// Queue of listed items that would benefit most from a refresh edit.
// Priority = daysSinceLastEdit × completenessGap × listedPrice, where:
//   - daysSinceLastEdit counts from lastEditedAt (falls back to listedAt,
//     then createdAt), clamped to ≥1 so newly-listed items aren't zeroed out
//   - completenessGap = (100 - completenessScore) / 100, with 0.2 floor so
//     already-complete listings still appear when they go stale
//   - listedPrice is the £ at risk; falls back to 1 when unpriced
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
      listedAt: items.listedAt,
      lastEditedAt: items.lastEditedAt,
      createdAt: items.createdAt,
      relistCount: items.relistCount,
      hasThumbnail: sql<boolean>`${items.thumbnailUrl} IS NOT NULL`,
      descriptionLength: sql<number>`COALESCE(LENGTH(${items.description}), 0)::int`,
      photoCount: sql<number>`COALESCE(array_length(${items.photoUrls}, 1), 0)::int`,
      hasVintedUrl: sql<boolean>`${items.vintedUrl} IS NOT NULL`,
    })
    .from(items)
    .where(eq(items.status, "listed"));

  const now = Date.now();
  const entries = rows.map((r) => {
    const refAt = r.lastEditedAt ?? r.listedAt ?? r.createdAt ?? new Date(now);
    const daysSinceEdit = Math.max(
      1,
      Math.floor((now - refAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const { score } = scoreItem({
      name: r.name,
      brand: r.brand,
      category: r.category,
      size: r.size,
      description:
        r.descriptionLength >= 40 ? "x".repeat(r.descriptionLength) : null,
      photoUrls:
        r.photoCount > 0 ? Array.from({ length: r.photoCount }, () => "x") : null,
      vintedUrl: r.hasVintedUrl ? "x" : null,
    });
    const completenessGap = Math.max(0.2, (100 - score) / 100);

    const priceNum = r.listedPrice ? parseFloat(r.listedPrice) : 0;
    const priceAtRisk = priceNum > 0 ? priceNum : 1;

    const priority = daysSinceEdit * completenessGap * priceAtRisk;

    return {
      itemId: r.id,
      name: r.name,
      brand: r.brand,
      listedPrice: r.listedPrice,
      lastEditedAt: r.lastEditedAt ? r.lastEditedAt.toISOString() : null,
      listedAt: r.listedAt ? r.listedAt.toISOString() : null,
      daysSinceEdit,
      completenessScore: score,
      relistCount: r.relistCount,
      priority: Math.round(priority * 100) / 100,
      thumbnailUrl: r.hasThumbnail ? `/api/inventory/thumb/${r.id}` : null,
    };
  });

  entries.sort((a, b) => b.priority - a.priority);

  return NextResponse.json(
    {
      count: entries.length,
      items: entries,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
