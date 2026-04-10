import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tests for issue #4: status dropdown transitions
// Validates that status changes work correctly through the Drizzle layer,
// including auto-timestamp logic that the API routes apply.
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

// Helper: mirrors the PATCH route's auto-timestamp logic
async function updateWithStatusLogic(
  id: string,
  body: Record<string, unknown>,
) {
  const [existing] = await db
    .select()
    .from(items)
    .where(eq(items.id, id));
  if (!existing) throw new Error("Item not found");

  const now = new Date();
  const updates: Record<string, unknown> = { ...body, updatedAt: now };

  if (body.status === "listed" && existing.status !== "listed") {
    updates.listedAt = now;
  }
  if (body.status === "sold" && existing.status !== "sold") {
    updates.soldAt = now;
  }
  if (body.status === "shipped" && existing.status !== "shipped") {
    updates.shippedAt = now;
  }

  const [updated] = await db
    .update(items)
    .set(updates)
    .where(eq(items.id, id))
    .returning();

  return updated;
}

// ---------------------------------------------------------------------------
// Forward transitions (happy path)
// ---------------------------------------------------------------------------
describe("status transitions — forward flow", () => {
  it("sourced → listed: sets listedAt", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Forward Test", status: "sourced" })
      .returning();
    createdIds.push(item.id);

    expect(item.listedAt).toBeNull();

    const updated = await updateWithStatusLogic(item.id, {
      status: "listed",
      listedPrice: "25.00",
    });

    expect(updated.status).toBe("listed");
    expect(updated.listedPrice).toBe("25.00");
    expect(updated.listedAt).toBeInstanceOf(Date);
    expect(updated.soldAt).toBeNull();
    expect(updated.shippedAt).toBeNull();
  });

  it("listed → sold: sets soldAt, preserves listedAt", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Sell Test",
        status: "listed",
        listedPrice: "30.00",
        listedAt: new Date("2026-04-01"),
      })
      .returning();
    createdIds.push(item.id);

    const updated = await updateWithStatusLogic(item.id, {
      status: "sold",
      soldPrice: "28.00",
    });

    expect(updated.status).toBe("sold");
    expect(updated.soldPrice).toBe("28.00");
    expect(updated.soldAt).toBeInstanceOf(Date);
    // listedAt should be preserved from original insert
    expect(updated.listedAt).toBeInstanceOf(Date);
    expect(updated.shippedAt).toBeNull();
  });

  it("sold → shipped: sets shippedAt, preserves soldAt", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Ship Test",
        status: "sold",
        soldPrice: "20.00",
        soldAt: new Date("2026-04-05"),
      })
      .returning();
    createdIds.push(item.id);

    const updated = await updateWithStatusLogic(item.id, {
      status: "shipped",
    });

    expect(updated.status).toBe("shipped");
    expect(updated.shippedAt).toBeInstanceOf(Date);
    expect(updated.soldAt).toBeInstanceOf(Date);
  });

  it("full lifecycle: sourced → listed → sold → shipped", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Full Lifecycle", costPrice: "5.00" })
      .returning();
    createdIds.push(item.id);

    expect(item.status).toBe("sourced");

    // → listed
    const listed = await updateWithStatusLogic(item.id, {
      status: "listed",
      listedPrice: "20.00",
    });
    expect(listed.status).toBe("listed");
    expect(listed.listedAt).toBeInstanceOf(Date);

    // → sold
    const sold = await updateWithStatusLogic(item.id, {
      status: "sold",
      soldPrice: "18.00",
    });
    expect(sold.status).toBe("sold");
    expect(sold.soldAt).toBeInstanceOf(Date);
    expect(sold.listedAt).toBeInstanceOf(Date); // preserved

    // → shipped
    const shipped = await updateWithStatusLogic(item.id, {
      status: "shipped",
    });
    expect(shipped.status).toBe("shipped");
    expect(shipped.shippedAt).toBeInstanceOf(Date);
    expect(shipped.soldAt).toBeInstanceOf(Date); // preserved
    expect(shipped.listedAt).toBeInstanceOf(Date); // preserved
  });
});

// ---------------------------------------------------------------------------
// Backward / skip transitions
// ---------------------------------------------------------------------------
describe("status transitions — backward and skip", () => {
  it("listed → sourced: does not clear listedAt (API just sets status)", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Backward Test",
        status: "listed",
        listedAt: new Date("2026-04-01"),
      })
      .returning();
    createdIds.push(item.id);

    const updated = await updateWithStatusLogic(item.id, {
      status: "sourced",
    });

    expect(updated.status).toBe("sourced");
    // listedAt is NOT cleared — the API only sets timestamps forward
    expect(updated.listedAt).toBeInstanceOf(Date);
  });

  it("sourced → sold (skip listed): sets soldAt only", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Skip Test", status: "sourced" })
      .returning();
    createdIds.push(item.id);

    const updated = await updateWithStatusLogic(item.id, {
      status: "sold",
      soldPrice: "15.00",
    });

    expect(updated.status).toBe("sold");
    expect(updated.soldAt).toBeInstanceOf(Date);
    expect(updated.listedAt).toBeNull(); // was never listed
  });
});

// ---------------------------------------------------------------------------
// No-op transitions (same status)
// ---------------------------------------------------------------------------
describe("status transitions — no-op", () => {
  it("listed → listed: does not re-set listedAt", async () => {
    const originalDate = new Date("2026-04-01T10:00:00Z");
    const [item] = await db
      .insert(items)
      .values({
        name: "No-op Test",
        status: "listed",
        listedAt: originalDate,
      })
      .returning();
    createdIds.push(item.id);

    const updated = await updateWithStatusLogic(item.id, {
      status: "listed",
      listedPrice: "99.00",
    });

    expect(updated.status).toBe("listed");
    expect(updated.listedPrice).toBe("99.00");
    // listedAt should NOT be overwritten since status didn't change
    expect(updated.listedAt!.getTime()).toBe(originalDate.getTime());
  });
});

// ---------------------------------------------------------------------------
// Status update with other field changes
// ---------------------------------------------------------------------------
describe("status transitions — combined updates", () => {
  it("updates name and status simultaneously", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Old Name", status: "sourced" })
      .returning();
    createdIds.push(item.id);

    const updated = await updateWithStatusLogic(item.id, {
      name: "New Name",
      status: "listed",
      listedPrice: "30.00",
    });

    expect(updated.name).toBe("New Name");
    expect(updated.status).toBe("listed");
    expect(updated.listedPrice).toBe("30.00");
    expect(updated.listedAt).toBeInstanceOf(Date);
  });

  it("updates brand/category without changing status", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Meta Update", status: "listed", brand: "Nike" })
      .returning();
    createdIds.push(item.id);

    const updated = await updateWithStatusLogic(item.id, {
      brand: "Adidas",
      category: "shoes",
    });

    expect(updated.brand).toBe("Adidas");
    expect(updated.category).toBe("shoes");
    expect(updated.status).toBe("listed"); // unchanged
  });
});
