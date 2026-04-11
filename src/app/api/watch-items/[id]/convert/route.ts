import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, watchItems } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// POST /api/watch-items/[id]/convert — "Mark as Bought"
// Creates an inventory item from a watched item and links them.
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  // Fetch the watch item
  const [watchItem] = await db
    .select()
    .from(watchItems)
    .where(eq(watchItems.id, id))
    .limit(1);

  if (!watchItem) {
    return NextResponse.json({ error: "Watch item not found" }, { status: 404 });
  }

  if (watchItem.status === "bought") {
    return NextResponse.json(
      { error: "Already converted", itemId: watchItem.convertedItemId },
      { status: 409 },
    );
  }

  // Create inventory item from watched item data
  const [newItem] = await db
    .insert(items)
    .values({
      name: watchItem.title,
      brand: watchItem.brand,
      category: watchItem.category,
      size: watchItem.size,
      condition: watchItem.condition,
      costPrice: body.buyPrice ? String(body.buyPrice) : watchItem.currentPrice,
      listedPrice: null,
      status: "sourced",
      sourceType: "online",
      sourceLocation: "Vinted",
      vintedUrl: watchItem.vintedUrl,
      photoUrls: watchItem.photoUrl ? [watchItem.photoUrl] : null,
    })
    .returning();

  // Update watch item — mark as bought and link to inventory item
  await db
    .update(watchItems)
    .set({
      status: "bought",
      convertedItemId: newItem.id,
      updatedAt: new Date(),
    })
    .where(eq(watchItems.id, id));

  return NextResponse.json({ item: newItem, watchItem: { ...watchItem, status: "bought" } }, { status: 201 });
}
