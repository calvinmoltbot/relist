import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, transactions } from "@/db/schema";
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

  // Auto-create transaction when item is marked as sold
  if (body.status === "sold" && existing.status !== "sold") {
    const grossPrice = Number(updated.soldPrice ?? 0);
    const costPrice = Number(updated.costPrice ?? 0);
    const shippingCost = Number(body.shippingCost ?? 0);
    const platformFees = Number(body.platformFees ?? 0);
    const profit = grossPrice - costPrice - shippingCost - platformFees;

    await db.insert(transactions).values({
      itemId: id,
      transactionType: "sell",
      grossPrice: String(grossPrice),
      shippingCost: String(shippingCost),
      platformFees: String(platformFees),
      profit: String(profit),
      completedAt: now,
    });
  }

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
