import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { desc, asc, ilike, eq, or, sql } from "drizzle-orm";
import { downloadAndResizePhoto, thumbnailFromDataUri } from "@/lib/photos";

// ---------------------------------------------------------------------------
// GET /api/inventory
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();
  const sort = searchParams.get("sort") ?? "date";

  const conditions = [];

  if (status && status !== "all") {
    conditions.push(eq(items.status, status));
  }

  if (search) {
    conditions.push(
      or(
        ilike(items.name, `%${search}%`),
        ilike(items.brand, `%${search}%`),
        ilike(items.category, `%${search}%`),
      ),
    );
  }

  let orderBy;
  switch (sort) {
    case "price":
      orderBy = desc(sql`COALESCE(${items.listedPrice}, ${items.costPrice}, '0')`);
      break;
    case "brand":
      orderBy = asc(items.brand);
      break;
    case "date":
    default:
      orderBy = desc(items.createdAt);
      break;
  }

  const where = conditions.length > 0
    ? conditions.reduce((a, b) => sql`${a} AND ${b}`)
    : undefined;

  // Only select columns the list UI actually renders. `description` and
  // `vintedUrl` in particular can be large and aren't shown in cards/table;
  // they're fetched on demand by the edit dialog via /api/inventory/[id].
  const result = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      size: items.size,
      costPrice: items.costPrice,
      listedPrice: items.listedPrice,
      soldPrice: items.soldPrice,
      status: items.status,
      thumbnailUrl: items.thumbnailUrl,
      // photo_urls is a text[] of base64 data URIs — each cover photo is
      // 200-400 KB. List responses return only thumbnailUrl + count, never
      // the array. Full photos come from /api/inventory/[id] on demand.
      photoCount: sql<number>`COALESCE(array_length(${items.photoUrls}, 1), 0)::int`,
      soldAt: items.soldAt,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .where(where)
    .orderBy(orderBy);

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

  // Check for duplicates by vintedUrl (most reliable) or exact name match
  let existing: typeof items.$inferSelect | null = null;

  if (body.vintedUrl) {
    const [match] = await db
      .select()
      .from(items)
      .where(eq(items.vintedUrl, body.vintedUrl))
      .limit(1);
    existing = match ?? null;
  }

  if (!existing) {
    const [match] = await db
      .select()
      .from(items)
      .where(ilike(items.name, body.name.trim()))
      .limit(1);
    existing = match ?? null;
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

  const [item] = await db
    .insert(items)
    .values({
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
