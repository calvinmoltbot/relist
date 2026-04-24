import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { eq, or } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/health/portfolio-mix?dimension=category|brand|size|source
//
// Where the unsold stock lives. Groups currently-listed (and still-sourced)
// items by the requested dimension and reports count, £ tied up, median
// days listed, and % concentration. Highlights groups >20% of dead stock.
// ---------------------------------------------------------------------------

type Dimension = "category" | "brand" | "size" | "source";

const DIMENSIONS: Dimension[] = ["category", "brand", "size", "source"];

interface GroupRow {
  key: string;
  count: number;
  valueTiedUp: number;
  medianDaysListed: number;
  pctOfCount: number;
  pctOfValue: number;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function getKey(
  row: {
    category: string | null;
    brand: string | null;
    size: string | null;
    sourceType: string | null;
  },
  dim: Dimension,
): string {
  const raw =
    dim === "category"
      ? row.category
      : dim === "brand"
        ? row.brand
        : dim === "size"
          ? row.size
          : row.sourceType;
  return raw && raw.trim() ? raw : "—";
}

export async function GET(request: NextRequest) {
  const dimParam = (request.nextUrl.searchParams.get("dimension") ??
    "category") as Dimension;
  const dimension = DIMENSIONS.includes(dimParam) ? dimParam : "category";

  const rows = await db
    .select({
      id: items.id,
      category: items.category,
      brand: items.brand,
      size: items.size,
      sourceType: items.sourceType,
      listedPrice: items.listedPrice,
      costPrice: items.costPrice,
      listedAt: items.listedAt,
      createdAt: items.createdAt,
    })
    .from(items)
    .where(or(eq(items.status, "listed"), eq(items.status, "sourced")));

  const now = Date.now();
  const enriched = rows.map((r) => {
    const ref = r.listedAt ?? r.createdAt ?? new Date();
    const days = Math.max(
      0,
      Math.floor((now - ref.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const value = r.listedPrice
      ? parseFloat(r.listedPrice)
      : r.costPrice
        ? parseFloat(r.costPrice)
        : 0;
    return { ...r, daysListed: days, value };
  });

  const totalCount = enriched.length;
  const totalValue = enriched.reduce((s, r) => s + r.value, 0);

  const groupResult = (dim: Dimension): GroupRow[] => {
    const groups = new Map<string, typeof enriched>();
    for (const r of enriched) {
      const k = getKey(r, dim);
      const bucket = groups.get(k) ?? [];
      bucket.push(r);
      groups.set(k, bucket);
    }
    const out: GroupRow[] = [];
    for (const [key, bucket] of groups) {
      const count = bucket.length;
      const valueTiedUp = bucket.reduce((s, b) => s + b.value, 0);
      out.push({
        key,
        count,
        valueTiedUp: Math.round(valueTiedUp * 100) / 100,
        medianDaysListed: median(bucket.map((b) => b.daysListed)),
        pctOfCount: totalCount ? (count / totalCount) * 100 : 0,
        pctOfValue: totalValue ? (valueTiedUp / totalValue) * 100 : 0,
      });
    }
    return out.sort((a, b) => b.count - a.count);
  };

  const groups = groupResult(dimension);

  // Insights — top concentration and longest-listed group.
  const insights: string[] = [];
  const top = groups[0];
  if (top && top.pctOfCount >= 20) {
    insights.push(
      `${Math.round(top.pctOfCount)}% of your unsold stock is in ${prettyKey(top.key)}.`,
    );
  }
  const eligibleLongest = groups.filter((g) => g.count >= 2);
  if (eligibleLongest.length) {
    const longest = [...eligibleLongest].sort(
      (a, b) => b.medianDaysListed - a.medianDaysListed,
    )[0];
    if (longest && longest.medianDaysListed >= 14) {
      insights.push(
        `${prettyKey(longest.key)} ${dimLabel(dimension)} have been listed longest on average (${longest.medianDaysListed}d).`,
      );
    }
  }
  if (totalValue > 0) {
    const topValue = [...groups].sort((a, b) => b.valueTiedUp - a.valueTiedUp)[0];
    if (topValue && topValue.pctOfValue >= 25) {
      insights.push(
        `£${topValue.valueTiedUp.toFixed(0)} (${Math.round(topValue.pctOfValue)}%) of your listed value sits in ${prettyKey(topValue.key)}.`,
      );
    }
  }

  return NextResponse.json(
    {
      dimension,
      totalCount,
      totalValue: Math.round(totalValue * 100) / 100,
      groups,
      insights,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
      },
    },
  );
}

function prettyKey(k: string): string {
  if (k === "—") return "unspecified";
  // source_type values are snake_case (charity_shop etc.)
  if (k.includes("_"))
    return k
      .split("_")
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(" ");
  return k;
}

function dimLabel(d: Dimension): string {
  return d === "source" ? "sources" : `${d === "size" ? "sizes" : d + "s"}`;
}
