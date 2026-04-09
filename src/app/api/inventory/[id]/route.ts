import { NextRequest, NextResponse } from "next/server";

// Re-use the same in-memory store from the parent route.
// In a real app this would hit the DB — for now we import the module side-effect
// by reaching into the same global. We duplicate the reference trick here because
// Next.js bundles route files independently.

interface MockItem {
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

// Shared global store so both route files reference the same array
const globalStore = globalThis as unknown as { __inventoryStore?: MockItem[] };

function getStore(): MockItem[] {
  if (!globalStore.__inventoryStore) {
    globalStore.__inventoryStore = [];
  }
  return globalStore.__inventoryStore;
}

// ---------------------------------------------------------------------------
// GET /api/inventory/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = getStore();
  const item = store.find((i) => i.id === id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

// ---------------------------------------------------------------------------
// PATCH /api/inventory/[id]
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = getStore();
  const idx = store.findIndex((i) => i.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  // Auto-set timestamps based on status changes
  if (body.status === "listed" && store[idx].status !== "listed") {
    body.listedAt = now;
  }
  if (body.status === "sold" && store[idx].status !== "sold") {
    body.soldAt = now;
  }
  if (body.status === "shipped" && store[idx].status !== "shipped") {
    body.shippedAt = now;
  }

  store[idx] = { ...store[idx], ...body, updatedAt: now };

  return NextResponse.json({ item: store[idx] });
}

// ---------------------------------------------------------------------------
// DELETE /api/inventory/[id]
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = getStore();
  const idx = store.findIndex((i) => i.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  store.splice(idx, 1);

  return NextResponse.json({ success: true });
}
