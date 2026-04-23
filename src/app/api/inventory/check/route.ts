import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items, watchItems } from "@/db/schema";
import { eq, or, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/inventory/check?vintedUrl=...
// Lightweight lookup used by the Chrome extension to determine button mode.
//
// Vinted often appends tracking query params (e.g. ?referrer=personal_profile)
// when Lily lands on her own listing via her profile. The stored URL is clean,
// so an exact match would miss. We normalise by stripping query + hash, then
// also match any stored URL that starts with the same path prefix — covers
// legacy dirty data too.
// ---------------------------------------------------------------------------
function normaliseVintedUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url.split("?")[0].split("#")[0].replace(/\/$/, "");
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("vintedUrl");

  if (!rawUrl) {
    return NextResponse.json(
      { inInventory: false, watched: false },
      { status: 200 },
    );
  }

  const clean = normaliseVintedUrl(rawUrl);
  const prefixMatch = `${clean}%`;

  const [inventoryResult, watchResult] = await Promise.all([
    db
      .select({ id: items.id, status: items.status })
      .from(items)
      .where(
        or(eq(items.vintedUrl, clean), like(items.vintedUrl, prefixMatch)),
      )
      .limit(1),
    db
      .select({ id: watchItems.id, status: watchItems.status })
      .from(watchItems)
      .where(
        or(
          eq(watchItems.vintedUrl, clean),
          like(watchItems.vintedUrl, prefixMatch),
        ),
      )
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
