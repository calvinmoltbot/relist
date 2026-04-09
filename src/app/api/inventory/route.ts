import { NextRequest, NextResponse } from "next/server";
import { getStore, getNextId, type MockItem } from "./_store";

// ---------------------------------------------------------------------------
// GET /api/inventory
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();
  const sort = searchParams.get("sort") ?? "date";

  const store = getStore();
  let filtered = [...store];

  if (status && status !== "all") {
    filtered = filtered.filter((i) => i.status === status);
  }

  if (search) {
    filtered = filtered.filter(
      (i) =>
        i.name.toLowerCase().includes(search) ||
        (i.brand && i.brand.toLowerCase().includes(search)) ||
        (i.category && i.category.toLowerCase().includes(search)),
    );
  }

  switch (sort) {
    case "price":
      filtered.sort(
        (a, b) =>
          parseFloat(b.listedPrice ?? b.costPrice ?? "0") -
          parseFloat(a.listedPrice ?? a.costPrice ?? "0"),
      );
      break;
    case "brand":
      filtered.sort((a, b) => (a.brand ?? "").localeCompare(b.brand ?? ""));
      break;
    case "date":
    default:
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
  }

  return NextResponse.json({ items: filtered });
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

  const store = getStore();
  const now = new Date().toISOString();
  const item: MockItem = {
    id: getNextId(),
    name: body.name,
    brand: body.brand ?? null,
    category: body.category ?? null,
    condition: body.condition ?? null,
    size: body.size ?? null,
    costPrice: body.costPrice ?? null,
    listedPrice: body.listedPrice ?? null,
    soldPrice: null,
    status: "sourced",
    platform: "vinted",
    photoUrls: null,
    description: body.description ?? null,
    sourceType: body.sourceType ?? null,
    sourceLocation: body.sourceLocation ?? null,
    listedAt: null,
    soldAt: null,
    shippedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  store.unshift(item);

  return NextResponse.json({ item }, { status: 201 });
}
