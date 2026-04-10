import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { desc, asc, ilike, eq, or, sql } from "drizzle-orm";

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
      photoUrls: body.photoUrls ?? null,
    })
    .returning();

  return NextResponse.json({ item }, { status: 201 });
}
