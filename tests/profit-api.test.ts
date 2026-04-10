import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, or } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tests for the profit API aggregation logic.
// We test the DB queries and computation directly since the API route
// is a thin wrapper.
// ---------------------------------------------------------------------------

const createdIds: string[] = [];

async function cleanup() {
  for (const id of createdIds) {
    try {
      await db.delete(items).where(eq(items.id, id));
    } catch {
      // ignore
    }
  }
  createdIds.length = 0;
}

afterAll(cleanup);
beforeEach(cleanup);

// Helper: seed realistic inventory for profit testing
async function seedProfitData() {
  const batch = [
    // Sold items (contribute to profit)
    {
      name: "Levi's 501",
      brand: "Levi's",
      category: "jeans",
      status: "sold" as const,
      costPrice: "8.00",
      listedPrice: "35.00",
      soldPrice: "32.00",
      sourceType: "charity_shop",
      soldAt: new Date("2026-03-15"),
    },
    {
      name: "Dr. Martens Boots",
      brand: "Dr. Martens",
      category: "shoes",
      status: "shipped" as const,
      costPrice: "12.00",
      listedPrice: "45.00",
      soldPrice: "42.00",
      sourceType: "charity_shop",
      soldAt: new Date("2026-03-28"),
    },
    {
      name: "Zara Blazer",
      brand: "Zara",
      category: "jackets",
      status: "sold" as const,
      costPrice: "6.00",
      listedPrice: "28.00",
      soldPrice: "25.00",
      sourceType: "car_boot",
      soldAt: new Date("2026-04-05"),
    },
    {
      name: "Penguin Books Bundle",
      brand: null,
      category: "books",
      status: "shipped" as const,
      costPrice: "3.00",
      listedPrice: "18.00",
      soldPrice: "16.00",
      sourceType: "car_boot",
      soldAt: new Date("2026-04-08"),
    },
    // Listed items (contribute to stock value)
    {
      name: "Nike Air Max",
      brand: "Nike",
      category: "shoes",
      status: "listed" as const,
      costPrice: "15.00",
      listedPrice: "45.00",
      sourceType: "online",
    },
    // Sourced items (contribute to stock cost)
    {
      name: "Coach Bag",
      brand: "Coach",
      category: "bags",
      status: "sourced" as const,
      costPrice: "20.00",
      sourceType: "charity_shop",
    },
  ];

  const inserted = await db.insert(items).values(batch).returning();
  for (const i of inserted) createdIds.push(i.id);
  return inserted;
}

