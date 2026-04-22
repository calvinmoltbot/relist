import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { summarise, scoreItem } from "@/lib/inventory/completeness";

// ---------------------------------------------------------------------------
// GET /api/health/completeness
//
// Listing completeness across currently-listed (or still-sourced) items.
// Sold inventory is excluded — we only score what's still affecting visibility.
// ---------------------------------------------------------------------------
export async function GET() {
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      size: items.size,
      condition: items.condition,
      description: items.description,
      photoUrls: items.photoUrls,
      listedPrice: items.listedPrice,
      thumbnailUrl: items.thumbnailUrl,
    })
    .from(items)
    .where(or(eq(items.status, "listed"), eq(items.status, "sourced")));

  const summary = summarise(rows, 5);

  // Enrich biggest-impact rows with item name + thumbnail so the UI can
  // render a useful "Fix these 5" panel without a second round-trip.
  const enrichedImpact = summary.biggestImpact.map((entry) => {
    const row = rows.find((r) => r.id === entry.itemId);
    return {
      ...entry,
      name: row?.name ?? "",
      thumbnailUrl: row?.thumbnailUrl ?? null,
      listedPrice: row?.listedPrice ?? null,
    };
  });

  return NextResponse.json({
    ...summary,
    biggestImpact: enrichedImpact,
    scores: rows.map((r) => ({ id: r.id, score: scoreItem(r).score })),
  });
}
