import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { desc, asc, ilike, eq, or, and, sql } from "drizzle-orm";
import { scoreItem } from "@/lib/inventory/completeness";

// ---------------------------------------------------------------------------
// getInventoryList — the list payload the Inventory page renders.
// Used by the Server Component shell (src/app/inventory/page.tsx) for first
// paint and by /api/inventory for client-side refreshes when filters change.
// ---------------------------------------------------------------------------

export interface InventoryQueryFilters {
  status?: string | null;
  search?: string | null;
  sort?: "date" | "price" | "brand" | null;
  /** Filter to incomplete listings (score < 80). Only applied client/server on listed+sourced. */
  incompleteOnly?: boolean;
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
  completenessScore: number;
  completenessBand: "green" | "amber" | "red";
  /** Label of the biggest-impact missing field, null if nothing missing. */
  completenessGap: string | null;
}

export async function getInventoryList(
  filters: InventoryQueryFilters = {},
): Promise<InventoryListItem[]> {
  const { status, search, sort, incompleteOnly } = filters;

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

  // Select list-view columns + fields the completeness scorer needs.
  // `photoUrls` is a text array; to avoid shipping base64 payloads we fetch
  // the count in SQL and synthesise a stub array client-side for scoring.
  // Description is pulled so we can check ≥40 chars without a second query.
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      brand: items.brand,
      category: items.category,
      size: items.size,
      condition: items.condition,
      costPrice: items.costPrice,
      listedPrice: items.listedPrice,
      soldPrice: items.soldPrice,
      status: items.status,
      thumbnailUrl: items.thumbnailUrl,
      photoCount: sql<number>`COALESCE(array_length(${items.photoUrls}, 1), 0)::int`,
      descriptionLength: sql<number>`COALESCE(LENGTH(${items.description}), 0)::int`,
      soldAt: items.soldAt,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .where(where)
    .orderBy(orderBy);

  const scored: InventoryListItem[] = rows.map((r) => {
    const result = scoreItem({
      name: r.name,
      brand: r.brand,
      category: r.category,
      size: r.size,
      condition: r.condition,
      // scorer checks typeof + min length; any ≥40-char string works
      description: r.descriptionLength >= 40 ? "x".repeat(r.descriptionLength) : null,
      // scorer checks isArray + length; a stub of the right length works
      photoUrls:
        r.photoCount > 0 ? Array.from({ length: r.photoCount }, () => "x") : null,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { condition: _c, descriptionLength: _d, ...rest } = r;
    return {
      ...rest,
      completenessScore: result.score,
      completenessBand: result.band,
      completenessGap: result.missing[0]?.label ?? null,
    };
  });

  if (incompleteOnly) {
    return scored.filter(
      (r) =>
        (r.status === "listed" || r.status === "sourced") &&
        r.completenessScore < 80,
    );
  }

  return scored;
}
