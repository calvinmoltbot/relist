import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// These tests validate the Drizzle ORM ↔ Neon integration for the items table.
// They run against the real database — not mocks.
// ---------------------------------------------------------------------------

// Track IDs we create so we can clean up
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

afterAll(async () => {
  await cleanup();
});

beforeEach(async () => {
  await cleanup();
});

// ---------------------------------------------------------------------------
// INSERT
// ---------------------------------------------------------------------------
describe("items table — insert", () => {
  it("inserts a minimal item (name only)", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Test Item — Minimal" })
      .returning();

    createdIds.push(item.id);

    expect(item.id).toBeDefined();
    expect(item.name).toBe("Test Item — Minimal");
    expect(item.status).toBe("sourced");
    expect(item.platform).toBe("vinted");
    expect(item.createdAt).toBeInstanceOf(Date);
    expect(item.updatedAt).toBeInstanceOf(Date);
  });

  it("inserts a fully-populated item", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Vintage Levi's 501",
        brand: "Levi's",
        category: "jeans",
        condition: "good",
        size: "W32 L30",
        costPrice: "8.00",
        listedPrice: "35.00",
        status: "listed",
        platform: "vinted",
        description: "Classic 501s, medium wash",
        sourceType: "charity_shop",
        sourceLocation: "Oxfam, Camden",
        listedAt: new Date("2026-04-07T10:00:00Z"),
      })
      .returning();

    createdIds.push(item.id);

    expect(item.brand).toBe("Levi's");
    expect(item.category).toBe("jeans");
    expect(item.costPrice).toBe("8.00");
    expect(item.listedPrice).toBe("35.00");
    expect(item.status).toBe("listed");
    expect(item.sourceType).toBe("charity_shop");
    expect(item.listedAt).toBeInstanceOf(Date);
  });

  it("generates a UUID primary key", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "UUID Test" })
      .returning();

    createdIds.push(item.id);

    // UUID v4 format
    expect(item.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

// ---------------------------------------------------------------------------
// SELECT
// ---------------------------------------------------------------------------
describe("items table — select", () => {
  it("selects an item by id", async () => {
    const [created] = await db
      .insert(items)
      .values({ name: "Select Test" })
      .returning();
    createdIds.push(created.id);

    const [found] = await db
      .select()
      .from(items)
      .where(eq(items.id, created.id));

    expect(found).toBeDefined();
    expect(found.name).toBe("Select Test");
  });

  it("returns empty for non-existent id", async () => {
    const result = await db
      .select()
      .from(items)
      .where(eq(items.id, "00000000-0000-0000-0000-000000000000"));

    expect(result).toHaveLength(0);
  });

  it("filters by status", async () => {
    const [a] = await db
      .insert(items)
      .values({ name: "Status A", status: "sourced" })
      .returning();
    const [b] = await db
      .insert(items)
      .values({ name: "Status B", status: "listed" })
      .returning();
    createdIds.push(a.id, b.id);

    const listed = await db
      .select()
      .from(items)
      .where(eq(items.status, "listed"));

    const ids = listed.map((i) => i.id);
    expect(ids).toContain(b.id);
    // 'a' is sourced, not listed — but other items may exist in DB
  });
});

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------
describe("items table — update", () => {
  it("updates fields on an existing item", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Update Test", status: "sourced" })
      .returning();
    createdIds.push(item.id);

    const now = new Date();
    const [updated] = await db
      .update(items)
      .set({
        status: "listed",
        listedPrice: "25.00",
        listedAt: now,
        updatedAt: now,
      })
      .where(eq(items.id, item.id))
      .returning();

    expect(updated.status).toBe("listed");
    expect(updated.listedPrice).toBe("25.00");
    expect(updated.listedAt).toBeInstanceOf(Date);
  });

  it("returns empty when updating non-existent id", async () => {
    const result = await db
      .update(items)
      .set({ name: "Ghost" })
      .where(eq(items.id, "00000000-0000-0000-0000-000000000000"))
      .returning();

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
describe("items table — delete", () => {
  it("deletes an item by id", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Delete Test" })
      .returning();

    const [deleted] = await db
      .delete(items)
      .where(eq(items.id, item.id))
      .returning();

    expect(deleted.id).toBe(item.id);

    // Verify gone
    const check = await db
      .select()
      .from(items)
      .where(eq(items.id, item.id));
    expect(check).toHaveLength(0);
  });

  it("returns empty when deleting non-existent id", async () => {
    const result = await db
      .delete(items)
      .where(eq(items.id, "00000000-0000-0000-0000-000000000000"))
      .returning();

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Schema defaults & constraints
// ---------------------------------------------------------------------------
describe("items table — defaults and constraints", () => {
  it("defaults status to 'sourced'", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Default Status" })
      .returning();
    createdIds.push(item.id);

    expect(item.status).toBe("sourced");
  });

  it("defaults platform to 'vinted'", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Default Platform" })
      .returning();
    createdIds.push(item.id);

    expect(item.platform).toBe("vinted");
  });

  it("sets createdAt and updatedAt automatically", async () => {
    const before = new Date();
    const [item] = await db
      .insert(items)
      .values({ name: "Timestamp Test" })
      .returning();
    createdIds.push(item.id);
    const after = new Date();

    expect(item.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(item.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  it("rejects insert without name", async () => {
    await expect(
      db.insert(items).values({} as { name: string }).returning(),
    ).rejects.toThrow();
  });

  it("stores numeric prices with correct precision", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Price Precision",
        costPrice: "12.99",
        listedPrice: "29.50",
        soldPrice: "27.00",
      })
      .returning();
    createdIds.push(item.id);

    expect(item.costPrice).toBe("12.99");
    expect(item.listedPrice).toBe("29.50");
    expect(item.soldPrice).toBe("27.00");
  });
});
