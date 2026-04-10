import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, or } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tests for the dashboard API aggregation logic.
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

async function seedDashboardData() {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5);
  const lastWeek = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

  const batch = [
    // Sourced — needs listing
    { name: "Unlisted Item 1", status: "sourced" as const, costPrice: "5.00", createdAt: twoWeeksAgo },
    { name: "Unlisted Item 2", status: "sourced" as const, costPrice: "8.00" },
    // Listed — one stale (>14 days)
    { name: "Fresh Listing", status: "listed" as const, listedPrice: "25.00", listedAt: lastWeek },
    { name: "Stale Listing", status: "listed" as const, listedPrice: "30.00", listedAt: twoWeeksAgo },
    // Sold — needs shipping
    { name: "Needs Shipping", status: "sold" as const, costPrice: "10.00", soldPrice: "35.00", soldAt: lastWeek },
    // Shipped this month
    { name: "Already Shipped", status: "shipped" as const, costPrice: "7.00", soldPrice: "28.00", soldAt: thisMonth },
  ];

  const inserted = await db.insert(items).values(batch).returning();
  for (const i of inserted) createdIds.push(i.id);
  return inserted;
}

// Helper: replicate dashboard's categorisation logic
function categorise(allItems: typeof items.$inferSelect[]) {
  const sourced = allItems.filter((i) => i.status === "sourced");
  const listed = allItems.filter((i) => i.status === "listed");
  const sold = allItems.filter((i) => i.status === "sold");
  const shipped = allItems.filter((i) => i.status === "shipped");
  return { sourced, listed, sold, shipped };
}

function daysSince(date: Date | null | undefined): number {
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

describe("dashboard — item categorisation", () => {
  it("counts items by status", async () => {
    await seedDashboardData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const { sourced, listed, sold, shipped } = categorise(allItems);

    expect(sourced.length).toBe(2);
    expect(listed.length).toBe(2);
    expect(sold.length).toBe(1);
    expect(shipped.length).toBe(1);
  });
});

describe("dashboard — action items", () => {
  it("identifies items needing listing (sourced status)", async () => {
    await seedDashboardData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const needsListing = allItems.filter((i) => i.status === "sourced");
    expect(needsListing.length).toBe(2);
  });

  it("identifies items needing shipping (sold status)", async () => {
    await seedDashboardData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const needsShipping = allItems.filter((i) => i.status === "sold");
    expect(needsShipping.length).toBe(1);
    expect(needsShipping[0].name).toBe("Needs Shipping");
  });

  it("identifies stale listings (>14 days)", async () => {
    await seedDashboardData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const stale = allItems
      .filter((i) => i.status === "listed")
      .filter((i) => daysSince(i.listedAt) > 14);

    expect(stale.length).toBe(1);
    expect(stale[0].name).toBe("Stale Listing");
  });
});

describe("dashboard — revenue calculation", () => {
  it("calculates this month's revenue from sold + shipped items", async () => {
    await seedDashboardData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthSold = allItems
      .filter((i) => i.status === "sold" || i.status === "shipped")
      .filter((i) => i.soldAt && i.soldAt.toISOString().startsWith(currentMonthKey));

    const monthRevenue = monthSold.reduce(
      (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0),
      0,
    );

    // Both "Needs Shipping" (35) and "Already Shipped" (28) sold this month
    expect(monthRevenue).toBe(63);
    expect(monthSold.length).toBe(2);
  });

  it("calculates revenue progress against £3k target", async () => {
    await seedDashboardData();
    const allItems = await db
      .select()
      .from(items)
      .where(or(...createdIds.map((id) => eq(items.id, id))));

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthSold = allItems
      .filter((i) => i.status === "sold" || i.status === "shipped")
      .filter((i) => i.soldAt && i.soldAt.toISOString().startsWith(currentMonthKey));

    const monthRevenue = monthSold.reduce(
      (sum, i) => sum + (i.soldPrice ? parseFloat(i.soldPrice) : 0),
      0,
    );

    const TARGET = 3000;
    const progress = (monthRevenue / TARGET) * 100;

    expect(progress).toBeCloseTo(2.1, 1); // 63/3000 = 2.1%
  });
});

describe("dashboard — empty state", () => {
  it("handles no items gracefully", async () => {
    // Don't seed — just query
    const allItems = await db
      .select()
      .from(items)
      .where(eq(items.id, "00000000-0000-0000-0000-000000000000"));

    const { sourced, listed, sold, shipped } = categorise(allItems);

    expect(sourced.length).toBe(0);
    expect(listed.length).toBe(0);
    expect(sold.length).toBe(0);
    expect(shipped.length).toBe(0);
  });
});
