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

  return NextResponse.json({ items: result });
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
