import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Smoke tests for Cache-Control headers on read endpoints.
// Pinning these in a test because the perceived-lag reduction from caching
// is easy to lose in a future refactor.
// ---------------------------------------------------------------------------

const TTL = {
  short: "private, max-age=60, stale-while-revalidate=180",
  inventoryDash: "private, max-age=120, stale-while-revalidate=300",
  profit: "private, max-age=300, stale-while-revalidate=600",
};

async function getHeader(modPath: string, url: string) {
  const { GET } = (await import(modPath)) as {
    GET: (req: NextRequest) => Promise<Response>;
  };
  const res = await GET(new NextRequest(url));
  return res.headers.get("Cache-Control");
}

describe("Cache-Control headers", () => {
  it("GET /api/inventory — 120s / 300s swr (pre-existing, pin in place)", async () => {
    expect(
      await getHeader("@/app/api/inventory/route", "http://localhost/api/inventory"),
    ).toBe(TTL.inventoryDash);
  });

  it("GET /api/dashboard — 120s / 300s swr (pre-existing, pin in place)", async () => {
    expect(
      await getHeader("@/app/api/dashboard/route", "http://localhost/api/dashboard"),
    ).toBe(TTL.inventoryDash);
  });

  it("GET /api/watch-items — 60s / 180s swr", async () => {
    expect(
      await getHeader(
        "@/app/api/watch-items/route",
        "http://localhost/api/watch-items",
      ),
    ).toBe(TTL.short);
  });

  it("GET /api/expenses — 60s / 180s swr", async () => {
    expect(
      await getHeader("@/app/api/expenses/route", "http://localhost/api/expenses"),
    ).toBe(TTL.short);
  });

  it("GET /api/profit — 300s / 600s swr", async () => {
    expect(
      await getHeader("@/app/api/profit/route", "http://localhost/api/profit"),
    ).toBe(TTL.profit);
  });
});
