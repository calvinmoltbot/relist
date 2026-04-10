import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceData } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// POST /api/price-data/ingest — Bulk upsert listings from Chrome extension
// ---------------------------------------------------------------------------

interface IngestListing {
  vintedId: string;
  title?: string;
  brand?: string;
  category?: string;
  size?: string;
  condition?: string;
  price?: number;
  currency?: string;
  url?: string;
  photoUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const listings: IngestListing[] = body.listings;

    if (!Array.isArray(listings) || listings.length === 0) {
      return NextResponse.json(
        { error: "listings array is required" },
        { status: 400 },
      );
    }

    let inserted = 0;
    let updated = 0;

    for (const listing of listings) {
      if (!listing.vintedId) continue;

      // Check if already exists
      const [existing] = await db
        .select()
        .from(priceData)
        .where(eq(priceData.vintedId, listing.vintedId));

      if (existing) {
        // Update: bump seen_count and last_seen
        await db
          .update(priceData)
          .set({
            lastSeenAt: new Date(),
            seenCount: sql`${priceData.seenCount} + 1`,
            // Update price if changed
            ...(listing.price != null
              ? { price: String(listing.price) }
              : {}),
          })
          .where(eq(priceData.vintedId, listing.vintedId));
        updated++;
      } else {
        // Insert new
        await db.insert(priceData).values({
          vintedId: listing.vintedId,
          title: listing.title ?? null,
          brand: listing.brand ?? null,
          category: listing.category ?? null,
          size: listing.size ?? null,
          condition: listing.condition ?? null,
          price: listing.price != null ? String(listing.price) : null,
          currency: listing.currency ?? "GBP",
          url: listing.url ?? null,
          photoUrl: listing.photoUrl ?? null,
        });
        inserted++;
      }
    }

    return NextResponse.json({ inserted, updated, total: listings.length });
  } catch (error) {
    console.error("Price data ingest error:", error);
    return NextResponse.json(
      { error: "Failed to ingest price data" },
      { status: 500 },
    );
  }
}
