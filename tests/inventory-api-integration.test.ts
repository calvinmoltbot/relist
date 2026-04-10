import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, ilike, or, desc, asc, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Integration tests that mirror what the API routes do with Drizzle.
// Validates the query patterns used in route.ts and [id]/route.ts.
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

afterAll(async () => {
  await cleanup();
});

beforeEach(async () => {
  await cleanup();
});

// Helper: seed a batch of items
async function seedItems() {
  const batch = [
    { name: "Nike Air Max 90", brand: "Nike", category: "shoes", status: "listed" as const, costPrice: "15.00", listedPrice: "45.00" },
    { name: "Zara Silk Blouse", brand: "Zara", category: "tops", status: "sourced" as const, costPrice: "4.00" },
    { name: "Levi's 501 Jeans", brand: "Levi's", category: "jeans", status: "sold" as const, costPrice: "8.00", listedPrice: "35.00", soldPrice: "32.00" },
    { name: "Coach Crossbody Bag", brand: "Coach", category: "bags", status: "shipped" as const, costPrice: "12.00", soldPrice: "55.00" },
    { name: "Unbranded Vintage Dress", brand: null, category: "dresses", status: "listed" as const, costPrice: "3.00", listedPrice: "22.00" },
  ];

  const inserted = await db.insert(items).values(batch).returning();
  for (const i of inserted) createdIds.push(i.id);
  return inserted;
}

// ---------------------------------------------------------------------------
// GET /api/inventory — query patterns
// ---------------------------------------------------------------------------
describe("inventory list queries", () => {
  it("returns all items when no filters", async () => {
    await seedItems();

    const result = await db
      .select()
      .from(items)
      .where(
        or(...createdIds.map((id) => eq(items.id, id))),
      )
      .orderBy(desc(items.createdAt));

    expect(result.length).toBe(5);
  });

  it("filters by status", async () => {
    await seedItems();

    const listed = await db
      .select()
      .from(items)
      .where(eq(items.status, "listed"));

    // At least our 2 listed items
    const ours = listed.filter((i) => createdIds.includes(i.id));
    expect(ours.length).toBe(2);
    expect(ours.every((i) => i.status === "listed")).toBe(true);
  });

  it("searches by name (case-insensitive)", async () => {
    await seedItems();
    const search = "nike";

    const result = await db
      .select()
      .from(items)
      .where(
        or(
          ilike(items.name, `%${search}%`),
          ilike(items.brand, `%${search}%`),
          ilike(items.category, `%${search}%`),
        ),
      );

    const ours = result.filter((i) => createdIds.includes(i.id));
    expect(ours.length).toBe(1);
    expect(ours[0].name).toBe("Nike Air Max 90");
  });

  it("searches by brand", async () => {
    await seedItems();

    const result = await db
      .select()
      .from(items)
      .where(ilike(items.brand, "%coach%"));

    const ours = result.filter((i) => createdIds.includes(i.id));
    expect(ours.length).toBe(1);
    expect(ours[0].brand).toBe("Coach");
  });

  it("sorts by price descending", async () => {
    const seeded = await seedItems();

    const result = await db
      .select()
      .from(items)
      .where(
        or(...createdIds.map((id) => eq(items.id, id))),
      )
      .orderBy(desc(sql`COALESCE(${items.listedPrice}, ${items.costPrice}, '0')`));

    // Coach bag has soldPrice 55 but no listedPrice, so COALESCE uses costPrice 12
    // Nike: 45, Levi's: 35, Dress: 22, Coach: 12, Zara: 4
    expect(result[0].name).toBe("Nike Air Max 90");
    expect(result[result.length - 1].name).toBe("Zara Silk Blouse");
  });

  it("sorts by brand ascending", async () => {
    const seeded = await seedItems();

    const result = await db
      .select()
      .from(items)
      .where(
        or(...createdIds.map((id) => eq(items.id, id))),
      )
      .orderBy(asc(items.brand));

    // PG sorts NULLs last in ASC order
    expect(result[result.length - 1].brand).toBeNull();
  });

  it("combines status filter and search", async () => {
    await seedItems();

    const result = await db
      .select()
      .from(items)
      .where(
        sql`${eq(items.status, "listed")} AND ${or(
          ilike(items.name, "%dress%"),
          ilike(items.brand, "%dress%"),
          ilike(items.category, "%dress%"),
        )}`,
      );

    const ours = result.filter((i) => createdIds.includes(i.id));
    expect(ours.length).toBe(1);
    expect(ours[0].name).toBe("Unbranded Vintage Dress");
  });
});

