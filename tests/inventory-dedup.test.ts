import { describe, it, expect, afterEach } from "vitest";
import { POST } from "@/app/api/inventory/route";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Regression tests for POST /api/inventory deduplication.
//
// Background: item names are heavily templated (Lily has several near-identical
// "…sequin hanky hem cami" listings). The old dedup matched on name alone and
// would silently merge a fresh submission into ANY existing row of the same
// name — including an already sold/shipped one — so the new listing never
// appeared under "Listed". These tests lock in the corrected behaviour.
// ---------------------------------------------------------------------------

const createdIds: string[] = [];
const tag = `zzdedup-${Math.random().toString(36).slice(2, 8)}`;

function req(body: Record<string, unknown>): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

async function post(body: Record<string, unknown>) {
  const res = await POST(req(body));
  const json = await res.json();
  if (json?.item?.id) createdIds.push(json.item.id);
  return { status: res.status, ...json } as {
    status: number;
    item: typeof items.$inferSelect;
    updated?: boolean;
  };
}

async function seed(overrides: Partial<typeof items.$inferInsert>) {
  const [row] = await db
    .insert(items)
    .values({
      sku: `T-${tag}-${Math.random().toString(36).slice(2, 6)}`,
      name: overrides.name ?? `${tag} item`,
      ...overrides,
    })
    .returning();
  createdIds.push(row.id);
  return row;
}

afterEach(async () => {
  for (const id of createdIds) {
    try {
      await db.delete(items).where(eq(items.id, id));
    } catch {
      // ignore
    }
  }
  createdIds.length = 0;
});

describe("POST /api/inventory dedup", () => {
  it("re-listing a name that matches a SOLD row inserts a new item (does not merge)", async () => {
    const soldName = `${tag} sequin hanky hem cami`;
    const sold = await seed({ name: soldName, status: "sold", soldPrice: "20.00" });

    const res = await post({
      name: soldName,
      status: "listed",
      listedPrice: "30.00",
      vintedUrl: `https://www.vinted.co.uk/items/${tag}-new`,
    });

    expect(res.updated).toBeUndefined(); // a fresh insert, not a merge
    expect(res.status).toBe(201);
    expect(res.item.id).not.toBe(sold.id);
    expect(res.item.status).toBe("listed");
    expect(res.item.listedAt).not.toBeNull();
  });

  it("re-listing a name that matches a SHIPPED row inserts a new item", async () => {
    const name = `${tag} floral cami`;
    const shipped = await seed({ name, status: "shipped" });

    const res = await post({ name, status: "listed", listedPrice: "12.00" });

    expect(res.updated).toBeUndefined();
    expect(res.item.id).not.toBe(shipped.id);
    expect(res.item.status).toBe("listed");
  });

  it("a Vinted URL that already exists updates that same listing", async () => {
    const url = `https://www.vinted.co.uk/items/${tag}-dup`;
    const first = await post({ name: `${tag} A`, status: "listed", vintedUrl: url });

    const second = await post({
      name: `${tag} A`,
      status: "listed",
      vintedUrl: url,
      brand: "FilledInLater",
    });

    expect(second.updated).toBe(true);
    expect(second.item.id).toBe(first.item.id);
    expect(second.item.brand).toBe("FilledInLater");
  });

  it("an extension add links up a manual ACTIVE entry with the same name (no URL yet)", async () => {
    const name = `${tag} manual entry`;
    const manual = await seed({ name, status: "listed", vintedUrl: null });

    const url = `https://www.vinted.co.uk/items/${tag}-link`;
    const res = await post({ name, status: "listed", vintedUrl: url });

    expect(res.updated).toBe(true);
    expect(res.item.id).toBe(manual.id);
    expect(res.item.vintedUrl).toBe(url);
  });

  it("two different listings with the same name each get their own row", async () => {
    const name = `${tag} identical name`;
    const a = await post({ name, status: "listed", vintedUrl: `https://www.vinted.co.uk/items/${tag}-a` });
    const b = await post({ name, status: "listed", vintedUrl: `https://www.vinted.co.uk/items/${tag}-b` });

    expect(a.item.id).not.toBe(b.item.id);
    expect(b.updated).toBeUndefined();
  });

  it("no-URL dedup still merges into an active same-name item", async () => {
    const name = `${tag} no url dupe`;
    const active = await seed({ name, status: "listed" });

    const res = await post({ name, status: "listed", brand: "Late" });

    expect(res.updated).toBe(true);
    expect(res.item.id).toBe(active.id);
  });
});
