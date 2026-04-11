import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, transactions } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";

// Statuses that have an associated sell transaction
const SOLD_STATUSES = new Set(["sold", "shipped"]);

// ---------------------------------------------------------------------------
// PATCH /api/inventory/bulk — Update multiple items at once
//
// Body: { ids: string[], updates: { soldAt?: string, shippedAt?: string,
//         status?: string, soldPrice?: string, listedPrice?: string, ... } }
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { ids, updates } = body as {
    ids: string[];
    updates: Record<string, unknown>;
  };

  if (!ids?.length || !updates) {
    return NextResponse.json(
      { error: "ids and updates are required" },
      { status: 400 },
    );
  }

  const now = new Date();

  // Convert date strings to Date objects
  if (updates.soldAt) updates.soldAt = new Date(updates.soldAt as string);
  if (updates.listedAt) updates.listedAt = new Date(updates.listedAt as string);
  if (updates.shippedAt)
    updates.shippedAt = new Date(updates.shippedAt as string);

  // Auto-set timestamps based on status changes
  if (updates.status === "sold" && !updates.soldAt) {
    updates.soldAt = now;
  }
  if (updates.status === "shipped" && !updates.shippedAt) {
    updates.shippedAt = now;
  }
  if (updates.status === "listed" && !updates.listedAt) {
    updates.listedAt = now;
  }

  // When reverting to sourced/listed, clear sold/shipped timestamps
  if (updates.status === "sourced" || updates.status === "listed") {
    if (updates.soldAt === undefined) updates.soldAt = null;
    if (updates.shippedAt === undefined) updates.shippedAt = null;
    if (updates.soldPrice === undefined) updates.soldPrice = null;
  }

  updates.updatedAt = now;

  // Fetch previous state for all items when status is changing
  let previousItems: { id: string; status: string; costPrice: string | null; soldPrice: string | null }[] =
    [];
  if (updates.status) {
    previousItems = await db
      .select({
        id: items.id,
        status: items.status,
        costPrice: items.costPrice,
        soldPrice: items.soldPrice,
      })
      .from(items)
      .where(inArray(items.id, ids));
  }

  // Update all items
  const updated = await db
    .update(items)
    .set(updates)
    .where(inArray(items.id, ids))
    .returning();

  // If soldAt was changed (and not cleared), update transaction dates too
  if (updates.soldAt && updates.soldAt instanceof Date) {
    await db
      .update(transactions)
      .set({ completedAt: updates.soldAt as Date })
      .where(inArray(transactions.itemId, ids));
  }

  // Auto-create transaction records when status changes to "sold"
  if (updates.status === "sold" && previousItems.length > 0) {
    const newlyTransitioned = previousItems.filter(
      (prev) => !SOLD_STATUSES.has(prev.status),
    );

    if (newlyTransitioned.length > 0) {
      const transactionValues = newlyTransitioned.map((prev) => {
        const updatedItem = updated.find((u) => u.id === prev.id);
        const grossPrice = Number(updatedItem?.soldPrice ?? 0);
        const costPrice = Number(prev.costPrice ?? 0);
        const profit = grossPrice - costPrice;

        return {
          itemId: prev.id,
          transactionType: "sell" as const,
          grossPrice: String(grossPrice),
          shippingCost: "0",
          platformFees: "0",
          profit: String(profit),
          completedAt: (updates.soldAt as Date) ?? now,
        };
      });

      await db.insert(transactions).values(transactionValues);
    }
  }

  // Credit transactions when reverting from sold/shipped to sourced/listed
  if (
    updates.status &&
    !SOLD_STATUSES.has(updates.status as string) &&
    previousItems.length > 0
  ) {
    const reversedItems = previousItems.filter((prev) =>
      SOLD_STATUSES.has(prev.status),
    );

    if (reversedItems.length > 0) {
      const reversedIds = reversedItems.map((r) => r.id);

      // Fetch existing sell transactions to create credits
      const existingTx = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.itemId, reversedIds),
            eq(transactions.transactionType, "sell"),
          ),
        );

      if (existingTx.length > 0) {
        const creditValues = existingTx.map((tx) => ({
          itemId: tx.itemId,
          transactionType: "credit" as const,
          grossPrice: String(-Number(tx.grossPrice ?? 0)),
          shippingCost: String(-Number(tx.shippingCost ?? 0)),
          platformFees: String(-Number(tx.platformFees ?? 0)),
          profit: String(-Number(tx.profit ?? 0)),
          completedAt: now,
        }));

        await db.insert(transactions).values(creditValues);
      }
    }
  }

  return NextResponse.json({ updated: updated.length });
}

// ---------------------------------------------------------------------------
// DELETE /api/inventory/bulk — Delete multiple items at once
//
// Body: { ids: string[] }
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids?.length) {
    return NextResponse.json(
      { error: "ids are required" },
      { status: 400 },
    );
  }

  // Delete associated transactions first
  await db.delete(transactions).where(inArray(transactions.itemId, ids));

  // Delete the items
  const deleted = await db
    .delete(items)
    .where(inArray(items.id, ids))
    .returning();

  return NextResponse.json({ deleted: deleted.length });
}
