import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { and, gte, isNotNull } from "drizzle-orm";
import { computeCadence } from "@/lib/inventory/cadence";
import { getTargets } from "@/lib/settings";

// ---------------------------------------------------------------------------
// GET /api/health/cadence
//
// Weekly listing cadence vs weekly_listings_target. Returns the last 4
// Monday-start buckets plus pace and target.
// ---------------------------------------------------------------------------
export async function GET() {
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 35); // a bit of slack for bucketing

  const rows = await db
    .select({ listedAt: items.listedAt })
    .from(items)
    .where(and(isNotNull(items.listedAt), gte(items.listedAt, fourWeeksAgo)));

  const targets = await getTargets();
  const result = computeCadence(
    rows
      .map((r) => r.listedAt)
      .filter((d): d is Date => d !== null),
    targets.weeklyListingsTarget,
    now,
  );

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
}
