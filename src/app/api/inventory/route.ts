import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { desc, asc, ilike, eq, or, sql } from "drizzle-orm";
import sharp from "sharp";

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

  const result = await db
    .select()
    .from(items)
    .where(where)
    .orderBy(orderBy);

  // List views only need the cover photo, not every photo. photoUrls can
  // contain base64 data URIs (~200-400 KB each) so returning the full array
  // blows up response size to tens of MB. Keep only the first entry here;
  // full photos are available from the item detail endpoint.
  const trimmed = result.map((item) => ({
    ...item,
    photoUrls: item.photoUrls && item.photoUrls.length > 0
      ? [item.photoUrls[0]]
      : item.photoUrls,
    photoCount: item.photoUrls?.length ?? 0,
  }));

  return NextResponse.json(
    { items: trimmed },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Download and resize a photo from an external URL
// Returns a data URI (base64-encoded JPEG)
// ---------------------------------------------------------------------------
async function downloadAndResizePhoto(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const resized = await sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const base64 = resized.toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("[ReList] Failed to download photo:", url, error);
    return null;
  }
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
  let photoUrls = body.photoUrls ?? null;

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
    const successfulDownloads = downloadResults.filter(
      (r): r is string => r !== null,
    );

    if (successfulDownloads.length > 0) {
      photoUrls = successfulDownloads;
    }
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
      status,
      listedAt: status === "listed" ? now : null,
    })
    .returning();

  return NextResponse.json({ item }, { status: 201 });
}
