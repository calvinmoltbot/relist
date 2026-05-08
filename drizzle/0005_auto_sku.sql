CREATE TABLE "sku_counters" (
	"prefix" text PRIMARY KEY NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "sku" text;--> statement-breakpoint
WITH prefixed AS (
	SELECT id, created_at,
		CASE
			WHEN lower(coalesce(category, '')) ~ '(jewel)' THEN 'J'
			WHEN lower(coalesce(category, '')) ~ '(shoe|boot|trainer|sneaker|heel|sandal)' THEN 'S'
			WHEN lower(coalesce(category, '')) ~ '(handbag|purse|clutch|tote|backpack|bag)' THEN 'H'
			WHEN lower(coalesce(category, '')) ~ '(book)' THEN 'B'
			WHEN lower(coalesce(category, '')) ~ '(accessor|scarf|belt|hat|glove|sunglass)' THEN 'A'
			WHEN lower(coalesce(category, '')) ~ '(cloth|dress|top|skirt|jean|trouser|jacket|coat|shirt|jumper|cardigan|hoodie|sweater|blouse|knitwear)' THEN 'C'
			WHEN category IS NOT NULL AND category <> '' THEN 'C'
			ELSE 'O'
		END AS prefix
	FROM items
),
numbered AS (
	SELECT id, prefix,
		row_number() OVER (PARTITION BY prefix ORDER BY created_at, id) AS n
	FROM prefixed
)
UPDATE items SET sku = numbered.prefix || '-' || lpad(numbered.n::text, 3, '0')
FROM numbered WHERE items.id = numbered.id;
--> statement-breakpoint
INSERT INTO sku_counters (prefix, next_value)
SELECT split_part(sku, '-', 1) AS prefix,
	max(split_part(sku, '-', 2)::integer) + 1 AS next_value
FROM items WHERE sku IS NOT NULL
GROUP BY split_part(sku, '-', 1);
--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "sku" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "items_sku_idx" ON "items" USING btree ("sku");
