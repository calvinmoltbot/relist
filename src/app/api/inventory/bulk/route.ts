import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, transactions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// PATCH /api/inventory/bulk — Update multiple items at once
//
// Body: { ids: string[], updates: { soldAt?: string, status?: string, ... } }
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
      { status: 400 }
    );
  }

  // Convert date strings
  if (updates.soldAt) updates.soldAt = new Date(updates.soldAt as string);
  if (updates.listedAt) updates.listedAt = new Date(updates.listedAt as string);
  if (updates.shippedAt) updates.shippedAt = new Date(updates.shippedAt as string);

  updates.updatedAt = new Date();

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

  return NextResponse.json({ updated: updated.length });
}
