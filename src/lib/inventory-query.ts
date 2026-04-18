import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { desc, asc, ilike, eq, or, and, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// getInventoryList — the list payload the Inventory page renders.
// Used by the Server Component shell (src/app/inventory/page.tsx) for first
// paint and by /api/inventory for client-side refreshes when filters change.
// ---------------------------------------------------------------------------

export interface InventoryQueryFilters {
  status?: string | null;
  search?: string | null;
  sort?: "date" | "price" | "brand" | null;
}

export interface InventoryListItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  costPrice: string | null;
  listedPrice: string | null;
  soldPrice: string | null;
  status: string;
  thumbnailUrl: string | null;
  photoCount: number;
  soldAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export async function getInventoryList(
  filters: InventoryQueryFilters = {},
): Promise<InventoryListItem[]> {
  const { status, search, sort } = filters;

  const conditions = [];
  if (status && status !== "all") {
    conditions.push(eq(items.status, status));
  }
  if (search) {
    const q = search.toLowerCase();
    conditions.push(
      or(
        ilike(items.name, `%${q}%`),
        ilike(items.brand, `%${q}%`),
        ilike(items.category, `%${q}%`),
      ),
    );
  }

  let orderBy;
  switch (sort) {
    case "price":
      orderBy = desc(sql`COALESCE(${items.listedPrice}, ${items.costPrice}, '0')`);
      break;
    case "brand":
      orderBy = asc(items.brand);
      break;
    case "date":
    default:
      orderBy = desc(items.createdAt);
      break;
  }

  const where = conditions.length ? and(...conditions) : undefined;

  // Select only list-view columns. photoUrls / description / vintedUrl are
  // fetched on demand by the edit dialog via /api/inventory/[id].
  return db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      size: items.size,
      costPrice: items.costPrice,
      listedPrice: items.listedPrice,
      soldPrice: items.soldPrice,
      status: items.status,
      thumbnailUrl: items.thumbnailUrl,
      photoCount: sql<number>`COALESCE(array_length(${items.photoUrls}, 1), 0)::int`,
      soldAt: items.soldAt,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .where(where)
    .orderBy(orderBy);
}
