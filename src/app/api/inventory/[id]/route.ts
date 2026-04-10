import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/inventory/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, id));

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
  const body = await request.json();
  const now = new Date();

  // Check item exists
  const [existing] = await db
    .select()
    .from(items)
    .where(eq(items.id, id));

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Auto-set timestamps based on status changes
  const updates: Record<string, unknown> = { ...body, updatedAt: now };

  if (body.status === "listed" && existing.status !== "listed") {
    updates.listedAt = now;
  }
  if (body.status === "sold" && existing.status !== "sold") {
    updates.soldAt = now;
  }
  if (body.status === "shipped" && existing.status !== "shipped") {
    updates.shippedAt = now;
  }

  const [updated] = await db
    .update(items)
    .set(updates)
    .where(eq(items.id, id))
    .returning();

  return NextResponse.json({ item: updated });
}

// ---------------------------------------------------------------------------
// DELETE /api/inventory/[id]
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [deleted] = await db
    .delete(items)
    .where(eq(items.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
