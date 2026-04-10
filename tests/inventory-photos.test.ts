import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tests for photoUrls array field persistence.
// Validates that text[] arrays round-trip correctly through Drizzle/Neon.
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

describe("photoUrls array field", () => {
  it("stores and retrieves a single photo URL", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Single Photo",
        photoUrls: ["data:image/png;base64,abc123"],
      })
      .returning();
    createdIds.push(item.id);

    expect(item.photoUrls).toEqual(["data:image/png;base64,abc123"]);

    // Re-fetch to verify persistence
    const [fetched] = await db.select().from(items).where(eq(items.id, item.id));
    expect(fetched.photoUrls).toEqual(["data:image/png;base64,abc123"]);
  });

  it("stores and retrieves multiple photo URLs", async () => {
    const urls = [
      "data:image/jpeg;base64,photo1",
      "data:image/jpeg;base64,photo2",
      "data:image/png;base64,photo3",
    ];

    const [item] = await db
      .insert(items)
      .values({ name: "Multi Photo", photoUrls: urls })
      .returning();
    createdIds.push(item.id);

    expect(item.photoUrls).toHaveLength(3);
    expect(item.photoUrls).toEqual(urls);
  });

  it("stores null when no photos", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "No Photo" })
      .returning();
    createdIds.push(item.id);

    expect(item.photoUrls).toBeNull();
  });

  it("stores empty array", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Empty Array", photoUrls: [] })
      .returning();
    createdIds.push(item.id);

    expect(item.photoUrls).toEqual([]);
  });

  it("updates photos on an existing item", async () => {
    const [item] = await db
      .insert(items)
      .values({ name: "Update Photos" })
      .returning();
    createdIds.push(item.id);

    expect(item.photoUrls).toBeNull();

    const [updated] = await db
      .update(items)
      .set({ photoUrls: ["data:image/jpeg;base64,newphoto"] })
      .where(eq(items.id, item.id))
      .returning();

    expect(updated.photoUrls).toEqual(["data:image/jpeg;base64,newphoto"]);
  });

  it("clears photos by setting to null", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Clear Photos",
        photoUrls: ["data:image/jpeg;base64,willremove"],
      })
      .returning();
    createdIds.push(item.id);

    const [updated] = await db
      .update(items)
      .set({ photoUrls: null })
      .where(eq(items.id, item.id))
      .returning();

    expect(updated.photoUrls).toBeNull();
  });

  it("replaces photo array entirely", async () => {
    const [item] = await db
      .insert(items)
      .values({
        name: "Replace Photos",
        photoUrls: ["old1", "old2"],
      })
      .returning();
    createdIds.push(item.id);

    const [updated] = await db
      .update(items)
      .set({ photoUrls: ["new1", "new2", "new3"] })
      .where(eq(items.id, item.id))
      .returning();

    expect(updated.photoUrls).toEqual(["new1", "new2", "new3"]);
  });

  it("handles long base64 data URLs", async () => {
    // Simulate a real base64 image (truncated but long)
    const longUrl = "data:image/jpeg;base64," + "A".repeat(10000);

    const [item] = await db
      .insert(items)
      .values({ name: "Long URL", photoUrls: [longUrl] })
      .returning();
    createdIds.push(item.id);

    const [fetched] = await db.select().from(items).where(eq(items.id, item.id));
    expect(fetched.photoUrls![0]).toBe(longUrl);
  });
});
