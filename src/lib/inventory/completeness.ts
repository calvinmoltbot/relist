import type { Item } from "@/db/schema";

// ---------------------------------------------------------------------------
// Listing Completeness Score (0-100)
//
// Vinted's algorithm penalises incomplete listings. This scorer reflects the
// public guidance: every empty field is a negative signal. Weights add to 100.
// Tune against Lily's real listings as the data stabilises.
// ---------------------------------------------------------------------------

// Weights sum to 100. `condition` is intentionally omitted — Lily's UX
// avoids mentioning condition (see memory). `vintedUrl` takes its slot:
// a missing URL means we can't link through to the live listing.
export const WEIGHTS = {
  brand: 20,
  category: 15,
  size: 10,
  description: 20, // ≥40 chars
  photos: 20, // ≥3
  title: 10, // >3 words
  vintedUrl: 5, // live Vinted link for listed/sold items
} as const;

export type CompletenessField = keyof typeof WEIGHTS;

export interface FieldStatus {
  field: CompletenessField;
  label: string;
  weight: number;
  present: boolean;
  hint: string;
}

export interface CompletenessResult {
  score: number;
  band: "green" | "amber" | "red";
  fields: FieldStatus[];
  /** Missing fields sorted by weight desc — biggest-impact first. */
  missing: FieldStatus[];
}

type ItemLike = Pick<
  Item,
  "name" | "brand" | "category" | "size" | "description" | "photoUrls" | "vintedUrl"
>;

const FIELD_META: Record<CompletenessField, { label: string; hint: string }> = {
  brand: { label: "Brand", hint: "Add the brand — buyers search for it" },
  category: { label: "Category", hint: "Pick a category so it shows up in the right browse" },
  size: { label: "Size", hint: "Size matters for every clothing search" },
  description: { label: "Description (40+ chars)", hint: "Aim for a couple of sentences — fit, feel, styling ideas" },
  photos: { label: "3+ photos", hint: "More angles = more clicks" },
  title: { label: "Title (4+ words)", hint: "Stuff the title with keywords buyers actually search" },
  vintedUrl: { label: "Vinted link", hint: "Paste the Vinted URL so you can jump back to the live listing" },
};

function hasText(v: string | null | undefined, minLen = 1): boolean {
  return typeof v === "string" && v.trim().length >= minLen;
}

function wordCount(v: string | null | undefined): number {
  if (!hasText(v)) return 0;
  return (v as string).trim().split(/\s+/).length;
}

export function scoreItem(item: ItemLike): CompletenessResult {
  const checks: Array<[CompletenessField, boolean]> = [
    ["brand", hasText(item.brand)],
    ["category", hasText(item.category)],
    ["size", hasText(item.size)],
    ["description", hasText(item.description, 40)],
    ["photos", Array.isArray(item.photoUrls) && item.photoUrls.length >= 3],
    ["title", wordCount(item.name) >= 4],
    ["vintedUrl", hasText(item.vintedUrl)],
  ];

  const fields: FieldStatus[] = checks.map(([field, present]) => ({
    field,
    label: FIELD_META[field].label,
    weight: WEIGHTS[field],
    present,
    hint: FIELD_META[field].hint,
  }));

  const score = fields.reduce((sum, f) => sum + (f.present ? f.weight : 0), 0);
  const band: "green" | "amber" | "red" =
    score >= 80 ? "green" : score >= 50 ? "amber" : "red";
  const missing = fields
    .filter((f) => !f.present)
    .sort((a, b) => b.weight - a.weight);

  return { score, band, fields, missing };
}

/**
 * Summary across a list of items — site-wide completeness health.
 */
export interface CompletenessSummary {
  count: number;
  averageScore: number;
  /** % of items scoring ≥80 (green). */
  healthyPct: number;
  /** Bucket counts. */
  bands: { green: number; amber: number; red: number };
  /**
   * Items whose score would jump most from fixing their single biggest gap.
   * Returns the worst `limit` listings sorted by highest-weight missing field.
   */
  biggestImpact: Array<{
    itemId: string;
    score: number;
    missingField: CompletenessField;
    missingLabel: string;
    missingWeight: number;
  }>;
}

export function summarise(
  items: Array<ItemLike & { id: string }>,
  limit = 5,
): CompletenessSummary {
  if (items.length === 0) {
    return {
      count: 0,
      averageScore: 0,
      healthyPct: 0,
      bands: { green: 0, amber: 0, red: 0 },
      biggestImpact: [],
    };
  }

  const bands = { green: 0, amber: 0, red: 0 };
  let totalScore = 0;
  const rows: Array<{
    itemId: string;
    score: number;
    biggestGap: FieldStatus | null;
  }> = [];

  for (const item of items) {
    const r = scoreItem(item);
    totalScore += r.score;
    bands[r.band]++;
    rows.push({
      itemId: item.id,
      score: r.score,
      biggestGap: r.missing[0] ?? null,
    });
  }

  const biggestImpact = rows
    .filter((r) => r.biggestGap != null)
    .sort((a, b) => (b.biggestGap!.weight) - (a.biggestGap!.weight) || a.score - b.score)
    .slice(0, limit)
    .map((r) => ({
      itemId: r.itemId,
      score: r.score,
      missingField: r.biggestGap!.field,
      missingLabel: r.biggestGap!.label,
      missingWeight: r.biggestGap!.weight,
    }));

  return {
    count: items.length,
    averageScore: Math.round(totalScore / items.length),
    healthyPct: Math.round((bands.green / items.length) * 100),
    bands,
    biggestImpact,
  };
}
