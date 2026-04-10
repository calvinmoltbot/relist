import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { priceData, priceStats } from "@/db/schema";
import { eq, or, and, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tests for price data ingestion, querying, and aggregation.
// ---------------------------------------------------------------------------

const createdPriceIds: string[] = [];
const createdStatIds: string[] = [];

async function cleanup() {
  for (const id of createdPriceIds) {
    try { await db.delete(priceData).where(eq(priceData.id, id)); } catch {}
  }
  for (const id of createdStatIds) {
    try { await db.delete(priceStats).where(eq(priceStats.id, id)); } catch {}
  }
  createdPriceIds.length = 0;
  createdStatIds.length = 0;
}

afterAll(cleanup);
beforeEach(cleanup);

// ---------------------------------------------------------------------------
// Ingestion (mirrors POST /api/price-data/ingest)
// ---------------------------------------------------------------------------
describe("price data — ingestion", () => {
  it("inserts a new listing", async () => {
    const [row] = await db
      .insert(priceData)
      .values({
        vintedId: "test-001",
        title: "Levi's 501 Jeans",
        brand: "Levi's",
        category: "jeans",
        size: "W32",
        condition: "good",
        price: "25.00",
        currency: "GBP",
        url: "https://www.vinted.co.uk/items/test-001",
      })
      .returning();
    createdPriceIds.push(row.id);

    expect(row.vintedId).toBe("test-001");
    expect(row.brand).toBe("Levi's");
    expect(row.price).toBe("25.00");
    expect(row.seenCount).toBe(1);
    expect(row.status).toBe("active");
  });

  it("deduplicates by vinted_id (upsert seen_count)", async () => {
    const [first] = await db
      .insert(priceData)
      .values({ vintedId: "test-dedup", brand: "Nike", category: "shoes", price: "30.00" })
      .returning();
    createdPriceIds.push(first.id);

    expect(first.seenCount).toBe(1);

    // Simulate re-seeing the same item
    await db
      .update(priceData)
      .set({
        lastSeenAt: new Date(),
        seenCount: sql`${priceData.seenCount} + 1`,
      })
      .where(eq(priceData.vintedId, "test-dedup"));

    const [updated] = await db
      .select()
      .from(priceData)
      .where(eq(priceData.vintedId, "test-dedup"));

    expect(updated.seenCount).toBe(2);
  });

  it("inserts multiple listings", async () => {
    const batch = [
      { vintedId: "batch-1", brand: "Zara", category: "tops", price: "12.00" },
      { vintedId: "batch-2", brand: "Zara", category: "tops", price: "15.00" },
      { vintedId: "batch-3", brand: "Zara", category: "tops", price: "18.00" },
    ];

    const inserted = await db.insert(priceData).values(batch).returning();
    for (const r of inserted) createdPriceIds.push(r.id);

    expect(inserted.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Querying comparables
// ---------------------------------------------------------------------------
describe("price data — comparables query", () => {
  it("finds listings by brand + category", async () => {
    const batch = [
      { vintedId: "comp-1", brand: "Dr. Martens", category: "shoes", price: "40.00" },
      { vintedId: "comp-2", brand: "Dr. Martens", category: "shoes", price: "45.00" },
      { vintedId: "comp-3", brand: "Nike", category: "shoes", price: "30.00" },
    ];
    const inserted = await db.insert(priceData).values(batch).returning();
    for (const r of inserted) createdPriceIds.push(r.id);

    const results = await db
      .select()
      .from(priceData)
      .where(
        and(
          eq(priceData.brand, "Dr. Martens"),
          eq(priceData.category, "shoes"),
          eq(priceData.status, "active"),
        ),
      );

    const ours = results.filter((r) => createdPriceIds.includes(r.id));
    expect(ours.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Aggregation (mirrors POST /api/price-data/aggregate)
// ---------------------------------------------------------------------------
describe("price data — aggregation", () => {
  it("calculates median, P25, P75 for a brand+category group", async () => {
    // Insert enough data for aggregation (need >= 3)
    const batch = [
      { vintedId: "agg-1", brand: "Coach", category: "bags", price: "20.00" },
      { vintedId: "agg-2", brand: "Coach", category: "bags", price: "30.00" },
      { vintedId: "agg-3", brand: "Coach", category: "bags", price: "40.00" },
      { vintedId: "agg-4", brand: "Coach", category: "bags", price: "50.00" },
      { vintedId: "agg-5", brand: "Coach", category: "bags", price: "60.00" },
    ];
    const inserted = await db.insert(priceData).values(batch).returning();
    for (const r of inserted) createdPriceIds.push(r.id);

    // Run aggregation query
    const [group] = await db
      .select({
        brand: priceData.brand,
        category: priceData.category,
        count: sql<number>`count(*)::int`,
        median: sql<string>`percentile_cont(0.5) within group (order by ${priceData.price}::numeric)`,
        p25: sql<string>`percentile_cont(0.25) within group (order by ${priceData.price}::numeric)`,
        p75: sql<string>`percentile_cont(0.75) within group (order by ${priceData.price}::numeric)`,
      })
      .from(priceData)
      .where(
        and(
          eq(priceData.brand, "Coach"),
          eq(priceData.category, "bags"),
          sql`${priceData.price} is not null`,
          eq(priceData.status, "active"),
        ),
      )
      .groupBy(priceData.brand, priceData.category);

    expect(group.count).toBe(5);
    expect(parseFloat(group.median)).toBe(40); // median of 20,30,40,50,60
    expect(parseFloat(group.p25)).toBe(30);    // P25
    expect(parseFloat(group.p75)).toBe(50);    // P75
  });

  it("writes aggregated stats to price_stats table", async () => {
    const batch = [
      { vintedId: "stat-1", brand: "Prada", category: "bags", price: "100.00" },
      { vintedId: "stat-2", brand: "Prada", category: "bags", price: "120.00" },
      { vintedId: "stat-3", brand: "Prada", category: "bags", price: "140.00" },
    ];
    const inserted = await db.insert(priceData).values(batch).returning();
    for (const r of inserted) createdPriceIds.push(r.id);

    // Write to price_stats
    const [stat] = await db
      .insert(priceStats)
      .values({
        brand: "Prada",
        category: "bags",
        medianPrice: "120.00",
        p25Price: "110.00",
        p75Price: "130.00",
        sampleCount: 3,
      })
      .returning();
    createdStatIds.push(stat.id);

    expect(stat.brand).toBe("Prada");
    expect(stat.medianPrice).toBe("120.00");
    expect(stat.sampleCount).toBe(3);

    // Query it back
    const [fetched] = await db
      .select()
      .from(priceStats)
      .where(
        and(
          eq(priceStats.brand, "Prada"),
          eq(priceStats.category, "bags"),
        ),
      );

    expect(fetched.medianPrice).toBe("120.00");
  });
});

// ---------------------------------------------------------------------------
// Disappearance tracking
// ---------------------------------------------------------------------------
describe("price data — disappearance tracking", () => {
  it("marks old unseen listings as disappeared", async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const [row] = await db
      .insert(priceData)
      .values({
        vintedId: "disappear-1",
        brand: "Gucci",
        category: "bags",
        price: "200.00",
        lastSeenAt: oldDate,
      })
      .returning();
    createdPriceIds.push(row.id);

    // Mark as disappeared
    await db
      .update(priceData)
      .set({ status: "disappeared" })
      .where(eq(priceData.id, row.id));

    const [updated] = await db
      .select()
      .from(priceData)
      .where(eq(priceData.id, row.id));

    expect(updated.status).toBe("disappeared");
  });
});
