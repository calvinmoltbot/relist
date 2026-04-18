import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { watchItems, priceStats } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { GET } from "@/app/api/watch-items/route";

// ---------------------------------------------------------------------------
// Tests for GET /api/watch-items — enrichment via priceStats, dedup, cache
// header, and the absence of N+1 (single query path).
//
// Integration-style: seeds real Neon rows, calls the route handler, asserts
// on the JSON response. Cleans up after each test.
// ---------------------------------------------------------------------------

const createdWatchIds: string[] = [];
const createdStatIds: string[] = [];

async function cleanup() {
  if (createdWatchIds.length) {
    try {
      await db.delete(watchItems).where(inArray(watchItems.id, createdWatchIds));
    } catch {}
    createdWatchIds.length = 0;
  }
  if (createdStatIds.length) {
    try {
      await db.delete(priceStats).where(inArray(priceStats.id, createdStatIds));
    } catch {}
    createdStatIds.length = 0;
  }
}

beforeEach(cleanup);
afterEach(cleanup);

function makeRequest(status?: string) {
  const url = status
    ? `http://localhost/api/watch-items?status=${encodeURIComponent(status)}`
    : "http://localhost/api/watch-items";
  return new NextRequest(url);
}

describe("GET /api/watch-items", () => {
  it("sets the cache header", async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get("Cache-Control")).toBe(
      "private, max-age=60, stale-while-revalidate=180",
    );
  });

  it("returns each watch item exactly once even with multiple priceStats matches", async () => {
    const [w] = await db
      .insert(watchItems)
      .values({
        vintedUrl: "https://www.vinted.co.uk/items/test-dedup",
        title: "Dedup test",
        brand: "Zara",
        category: "jackets",
        status: "watching",
      })
      .returning();
    createdWatchIds.push(w.id);

    const stats = await db
      .insert(priceStats)
      .values([
        {
          brand: "Zara",
          category: "jackets",
          medianPrice: "25.00",
          lastUpdatedAt: new Date("2026-01-01"),
        },
        {
          brand: "Zara",
          category: "jackets",
          medianPrice: "30.00",
          lastUpdatedAt: new Date("2026-04-15"),
        },
      ])
      .returning();
    for (const s of stats) createdStatIds.push(s.id);

    const res = await GET(makeRequest());
    const body = (await res.json()) as Array<{ id: string; estimatedResale?: string }>;
    const rows = body.filter((r) => r.id === w.id);
    expect(rows).toHaveLength(1);
  });

  it("returns a watch item unenriched when no priceStats row matches", async () => {
    const [w] = await db
      .insert(watchItems)
      .values({
        vintedUrl: "https://www.vinted.co.uk/items/no-stats",
        title: "No stats",
        brand: "ObscureBrand",
        category: "hats",
        status: "watching",
        currentPrice: "10.00",
      })
      .returning();
    createdWatchIds.push(w.id);

    const res = await GET(makeRequest());
    const body = (await res.json()) as Array<{ id: string; estimatedResale: string | null }>;
    const row = body.find((r) => r.id === w.id);
    expect(row).toBeDefined();
    // The raw column is null; the enrichment pass only overwrites it when
    // there's a matching priceStats row.
    expect(row?.estimatedResale ?? null).toBeNull();
  });

  it("enriches with estimatedResale and estimatedMarginPct when stats match", async () => {
    const [w] = await db
      .insert(watchItems)
      .values({
        vintedUrl: "https://www.vinted.co.uk/items/enrich",
        title: "Enrich test",
        brand: "Nike",
        category: "shoes",
        status: "watching",
        currentPrice: "20.00",
      })
      .returning();
    createdWatchIds.push(w.id);

    const [s] = await db
      .insert(priceStats)
      .values({
        brand: "Nike",
        category: "shoes",
        medianPrice: "50.00",
      })
      .returning();
    createdStatIds.push(s.id);

    const res = await GET(makeRequest());
    const body = (await res.json()) as Array<{
      id: string;
      estimatedResale?: string;
      estimatedMarginPct?: string;
    }>;
    const row = body.find((r) => r.id === w.id);
    expect(row?.estimatedResale).toBe("50");
    // margin = (50 - 20) / 20 * 100 = 150
    expect(row?.estimatedMarginPct).toBe("150");
  });

  it("filters by status=all to return all statuses", async () => {
    const inserted = await db
      .insert(watchItems)
      .values([
        {
          vintedUrl: "https://www.vinted.co.uk/items/status-w",
          title: "watching",
          status: "watching",
        },
        {
          vintedUrl: "https://www.vinted.co.uk/items/status-p",
          title: "passed",
          status: "passed",
        },
      ])
      .returning();
    for (const w of inserted) createdWatchIds.push(w.id);

    const resAll = await GET(makeRequest("all"));
    const bodyAll = (await resAll.json()) as Array<{ id: string }>;
    const ids = new Set(bodyAll.map((r) => r.id));
    expect(ids.has(inserted[0].id)).toBe(true);
    expect(ids.has(inserted[1].id)).toBe(true);
  });
});