// ---------------------------------------------------------------------------
// POST /api/inventory — insert pattern
// ---------------------------------------------------------------------------
describe("inventory create", () => {
  it("creates item with all optional fields", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Full Item Test",
        brand: "TestBrand",
        category: "jackets",
        condition: "like_new",
        size: "M",
        costPrice: "10.00",
        listedPrice: "30.00",
        description: "Test description",
        sourceType: "car_boot",
        sourceLocation: "Battersea",
      })
      .returning();
    createdIds.push(item.id);

    expect(item.name).toBe("Full Item Test");
    expect(item.brand).toBe("TestBrand");
    expect(item.status).toBe("sourced"); // default
    expect(item.platform).toBe("vinted"); // default
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/inventory/[id] — update with status transitions
// ---------------------------------------------------------------------------
describe("inventory update — status transitions", () => {
  it("sets listedAt when status changes to listed", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Status Transition Test", status: "sourced" })
      .returning();
    createdIds.push(item.id);

    expect(item.listedAt).toBeNull();

    const now = new Date();
    const [updated] = await db
      .update(items)
      .set({ status: "listed", listedAt: now, updatedAt: now })
      .where(eq(items.id, item.id))
      .returning();

    expect(updated.status).toBe("listed");
    expect(updated.listedAt).toBeInstanceOf(Date);
  });

  it("sets soldAt when status changes to sold", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Sold Transition", status: "listed" })
      .returning();
    createdIds.push(item.id);

    const now = new Date();
    const [updated] = await db
      .update(items)
      .set({ status: "sold", soldPrice: "25.00", soldAt: now, updatedAt: now })
      .where(eq(items.id, item.id))
      .returning();

    expect(updated.status).toBe("sold");
    expect(updated.soldPrice).toBe("25.00");
    expect(updated.soldAt).toBeInstanceOf(Date);
  });

  it("sets shippedAt when status changes to shipped", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Ship Transition", status: "sold" })
      .returning();
    createdIds.push(item.id);

    const now = new Date();
    const [updated] = await db
      .update(items)
      .set({ status: "shipped", shippedAt: now, updatedAt: now })
      .where(eq(items.id, item.id))
      .returning();

    expect(updated.status).toBe("shipped");
    expect(updated.shippedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/inventory/[id] — delete pattern
// ---------------------------------------------------------------------------
describe("inventory delete", () => {
  it("deletes and returns the deleted item", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Delete Me" })
      .returning();

    const [deleted] = await db
      .delete(items)
      .where(eq(items.id, item.id))
      .returning();

    expect(deleted.id).toBe(item.id);

    // Verify it's gone
    const check = await db.select().from(items).where(eq(items.id, item.id));
    expect(check).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Full CRUD lifecycle
// ---------------------------------------------------------------------------
describe("full CRUD lifecycle", () => {
  it("create → read → update → delete", async () => {
    // CREATE
    const [created] = await db
      .insert(items)
      .values({
        name: "Lifecycle Item",
        brand: "Nike",
        costPrice: "10.00",
        sourceType: "charity_shop",
      })
      .returning();

    expect(created.status).toBe("sourced");
    expect(created.id).toBeDefined();

    // READ
    const [read] = await db
      .select()
      .from(items)
      .where(eq(items.id, created.id));
    expect(read.name).toBe("Lifecycle Item");

    // UPDATE — list it
    const now = new Date();
    const [listed] = await db
      .update(items)
      .set({
        status: "listed",
        listedPrice: "30.00",
        listedAt: now,
        updatedAt: now,
      })
      .where(eq(items.id, created.id))
      .returning();
    expect(listed.status).toBe("listed");
    expect(listed.listedPrice).toBe("30.00");

    // UPDATE — sell it
    const [sold] = await db
      .update(items)
      .set({
        status: "sold",
        soldPrice: "28.00",
        soldAt: now,
        updatedAt: now,
      })
      .where(eq(items.id, created.id))
      .returning();
    expect(sold.status).toBe("sold");
    expect(sold.soldPrice).toBe("28.00");

    // DELETE
    const [deleted] = await db
      .delete(items)
      .where(eq(items.id, created.id))
      .returning();
    expect(deleted.id).toBe(created.id);

    // VERIFY GONE
    const gone = await db
      .select()
      .from(items)
      .where(eq(items.id, created.id));
    expect(gone).toHaveLength(0);
  });
});
