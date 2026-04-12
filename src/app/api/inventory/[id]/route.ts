import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, transactions, expenses, watchItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const SOLD_STATUSES = new Set(["sold", "shipped"]);

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

  // Also fetch the latest sell transaction for this item
  const [tx] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.itemId, id),
        eq(transactions.transactionType, "sell"),
      ),
    );

  return NextResponse.json({ item, transaction: tx ?? null });
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

  // Convert date strings to Date objects if provided
  if (body.soldAt) body.soldAt = new Date(body.soldAt);
  if (body.listedAt) body.listedAt = new Date(body.listedAt);
  if (body.shippedAt) body.shippedAt = new Date(body.shippedAt);

  // Auto-set timestamps based on status changes (only if not explicitly provided)
  const updates: Record<string, unknown> = { ...body, updatedAt: now };

  // Remove transaction-only fields from item updates
  delete updates.shippingCost;
  delete updates.platformFees;

  if (body.status === "listed" && existing.status !== "listed" && !body.listedAt) {
    updates.listedAt = now;
  }
  if (body.status === "sold" && existing.status !== "sold" && !body.soldAt) {
    updates.soldAt = now;
  }
  if (body.status === "shipped" && existing.status !== "shipped" && !body.shippedAt) {
    updates.shippedAt = now;
  }

  // When reverting to sourced/listed, clear sold/shipped timestamps
  const wasInSoldStatus = SOLD_STATUSES.has(existing.status);
  const isReverting =
    body.status && !SOLD_STATUSES.has(body.status) && wasInSoldStatus;

  if (isReverting) {
    if (!body.soldAt) updates.soldAt = null;
    if (!body.shippedAt) updates.shippedAt = null;
    if (body.soldPrice === undefined) updates.soldPrice = null;
  }

  const [updated] = await db
    .update(items)
    .set(updates)
    .where(eq(items.id, id))
    .returning();

  // Auto-create transaction when item is marked as sold (from non-sold status)
  if (body.status === "sold" && !wasInSoldStatus) {
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
      completedAt: updated.soldAt ?? now,
    });
  }

  // Credit transaction when reverting from sold/shipped
  if (isReverting) {
    const [existingTx] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.itemId, id),
          eq(transactions.transactionType, "sell"),
        ),
      );

    if (existingTx) {
      await db.insert(transactions).values({
        itemId: id,
        transactionType: "credit",
        grossPrice: String(-Number(existingTx.grossPrice ?? 0)),
        shippingCost: String(-Number(existingTx.shippingCost ?? 0)),
        platformFees: String(-Number(existingTx.platformFees ?? 0)),
        profit: String(-Number(existingTx.profit ?? 0)),
        completedAt: now,
      });
    }
  }

  // If soldAt was explicitly changed on an already-sold item, update the transaction date too
  if (body.soldAt && !isReverting && wasInSoldStatus) {
    await db
      .update(transactions)
      .set({ completedAt: new Date(body.soldAt) })
      .where(eq(transactions.itemId, id));
  }

  // Update transaction fees if provided on a sold/shipped item (not reverting)
  if (!isReverting && SOLD_STATUSES.has(updated.status) && (body.shippingCost !== undefined || body.platformFees !== undefined)) {
    const [existingTx] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.itemId, id),
          eq(transactions.transactionType, "sell"),
        ),
      );

    if (existingTx) {
      const shipping = body.shippingCost !== undefined ? Number(body.shippingCost) : Number(existingTx.shippingCost ?? 0);
      const fees = body.platformFees !== undefined ? Number(body.platformFees) : Number(existingTx.platformFees ?? 0);
      const grossPrice = Number(existingTx.grossPrice ?? 0);
      const costPrice = Number(updated.costPrice ?? 0);
      const profit = grossPrice - costPrice - shipping - fees;

      await db
        .update(transactions)
        .set({
          shippingCost: String(shipping),
          platformFees: String(fees),
          profit: String(profit),
        })
        .where(eq(transactions.id, existingTx.id));
    }
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

  // Clear dependent rows first — transactions.itemId is NOT NULL FK (must delete),
  // expenses/watchItems references are nullable (null out so history stays intact).
  await db.delete(transactions).where(eq(transactions.itemId, id));
  await db
    .update(expenses)
    .set({ itemId: null })
    .where(eq(expenses.itemId, id));
  await db
    .update(watchItems)
    .set({ convertedItemId: null })
    .where(eq(watchItems.convertedItemId, id));

  const [deleted] = await db
    .delete(items)
    .where(eq(items.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
