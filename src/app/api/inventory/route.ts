import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// In-memory mock data store
// ---------------------------------------------------------------------------
export interface MockItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  condition: string | null;
  size: string | null;
  costPrice: string | null;
  listedPrice: string | null;
  soldPrice: string | null;
  status: string;
  platform: string | null;
  photoUrls: string[] | null;
  description: string | null;
  sourceType: string | null;
  sourceLocation: string | null;
  listedAt: string | null;
  soldAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const mockItems: MockItem[] = [
  {
    id: "1",
    name: "Vintage Levi's 501 Jeans",
    brand: "Levi's",
    category: "jeans",
    condition: "good",
    size: "W32 L30",
    costPrice: "8.00",
    listedPrice: "35.00",
    soldPrice: null,
    status: "listed",
    platform: "vinted",
    photoUrls: null,
    description: "Classic 501s, medium wash with natural fading. No rips or stains.",
    sourceType: "charity_shop",
    sourceLocation: "Oxfam, Camden",
    listedAt: "2026-04-07T10:00:00Z",
    soldAt: null,
    shippedAt: null,
    createdAt: "2026-04-06T09:30:00Z",
    updatedAt: "2026-04-07T10:00:00Z",
  },
  {
    id: "2",
    name: "Coach Leather Crossbody Bag",
    brand: "Coach",
    category: "bags",
    condition: "like_new",
    size: null,
    costPrice: "15.00",
    listedPrice: null,
    soldPrice: null,
    status: "sourced",
    platform: "vinted",
    photoUrls: null,
    description: "Tan leather crossbody, barely used. Dust bag included.",
    sourceType: "car_boot",
    sourceLocation: "Battersea car boot",
    listedAt: null,
    soldAt: null,
    shippedAt: null,
    createdAt: "2026-04-08T14:20:00Z",
    updatedAt: "2026-04-08T14:20:00Z",
  },
  {
    id: "3",
    name: "Dr. Martens 1460 Boots Size 6",
    brand: "Dr. Martens",
    category: "shoes",
    condition: "good",
    size: "UK 6",
    costPrice: "12.00",
    listedPrice: "45.00",
    soldPrice: "42.00",
    status: "sold",
    platform: "vinted",
    photoUrls: null,
    description: "Classic black 1460 boots, broken in nicely. Minor scuffing on toes.",
    sourceType: "charity_shop",
    sourceLocation: "BHF, Islington",
    listedAt: "2026-04-01T11:00:00Z",
    soldAt: "2026-04-05T16:45:00Z",
    shippedAt: null,
    createdAt: "2026-03-30T08:15:00Z",
    updatedAt: "2026-04-05T16:45:00Z",
  },
  {
    id: "4",
    name: "Penguin Classics Collection (5 books)",
    brand: null,
    category: "books",
    condition: "good",
    size: null,
    costPrice: "3.00",
    listedPrice: "18.00",
    soldPrice: "16.00",
    status: "shipped",
    platform: "vinted",
    photoUrls: null,
    description: "Orwell, Austen, Dickens, Bronte, Hardy. All in good condition.",
    sourceType: "car_boot",
    sourceLocation: "Wimbledon car boot",
    listedAt: "2026-03-25T09:00:00Z",
    soldAt: "2026-03-28T13:30:00Z",
    shippedAt: "2026-03-29T10:00:00Z",
    createdAt: "2026-03-24T16:00:00Z",
    updatedAt: "2026-03-29T10:00:00Z",
  },
  {
    id: "5",
    name: "Zara Oversized Blazer",
    brand: "Zara",
    category: "jackets",
    condition: "like_new",
    size: "M",
    costPrice: "6.00",
    listedPrice: "28.00",
    soldPrice: null,
    status: "listed",
    platform: "vinted",
    photoUrls: null,
    description: "Black oversized blazer, structured shoulders. Tags removed but never worn.",
    sourceType: "charity_shop",
    sourceLocation: "Shelter, Hackney",
    listedAt: "2026-04-08T12:00:00Z",
    soldAt: null,
    shippedAt: null,
    createdAt: "2026-04-07T17:30:00Z",
    updatedAt: "2026-04-08T12:00:00Z",
  },
];

// Global store (persists across requests in dev, resets on redeploy)
const store: MockItem[] = [...mockItems];
let nextId = 6;

// ---------------------------------------------------------------------------
// GET /api/inventory
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();
  const sort = searchParams.get("sort") ?? "date";

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

  const now = new Date().toISOString();
  const item: MockItem = {
    id: String(nextId++),
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