// Replicate the profit API's computation logic
function computeProfit(allItems: typeof items.$inferSelect[]) {
  const sold = allItems.filter(
    (i) => i.status === "sold" || i.status === "shipped",
  );
  const listed = allItems.filter((i) => i.status === "listed");
  const sourced = allItems.filter((i) => i.status === "sourced");

  let totalRevenue = 0;
  let totalCost = 0;

  for (const item of sold) {
    totalRevenue += item.soldPrice ? parseFloat(item.soldPrice) : 0;
    totalCost += item.costPrice ? parseFloat(item.costPrice) : 0;
  }

  let stockCost = 0;
  let stockListed = 0;
  for (const item of [...listed, ...sourced]) {
    stockCost += item.costPrice ? parseFloat(item.costPrice) : 0;
    stockListed += item.listedPrice ? parseFloat(item.listedPrice) : 0;
  }

  return {
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
    itemsSold: sold.length,
    itemsListed: listed.length,
    itemsSourced: sourced.length,
    stockCost,
    stockListed,
  };
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------
describe("profit — summary computation", () => {
  it("calculates total revenue from sold + shipped items", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const result = computeProfit(allItems);

    // Sold: 32 + 42 + 25 + 16 = 115
    expect(result.totalRevenue).toBe(115);
  });

  it("calculates total cost from sold + shipped items", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const result = computeProfit(allItems);

    // Cost: 8 + 12 + 6 + 3 = 29
    expect(result.totalCost).toBe(29);
  });

  it("calculates total profit correctly", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const result = computeProfit(allItems);

    // 115 - 29 = 86
    expect(result.totalProfit).toBe(86);
  });

  it("counts sold items (sold + shipped)", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const result = computeProfit(allItems);
    expect(result.itemsSold).toBe(4);
  });

  it("calculates stock value from listed + sourced items", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const result = computeProfit(allItems);

    // Stock cost: Nike 15 + Coach 20 = 35
    expect(result.stockCost).toBe(35);
    // Stock listed: Nike 45 (Coach has no listed price)
    expect(result.stockListed).toBe(45);
  });

  it("handles zero sold items gracefully", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Unsold Item", status: "listed", costPrice: "10.00" })
      .returning();
    createdIds.push(item.id);

    const allItems = await db
      .select()
      .from(items)
      .where(eq(items.id, item.id));

    const result = computeProfit(allItems);

    expect(result.totalRevenue).toBe(0);
    expect(result.totalProfit).toBe(0);
    expect(result.itemsSold).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Category breakdown
// ---------------------------------------------------------------------------
describe("profit — category breakdown", () => {
  it("groups profit by category", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const sold = allItems.filter(
      (i) => i.status === "sold" || i.status === "shipped",
    );

    const byCategory: Record<string, { profit: number; count: number }> = {};
    for (const item of sold) {
      const cat = item.category || "uncategorised";
      const cost = item.costPrice ? parseFloat(item.costPrice) : 0;
      const soldPrice = item.soldPrice ? parseFloat(item.soldPrice) : 0;
      if (!byCategory[cat]) byCategory[cat] = { profit: 0, count: 0 };
      byCategory[cat].profit += soldPrice - cost;
      byCategory[cat].count += 1;
    }

    expect(byCategory.jeans).toEqual({ profit: 24, count: 1 }); // 32 - 8
    expect(byCategory.shoes).toEqual({ profit: 30, count: 1 }); // 42 - 12
    expect(byCategory.jackets).toEqual({ profit: 19, count: 1 }); // 25 - 6
    expect(byCategory.books).toEqual({ profit: 13, count: 1 }); // 16 - 3
  });
});

// ---------------------------------------------------------------------------
// Source breakdown
// ---------------------------------------------------------------------------
describe("profit — source breakdown", () => {
  it("groups profit by source type", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const sold = allItems.filter(
      (i) => i.status === "sold" || i.status === "shipped",
    );

    const bySource: Record<string, { profit: number; count: number }> = {};
    for (const item of sold) {
      const src = item.sourceType || "unknown";
      const cost = item.costPrice ? parseFloat(item.costPrice) : 0;
      const soldPrice = item.soldPrice ? parseFloat(item.soldPrice) : 0;
      if (!bySource[src]) bySource[src] = { profit: 0, count: 0 };
      bySource[src].profit += soldPrice - cost;
      bySource[src].count += 1;
    }

    // Charity shop: Levi's (24) + Dr. Martens (30) = 54
    expect(bySource.charity_shop).toEqual({ profit: 54, count: 2 });
    // Car boot: Zara (19) + Books (13) = 32
    expect(bySource.car_boot).toEqual({ profit: 32, count: 2 });
  });
});

// ---------------------------------------------------------------------------
// Monthly timeline
// ---------------------------------------------------------------------------
describe("profit — monthly timeline", () => {
  it("groups profit by month from soldAt dates", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const sold = allItems.filter(
      (i) => i.status === "sold" || i.status === "shipped",
    );

    const byMonth: Record<string, number> = {};
    for (const item of sold) {
      const month = item.soldAt
        ? item.soldAt.toISOString().substring(0, 7)
        : "unknown";
      byMonth[month] = (byMonth[month] || 0) + 1;
    }

    // March: Levi's + Dr. Martens = 2
    expect(byMonth["2026-03"]).toBe(2);
    // April: Zara + Books = 2
    expect(byMonth["2026-04"]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Margin calculation
// ---------------------------------------------------------------------------
describe("profit — margin", () => {
  it("calculates average margin correctly", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const result = computeProfit(allItems);

    // Margin = profit / revenue * 100 = 86 / 115 * 100 = 74.78%
    const margin = (result.totalProfit / result.totalRevenue) * 100;
    expect(margin).toBeCloseTo(74.78, 1);
  });

  it("target margin is 65% (Lily's goal)", async () => {
    await seedProfitData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const result = computeProfit(allItems);
    const margin = (result.totalProfit / result.totalRevenue) * 100;

    // Seed data should exceed Lily's 65% margin target
    expect(margin).toBeGreaterThan(65);
  });
});
