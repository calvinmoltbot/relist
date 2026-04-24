// ---------------------------------------------------------------------------
// Price competitiveness — compare an item's listed price to the market
// band we've aggregated in `price_stats` (brand × category × size/condition).
//
// Vinted's algorithm penalises listings that are visibly overpriced and
// Lily's interest is avoiding underpricing her inventory. Bands:
//   - "high"  : listedPrice > p75 × 1.20    (at risk of being skipped)
//   - "range" : p25 ≤ listedPrice ≤ p75 × 1.20
//   - "low"   : listedPrice < p25 × 0.80    (possibly underpriced)
//   - "none"  : no matching stats row with ≥3 samples
// ---------------------------------------------------------------------------

export const MIN_SAMPLE = 3;
export const HIGH_THRESHOLD = 1.2;
export const LOW_THRESHOLD = 0.8;

export type PriceBand = "high" | "range" | "low" | "none";

export interface PriceStatRow {
  brand: string;
  category: string;
  size: string | null;
  medianPrice: string | null;
  p25Price: string | null;
  p75Price: string | null;
  sampleCount: number | null;
}

export interface PriceCheckInput {
  listedPrice: number | null;
  brand: string | null;
  category: string | null;
  size: string | null;
}

export interface PriceCheckResult {
  band: PriceBand;
  /** Median of the matched stats row, rounded to 2dp. */
  median: number | null;
  p25: number | null;
  p75: number | null;
  /** Distance from the nearest edge of the in-range band (p75 × 1.20 for high). */
  gap: number | null;
  matchedOn: "brand+category+size" | "brand+category" | null;
  sampleCount: number | null;
}

function keyOf(brand: string | null, category: string | null, size: string | null): string {
  return `${(brand ?? "").toLowerCase()}|${(category ?? "").toLowerCase()}|${(size ?? "").toLowerCase()}`;
}

/**
 * Build two lookup maps from the stats rows: one keyed by brand+category+size,
 * one by brand+category (best-of by sample count).
 */
export function indexStats(rows: PriceStatRow[]) {
  const bySized = new Map<string, PriceStatRow>();
  const byBrandCat = new Map<string, PriceStatRow>();

  for (const row of rows) {
    if ((row.sampleCount ?? 0) < MIN_SAMPLE) continue;

    if (row.size) {
      const k = keyOf(row.brand, row.category, row.size);
      const existing = bySized.get(k);
      if (!existing || (row.sampleCount ?? 0) > (existing.sampleCount ?? 0)) {
        bySized.set(k, row);
      }
    }

    const bk = keyOf(row.brand, row.category, null);
    const existing = byBrandCat.get(bk);
    if (!existing || (row.sampleCount ?? 0) > (existing.sampleCount ?? 0)) {
      byBrandCat.set(bk, row);
    }
  }

  return { bySized, byBrandCat };
}

export function checkPrice(
  input: PriceCheckInput,
  index: ReturnType<typeof indexStats>,
): PriceCheckResult {
  const { listedPrice, brand, category, size } = input;

  if (!listedPrice || !brand || !category) {
    return {
      band: "none",
      median: null,
      p25: null,
      p75: null,
      gap: null,
      matchedOn: null,
      sampleCount: null,
    };
  }

  let row: PriceStatRow | undefined;
  let matchedOn: PriceCheckResult["matchedOn"] = null;

  if (size) {
    row = index.bySized.get(keyOf(brand, category, size));
    if (row) matchedOn = "brand+category+size";
  }
  if (!row) {
    row = index.byBrandCat.get(keyOf(brand, category, null));
    if (row) matchedOn = "brand+category";
  }

  if (!row) {
    return {
      band: "none",
      median: null,
      p25: null,
      p75: null,
      gap: null,
      matchedOn: null,
      sampleCount: null,
    };
  }

  const median = row.medianPrice != null ? parseFloat(row.medianPrice) : null;
  const p25 = row.p25Price != null ? parseFloat(row.p25Price) : null;
  const p75 = row.p75Price != null ? parseFloat(row.p75Price) : null;

  if (p25 == null || p75 == null) {
    return {
      band: "none",
      median,
      p25,
      p75,
      gap: null,
      matchedOn,
      sampleCount: row.sampleCount,
    };
  }

  const highCut = p75 * HIGH_THRESHOLD;
  const lowCut = p25 * LOW_THRESHOLD;
  let band: PriceBand = "range";
  let gap: number | null = 0;

  if (listedPrice > highCut) {
    band = "high";
    gap = listedPrice - highCut;
  } else if (listedPrice < lowCut) {
    band = "low";
    gap = lowCut - listedPrice;
  } else {
    gap = 0;
  }

  return {
    band,
    median: median != null ? Math.round(median * 100) / 100 : null,
    p25: Math.round(p25 * 100) / 100,
    p75: Math.round(p75 * 100) / 100,
    gap: gap != null ? Math.round(gap * 100) / 100 : null,
    matchedOn,
    sampleCount: row.sampleCount,
  };
}
