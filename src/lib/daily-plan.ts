import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, and, lt, or, isNull, sql } from "drizzle-orm";

export interface DailyTask {
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

export interface DailyPlan {
  tasks: DailyTask[];
  totalEstimatedMinutes: number;
}

export async function buildDailyPlan(): Promise<DailyPlan> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [soldItems, incompleteItems, staleItems, noPhotoItems] = await Promise.all([
    db.select({
      id: items.id,
      name: items.name,
      soldPrice: items.soldPrice,
    }).from(items).where(eq(items.status, "sold")),

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

  tasks.sort((a, b) => a.priority - b.priority || a.itemName.localeCompare(b.itemName));

  return {
    tasks,
    totalEstimatedMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
  };
}
