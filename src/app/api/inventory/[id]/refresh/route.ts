import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// POST /api/inventory/[id]/refresh
// Marks the listing as refreshed: bumps `lastEditedAt` to now and
// increments `relistCount`. Called from the "I've refreshed" button
// on the Needs Refresh queue and edit dialog.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const now = new Date();

  const [updated] = await db
    .update(items)
    .set({
      lastEditedAt: now,
      relistCount: sql`${items.relistCount} + 1`,
      updatedAt: now,
    })
    .where(eq(items.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}
