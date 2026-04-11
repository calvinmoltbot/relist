import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchItems } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// PATCH /api/watch-items/[id] — update status, target price, etc.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) updates.status = body.status;
  if (body.targetBuyPrice !== undefined)
    updates.targetBuyPrice = body.targetBuyPrice ? String(body.targetBuyPrice) : null;
  if (body.currentPrice !== undefined)
    updates.currentPrice = body.currentPrice ? String(body.currentPrice) : null;

  const [updated] = await db
    .update(watchItems)
    .set(updates)
    .where(eq(watchItems.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ watchItem: updated });
}

// ---------------------------------------------------------------------------
// DELETE /api/watch-items/[id]
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [deleted] = await db
    .delete(watchItems)
    .where(eq(watchItems.id, id))
    .returning({ id: watchItems.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
