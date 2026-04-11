import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, watchItems } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/inventory/check?vintedUrl=...
// Lightweight lookup used by the Chrome extension to determine button mode.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const vintedUrl = request.nextUrl.searchParams.get("vintedUrl");

  if (!vintedUrl) {
    return NextResponse.json(
      { inInventory: false, watched: false },
      { status: 200 },
    );
  }

  const [inventoryResult, watchResult] = await Promise.all([
    db
      .select({ id: items.id, status: items.status })
      .from(items)
      .where(eq(items.vintedUrl, vintedUrl))
      .limit(1),
    db
      .select({ id: watchItems.id, status: watchItems.status })
      .from(watchItems)
      .where(eq(watchItems.vintedUrl, vintedUrl))
      .limit(1),
  ]);

  const inventoryItem = inventoryResult[0] ?? null;
  const watchItem = watchResult[0] ?? null;

  return NextResponse.json({
    inInventory: !!inventoryItem,
    itemId: inventoryItem?.id ?? null,
    itemStatus: inventoryItem?.status ?? null,
    watched: !!watchItem,
    watchItemId: watchItem?.id ?? null,
    watchStatus: watchItem?.status ?? null,
  });
}
