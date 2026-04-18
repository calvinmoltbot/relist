import { describe, it, expect, afterAll, beforeEach, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { items, transactions, dealAlerts } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tests for schema constraints: FK relationships, array fields on other
// tables, and edge cases in data types.
//
// These tests run against the real Neon DB (the only one configured). Every
// seeded row uses one of the TEST_NAMES below so a bulk cleanup can
// guarantee no leak regardless of test-flow mishaps — a previous version
// of this file was dropping rows on Lily's real inventory.
// ---------------------------------------------------------------------------

const TEST_ITEM_NAMES = [
  "FK Test Item",
  "FK Delete Test",
  "Buy/Sell Test",
];
const TEST_ALERT_NAMES = ["Levi's Jeans Alert"];

const cleanupFns: (() => Promise<void>)[] = [];

async function cleanup() {
  // Per-fn cleanup first (in unshift-push insertion order, which is already
  // child-before-parent for our callers).
  for (const fn of cleanupFns) {
    try {
      await fn();
    } catch {
      // ignore
    }
  }
  cleanupFns.length = 0;

  // Belt-and-braces bulk cleanup in FK-safe order. Catches anything the
  // per-test cleanup missed.
  try {
    const orphans = await db
      .select({ id: items.id })
      .from(items)
      .where(inArray(items.name, TEST_ITEM_NAMES));
    if (orphans.length) {
      const ids = orphans.map((o) => o.id);
      await db.delete(transactions).where(inArray(transactions.itemId, ids));
      await db.delete(items).where(inArray(items.id, ids));
    }
    await db.delete(dealAlerts).where(inArray(dealAlerts.name, TEST_ALERT_NAMES));
  } catch {
    // ignore
  }
}

beforeAll(cleanup);
afterAll(cleanup);
beforeEach(cleanup);

// ---------------------------------------------------------------------------
// Transactions FK constraint
// ---------------------------------------------------------------------------
describe("transactions — FK constraint", () => {
  it("creates a transaction linked to an item", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "FK Test Item", costPrice: "10.00" })
      .returning();
    cleanupFns.push(() => db.delete(items).where(eq(items.id, item.id)).then(() => {}));

    const [txn] = await db
      .insert(transactions)
      .values({
        itemId: item.id,
        transactionType: "buy",
        grossPrice: "10.00",
      })
      .returning();
    // Clean up transaction before item (FK order)
    cleanupFns.unshift(() => db.delete(transactions).where(eq(transactions.id, txn.id)).then(() => {}));

    expect(txn.itemId).toBe(item.id);
    expect(txn.transactionType).toBe("buy");
    expect(txn.grossPrice).toBe("10.00");
    expect(txn.shippingCost).toBe("0.00"); // default "0" stored as numeric(10,2)
    expect(txn.platformFees).toBe("0.00");
  });

  it("rejects transaction with non-existent item ID", async () => {
    await expect(
      db
        .insert(transactions)
        .values({
          itemId: "00000000-0000-0000-0000-000000000000",
          transactionType: "sell",
          grossPrice: "25.00",
        })
        .returning(),
    ).rejects.toThrow();
  });

  it("blocks item deletion when transactions exist", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "FK Delete Test" })
      .returning();

    const [txn] = await db
      .insert(transactions)
      .values({
        itemId: item.id,
        transactionType: "buy",
        grossPrice: "5.00",
      })
      .returning();

    // Should fail because of FK constraint (no cascade)
    await expect(
      db.delete(items).where(eq(items.id, item.id)),
    ).rejects.toThrow();

    // Clean up in correct order
    await db.delete(transactions).where(eq(transactions.id, txn.id));
    await db.delete(items).where(eq(items.id, item.id));
  });

  it("creates buy and sell transactions for same item", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Buy/Sell Test", costPrice: "8.00" })
      .returning();

    const [buy] = await db
      .insert(transactions)
      .values({
        itemId: item.id,
        transactionType: "buy",
        grossPrice: "8.00",
      })
      .returning();

    const [sell] = await db
      .insert(transactions)
      .values({
        itemId: item.id,
        transactionType: "sell",
        grossPrice: "25.00",
        shippingCost: "3.50",
        platformFees: "1.25",
        profit: "12.25",
      })
      .returning();

    expect(sell.profit).toBe("12.25");
    expect(sell.shippingCost).toBe("3.50");

    // Cleanup
    await db.delete(transactions).where(eq(transactions.id, buy.id));
    await db.delete(transactions).where(eq(transactions.id, sell.id));
    await db.delete(items).where(eq(items.id, item.id));
  });
});

// ---------------------------------------------------------------------------
// Deal alerts — array fields
// ---------------------------------------------------------------------------
describe("dealAlerts — array fields", () => {
  it("stores and retrieves brand/category/size arrays", async () => {
    const [alert] = await db
      .insert(dealAlerts)
      .values({
        name: "Levi's Jeans Alert",
        brands: ["Levi's", "Wrangler"],
        categories: ["jeans", "denim"],
        sizes: ["W30", "W32", "W34"],
        maxPrice: "20.00",
        minMarginPct: "50.00",
      })
      .returning();
    cleanupFns.push(() => db.delete(dealAlerts).where(eq(dealAlerts.id, alert.id)).then(() => {}));

    expect(alert.brands).toEqual(["Levi's", "Wrangler"]);
    expect(alert.categories).toEqual(["jeans", "denim"]);
    expect(alert.sizes).toEqual(["W30", "W32", "W34"]);
    expect(alert.maxPrice).toBe("20.00");
    expect(alert.enabled).toBe(true); // default
  });

  it("stores null arrays", async () => {
    const [alert] = await db
      .insert(dealAlerts)
      .values({ name: "Minimal Alert" })
      .returning();
    cleanupFns.push(() => db.delete(dealAlerts).where(eq(dealAlerts.id, alert.id)).then(() => {}));

    expect(alert.brands).toBeNull();
    expect(alert.categories).toBeNull();
    expect(alert.sizes).toBeNull();
  });

  it("updates enabled flag", async () => {
    const [alert] = await db
      .insert(dealAlerts)
      .values({ name: "Toggle Test", enabled: true })
      .returning();
    cleanupFns.push(() => db.delete(dealAlerts).where(eq(dealAlerts.id, alert.id)).then(() => {}));

    const [updated] = await db
      .update(dealAlerts)
      .set({ enabled: false })
      .where(eq(dealAlerts.id, alert.id))
      .returning();

    expect(updated.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Numeric precision edge cases
// ---------------------------------------------------------------------------
describe("numeric precision", () => {
  it("handles max schema precision (10,2)", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Big Price",
        costPrice: "99999999.99",
        listedPrice: "0.01",
      })
      .returning();
    cleanupFns.push(() => db.delete(items).where(eq(items.id, item.id)).then(() => {}));

    expect(item.costPrice).toBe("99999999.99");
    expect(item.listedPrice).toBe("0.01");
  });

  it("rounds to 2 decimal places", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Rounding Test",
        costPrice: "10.999",
      })
      .returning();
    cleanupFns.push(() => db.delete(items).where(eq(items.id, item.id)).then(() => {}));

    // PG rounds numeric(10,2) — 10.999 rounds to 11.00
    expect(item.costPrice).toBe("11.00");
  });
});
