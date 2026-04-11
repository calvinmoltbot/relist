import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, and, lt, or, isNull, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DailyTask {
  id: string;
  type: "ship" | "update" | "reprice" | "photo";
  priority: number;
  title: string;
  subtitle: string;
  itemId: string;
  itemName: string;
  action: string;
  estimatedMinutes: number;
  icon: "package" | "edit" | "tag" | "camera";
}

// ---------------------------------------------------------------------------
// GET /api/daily-plan — Generate a prioritised daily task list
// ---------------------------------------------------------------------------
export async function GET() {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Run targeted queries in parallel instead of fetching all items
  const [soldItems, incompleteItems, staleItems, noPhotoItems] = await Promise.all([
    // Priority 1: Items sold but not shipped
    db.select({
      id: items.id,
      name: items.name,
      soldPrice: items.soldPrice,
    }).from(items).where(eq(items.status, "sold")),

    // Priority 2: Items missing cost price, category, or brand (exclude shipped)
    db.select({
      id: items.id,
      name: items.name,
      costPrice: items.costPrice,
      category: items.category,
      brand: items.brand,
    }).from(items).where(
      and(
        sql`${items.status} != 'shipped'`,
        or(
          isNull(items.costPrice),
          isNull(items.category),
          isNull(items.brand),
        ),
      ),
    ),

    // Priority 3: Stale listings (listed 14+ days ago)
    db.select({
      id: items.id,
      name: items.name,
      listedPrice: items.listedPrice,
      listedAt: items.listedAt,
    }).from(items).where(
      and(
        eq(items.status, "listed"),
        lt(items.listedAt, fourteenDaysAgo),
      ),
    ),

    // Priority 4: Listed items with no photos
    db.select({
      id: items.id,
      name: items.name,
    }).from(items).where(
      and(
        eq(items.status, "listed"),
        or(
          isNull(items.photoUrls),
          sql`array_length(${items.photoUrls}, 1) IS NULL`,
        ),
      ),
    ),
  ]);

  const tasks: DailyTask[] = [];

  // Priority 1: Ship items
  for (const item of soldItems) {
    const soldPrice = item.soldPrice
      ? `\u00A3${parseFloat(item.soldPrice).toFixed(0)}`
      : "";
    tasks.push({
      id: `ship-${item.id}`,
      type: "ship",
      priority: 1,
      title: "Ship to buyer",
      subtitle: `${item.name}${soldPrice ? ` \u2014 sold for ${soldPrice}` : ""}`,
      itemId: item.id,
      itemName: item.name,
      action: "Mark Shipped",
      estimatedMinutes: 2,
      icon: "package",
    });
  }

  // Priority 2: Quick updates
  for (const item of incompleteItems) {
    const missing: string[] = [];
    if (!item.costPrice) missing.push("cost price");
    if (!item.category) missing.push("category");
    if (!item.brand) missing.push("brand");

    tasks.push({
      id: `update-${item.id}`,
      type: "update",
      priority: 2,
      title: "Update details",
      subtitle: `${item.name} \u2014 missing ${missing.join(", ")}`,
      itemId: item.id,
      itemName: item.name,
      action: "Update Details",
      estimatedMinutes: 1,
      icon: "edit",
    });
  }

  // Priority 3: Stale listings
  for (const item of staleItems) {
    const daysListed = Math.floor(
      (now.getTime() - (item.listedAt?.getTime() ?? now.getTime())) /
        (24 * 60 * 60 * 1000),
    );
    const price = item.listedPrice
      ? `\u00A3${parseFloat(item.listedPrice).toFixed(0)}`
      : "";
    tasks.push({
      id: `reprice-${item.id}`,
      type: "reprice",
      priority: 3,
      title: "Review pricing",
      subtitle: `${item.name}${price ? ` \u2014 listed at ${price}` : ""} \u00B7 ${daysListed}d`,
      itemId: item.id,
      itemName: item.name,
      action: "Review Price",
      estimatedMinutes: 2,
      icon: "tag",
    });
  }

  // Priority 4: Photo check
  for (const item of noPhotoItems) {
    tasks.push({
      id: `photo-${item.id}`,
      type: "photo",
      priority: 4,
      title: "Add photos",
      subtitle: `${item.name} \u2014 no photos yet`,
      itemId: item.id,
      itemName: item.name,
      action: "Add Photos",
      estimatedMinutes: 3,
      icon: "camera",
    });
  }

  // Sort by priority, then by name
  tasks.sort((a, b) => a.priority - b.priority || a.itemName.localeCompare(b.itemName));

  return NextResponse.json({
    tasks,
    totalEstimatedMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
  });
}
