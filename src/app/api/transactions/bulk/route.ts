import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, transactions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// PATCH /api/transactions/bulk — Update transaction attributes for items
//
// Body: { itemIds: string[], updates: { shippingCost?: string, platformFees?: string } }
// Recalculates profit automatically.
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { itemIds, updates } = body as {
    itemIds: string[];
    updates: { shippingCost?: string; platformFees?: string };
  };

  if (!itemIds?.length || !updates) {
    return NextResponse.json(
      { error: "itemIds and updates are required" },
      { status: 400 },
    );
  }

  // Fetch existing sell transactions for these items
  const existingTx = await db
    .select()
    .from(transactions)
    .where(
      and(
        inArray(transactions.itemId, itemIds),
        eq(transactions.transactionType, "sell"),
      ),
    );

  if (existingTx.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Fetch item cost prices for profit recalculation
  const txItemIds = existingTx.map((t) => t.itemId);
  const itemRows = await db
    .select({ id: items.id, costPrice: items.costPrice })
    .from(items)
    .where(inArray(items.id, txItemIds));
  const costByItem = new Map(itemRows.map((i) => [i.id, Number(i.costPrice ?? 0)]));

  // Update each transaction with recalculated profit
  let count = 0;
  for (const tx of existingTx) {
    const shipping = updates.shippingCost !== undefined
      ? Number(updates.shippingCost)
      : Number(tx.shippingCost ?? 0);
    const fees = updates.platformFees !== undefined
      ? Number(updates.platformFees)
      : Number(tx.platformFees ?? 0);
    const grossPrice = Number(tx.grossPrice ?? 0);
    const costPrice = costByItem.get(tx.itemId) ?? 0;
    const profit = grossPrice - costPrice - shipping - fees;

    await db
      .update(transactions)
      .set({
        shippingCost: String(shipping),
        platformFees: String(fees),
        profit: String(profit),
      })
      .where(eq(transactions.id, tx.id));
    count++;
  }

  return NextResponse.json({ updated: count });
}
