import { getInventoryList } from "@/lib/inventory-query";
import InventoryClient from "./inventory-client";
import type { InventoryItem } from "@/lib/inventory-store";

// Cache the server render for 60s; filter changes go through the client
// fetch path against /api/inventory (which has its own cache headers).
export const revalidate = 60;

export default async function InventoryPage() {
  const rows = await getInventoryList();

  // The query returns Date objects for soldAt/createdAt/updatedAt; the
  // client store uses string timestamps (matches the /api/inventory JSON
  // contract). Serialize here so the hydration shape is identical.
  const initialItems: InventoryItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    category: r.category,
    condition: null,
    size: r.size,
    costPrice: r.costPrice,
    listedPrice: r.listedPrice,
    soldPrice: r.soldPrice,
    status: r.status,
    platform: null,
    photoUrls: null,
    thumbnailUrl: r.thumbnailUrl,
    description: null,
    sourceType: null,
    sourceLocation: null,
    vintedUrl: null,
    listedAt: null,
    soldAt: r.soldAt ? r.soldAt.toISOString() : null,
    shippedAt: null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    completenessScore: r.completenessScore,
    completenessBand: r.completenessBand,
    completenessGap: r.completenessGap,
  }));

  return <InventoryClient initialItems={initialItems} />;
}
