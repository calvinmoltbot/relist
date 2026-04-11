import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, transactions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

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

  updates.updatedAt = now;

  // If status is changing to "sold", we need the current items to check
  // which ones are actually transitioning (to avoid duplicate transactions)
  let previousItems: { id: string; status: string; costPrice: string | null }[] =
    [];
  if (updates.status === "sold") {
    previousItems = await db
      .select({
        id: items.id,
        status: items.status,
        costPrice: items.costPrice,
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

  // If soldAt was changed, update transaction dates too
  if (updates.soldAt) {
    await db
      .update(transactions)
      .set({ completedAt: updates.soldAt as Date })
      .where(inArray(transactions.itemId, ids));
  }

  // Auto-create transaction records when status changes to "sold"
  if (updates.status === "sold" && previousItems.length > 0) {
    const newlyTransitioned = previousItems.filter(
      (prev) => prev.status !== "sold",
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
