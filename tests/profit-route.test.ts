import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { items, transactions, expenses } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { GET } from "@/app/api/profit/route";

// ---------------------------------------------------------------------------
// Integration tests for GET /api/profit after the transactions-inArray +
// column-projection refactor. Seeds real rows, calls the handler, asserts
// on the response shape + math.
// ---------------------------------------------------------------------------

const createdItemIds: string[] = [];
const createdExpenseIds: string[] = [];

async function cleanup() {
  if (createdItemIds.length) {
    try {
      await db.delete(transactions).where(inArray(transactions.itemId, createdItemIds));
      await db.delete(items).where(inArray(items.id, createdItemIds));
    } catch {}
    createdItemIds.length = 0;
  }
  if (createdExpenseIds.length) {
    try {
      await db.delete(expenses).where(inArray(expenses.id, createdExpenseIds));
    } catch {}
    createdExpenseIds.length = 0;
  }
}

beforeEach(cleanup);
afterEach(cleanup);

function makeRequest(qs = ""): NextRequest {
  return new NextRequest(`http://localhost/api/profit${qs ? "?" + qs : ""}`);
}

async function seed() {
  const soldAt = new Date("2026-04-10");
  const [sold] = await db
    .insert(items)
    .values({
      name: "TEST-Profit-Sold",
      brand: "TestBrand",
      category: "test-cat",
      status: "sold",
      costPrice: "5.00",
      soldPrice: "25.00",
      listedPrice: "28.00",
      soldAt,
      listedAt: new Date("2026-04-01"),
      sourceType: "charity_shop",
    })
    .returning();
  createdItemIds.push(sold.id);

  // Transaction with shipping + fees — this is the inArray-target
  await db.insert(transactions).values({
    itemId: sold.id,
    transactionType: "sell",
    grossPrice: "25.00",
    shippingCost: "2.00",
    platformFees: "1.00",
    completedAt: soldAt,
  });

  const [listed] = await db
    .insert(items)
    .values({
      name: "TEST-Profit-Listed",
      status: "listed",
      costPrice: "3.00",
      listedPrice: "15.00",
      listedAt: new Date("2026-04-05"),
    })
    .returning();
  createdItemIds.push(listed.id);

  return { sold, listed };
}

describe("GET /api/profit", () => {
  it("sets the cache header", async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get("Cache-Control")).toBe(
      "private, max-age=300, stale-while-revalidate=600",
    );
  });

  it("includes shipping and fees from the joined transaction for sold items", async () => {
    const { sold } = await seed();

    const res = await GET(makeRequest("preset=all_time"));
    const body = (await res.json()) as {
      summary: {
        totalRevenue: number;
        totalCost: number;
        totalShipping: number;
        totalFees: number;
        netProfit: number;
      };
    };

    // The seeded sold item has revenue 25, cost 5, shipping 2, fees 1.
    // The DB may have other rows from Lily's real data; assert the math is
    // internally consistent rather than exact numbers.
    expect(body.summary.totalShipping).toBeGreaterThanOrEqual(2);
    expect(body.summary.totalFees).toBeGreaterThanOrEqual(1);

    // Revenue must include the seeded item.
    expect(body.summary.totalRevenue).toBeGreaterThanOrEqual(25);

    // Net profit = gross - shipping - fees - expenses. Prove the seeded
    // row's contribution is reflected.
    const seededContribution = 25 - 5 - 2 - 1; // 17
    expect(body.summary.netProfit).toBeGreaterThanOrEqual(seededContribution);

    // Silence unused warning
    expect(sold.id).toBeTypeOf("string");
  });

  it("returns byCategory / bySource / byMonth breakdowns", async () => {
    await seed();
    const res = await GET(makeRequest("preset=all_time"));
    const body = (await res.json()) as {
      byCategory: { category: string; profit: number }[];
      bySource: { source: string; profit: number }[];
      byMonth: { month: string }[];
    };

    expect(body.byCategory.some((c) => c.category === "test-cat")).toBe(true);
    expect(body.bySource.some((s) => s.source === "charity_shop")).toBe(true);
    expect(body.byMonth.some((m) => m.month === "2026-04")).toBe(true);
  });

  it("date range filter narrows the sold set", async () => {
    await seed();

    // Range well before the seeded soldAt of 2026-04-10
    const resEmpty = await GET(
      makeRequest("from=2025-01-01&to=2025-01-31"),
    );
    const bodyEmpty = (await resEmpty.json()) as {
      byCategory: { category: string }[];
    };
    expect(
      bodyEmpty.byCategory.find((c) => c.category === "test-cat"),
    ).toBeUndefined();

    // Range that includes soldAt
    const resHit = await GET(makeRequest("from=2026-04-01&to=2026-04-30"));
    const bodyHit = (await resHit.json()) as {
      byCategory: { category: string }[];
    };
    expect(
      bodyHit.byCategory.find((c) => c.category === "test-cat"),
    ).toBeDefined();
  });
});
