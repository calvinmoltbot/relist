import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { ilike, eq, and, inArray, isNull } from "drizzle-orm";
import { downloadAndResizePhoto, thumbnailFromDataUri } from "@/lib/photos";
import { getInventoryList } from "@/lib/inventory-query";
import { generateSku } from "@/lib/sku";

// ---------------------------------------------------------------------------
// GET /api/inventory — thin wrapper around getInventoryList, used for
// client-side refreshes when filters change. Page-level first paint goes
// through the Server Component in src/app/inventory/page.tsx directly.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") as
    | "date"
    | "price"
    | "brand"
    | null;
  const incompleteOnly = searchParams.get("incompleteOnly") === "1";

  const result = await getInventoryList({ status, search, sort, incompleteOnly });

  return NextResponse.json(
    { items: result },
    {
      headers: {
        "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
      },
    },
  );
}

// ---------------------------------------------------------------------------
// POST /api/inventory
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 },
    );
  }

  // Deduplicate carefully. A Vinted URL uniquely identifies a listing, so it's
  // the only fully reliable dedup key. Item names are heavily templated (Lily
  // has several "…sequin hanky hem cami"), so a bare name match is NOT proof of
  // a duplicate — and merging a fresh submission into an already sold/shipped
  // row would silently swallow it (it would never appear under "Listed"). Rules:
  //   • vintedUrl present → match that exact URL. Only if none, fall back to an
  //     ACTIVE (sourced/listed) name match that isn't yet linked to any URL —
  //     i.e. link up a manual entry for the same item. Never a sold/shipped row,
  //     never one already tied to a different listing.
  //   • no vintedUrl → dedup by name ONLY against a still-active item.
  const ACTIVE_STATUSES = ["sourced", "listed"] as const;
  let existing: typeof items.$inferSelect | null = null;

  if (body.vintedUrl) {
    const [urlMatch] = await db
      .select()
      .from(items)
      .where(eq(items.vintedUrl, body.vintedUrl))
      .limit(1);
    existing = urlMatch ?? null;

    if (!existing) {
      const [nameMatch] = await db
        .select()
        .from(items)
        .where(
          and(
            ilike(items.name, body.name.trim()),
            inArray(items.status, [...ACTIVE_STATUSES]),
            isNull(items.vintedUrl),
          ),
        )
        .limit(1);
      existing = nameMatch ?? null;
    }
  } else {
    const [nameMatch] = await db
      .select()
      .from(items)
      .where(
        and(
          ilike(items.name, body.name.trim()),
          inArray(items.status, [...ACTIVE_STATUSES]),
        ),
      )
      .limit(1);
    existing = nameMatch ?? null;
  }

  // If externalPhotoUrls are provided (from extension), download and resize them
  let photoUrls: string[] | null = body.photoUrls ?? null;
  let thumbnailUrl: string | null = null;

  if (
    body.externalPhotoUrls &&
    Array.isArray(body.externalPhotoUrls) &&
    body.externalPhotoUrls.length > 0
  ) {
    const downloadResults = await Promise.all(
      body.externalPhotoUrls.map((url: string) =>
        downloadAndResizePhoto(url),
      ),
    );
    const successful = downloadResults.filter(
      (r): r is { full: string; thumb: string } => r !== null,
    );

    if (successful.length > 0) {
      photoUrls = successful.map((r) => r.full);
      thumbnailUrl = successful[0].thumb;
    }
  } else if (photoUrls && photoUrls.length > 0) {
    // Client uploaded base64 photos directly — derive thumb from the first.
    thumbnailUrl = await thumbnailFromDataUri(photoUrls[0]);
  }

  // If duplicate found, update it instead of creating a new one
  if (existing) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    // Update fields that are missing on the existing item but provided now
    if (!existing.brand && body.brand) updates.brand = body.brand;
    if (!existing.category && body.category) updates.category = body.category;
    if (!existing.condition && body.condition) updates.condition = body.condition;
    if (!existing.size && body.size) updates.size = body.size;
    if (!existing.listedPrice && body.listedPrice) updates.listedPrice = body.listedPrice;
    if (!existing.description && body.description) updates.description = body.description;
    if (!existing.vintedUrl && body.vintedUrl) updates.vintedUrl = body.vintedUrl;

    // Always update photos if new ones were downloaded and existing has none
    if (photoUrls && (!existing.photoUrls || existing.photoUrls.length === 0)) {
      updates.photoUrls = photoUrls;
    }
    if (thumbnailUrl && !existing.thumbnailUrl) {
      updates.thumbnailUrl = thumbnailUrl;
    }

    const [updated] = await db
      .update(items)
      .set(updates)
      .where(eq(items.id, existing.id))
      .returning();

    return NextResponse.json({ item: updated, updated: true }, { status: 200 });
  }

  // Create new item
  const status = body.status ?? "sourced";
  const now = new Date();
  const sku = await generateSku(body.category);

  const [item] = await db
    .insert(items)
    .values({
      sku,
      name: body.name,
      brand: body.brand ?? null,
      category: body.category ?? null,
      condition: body.condition ?? null,
      size: body.size ?? null,
      costPrice: body.costPrice ?? null,
      listedPrice: body.listedPrice ?? null,
      description: body.description ?? null,
      sourceType: body.sourceType ?? null,
      sourceLocation: body.sourceLocation ?? null,
      vintedUrl: body.vintedUrl ?? null,
      photoUrls,
      thumbnailUrl,
      status,
      listedAt: status === "listed" ? now : null,
    })
    .returning();

  return NextResponse.json({ item }, { status: 201 });
}
