import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { skuCounters } from "@/db/schema";

type CounterRow = { next_value: number };

export type SkuPrefix = "C" | "J" | "S" | "H" | "B" | "A" | "O";

const RULES: Array<{ re: RegExp; prefix: SkuPrefix }> = [
  { re: /jewel/, prefix: "J" },
  { re: /shoe|boot|trainer|sneaker|heel|sandal/, prefix: "S" },
  { re: /handbag|purse|clutch|tote|backpack|bag/, prefix: "H" },
  { re: /book/, prefix: "B" },
  { re: /accessor|scarf|belt|hat|glove|sunglass/, prefix: "A" },
  {
    re: /cloth|dress|top|skirt|jean|trouser|jacket|coat|shirt|jumper|cardigan|hoodie|sweater|blouse|knitwear/,
    prefix: "C",
  },
];

export function prefixForCategory(category: string | null | undefined): SkuPrefix {
  if (!category) return "O";
  const c = category.toLowerCase();
  for (const { re, prefix } of RULES) {
    if (re.test(c)) return prefix;
  }
  // Non-empty but unrecognised → assume clothing (Lily's main inventory).
  return "C";
}

/**
 * Atomically reserve the next SKU number for a prefix and return the formatted SKU.
 * Uses an upsert so concurrent inserts can't collide.
 */
export async function generateSku(category: string | null | undefined): Promise<string> {
  const prefix = prefixForCategory(category);
  const [row] = await db
    .insert(skuCounters)
    .values({ prefix, nextValue: 2 })
    .onConflictDoUpdate({
      target: skuCounters.prefix,
      set: { nextValue: sql`${skuCounters.nextValue} + 1` },
    })
    .returning({ next_value: skuCounters.nextValue });
  const n = (row as CounterRow).next_value - 1;
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

// Re-seed the counters table from the current items.sku values. Used after a
// backup restore — incoming rows carry their original SKUs, so the counter
// must jump past whatever's now in the table.
export async function resyncSkuCounters(): Promise<void> {
  await db.execute(sql`DELETE FROM sku_counters`);
  await db.execute(sql`
    INSERT INTO sku_counters (prefix, next_value)
    SELECT split_part(sku, '-', 1) AS prefix,
      max(split_part(sku, '-', 2)::integer) + 1 AS next_value
    FROM items WHERE sku IS NOT NULL AND sku ~ '^[A-Z]-[0-9]+$'
    GROUP BY split_part(sku, '-', 1)
  `);
}
