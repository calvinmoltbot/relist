CREATE TABLE "deal_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brands" text[],
	"categories" text[],
	"max_price" numeric(10, 2),
	"min_margin_pct" numeric(5, 2),
	"sizes" text[],
	"enabled" boolean DEFAULT true,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"category" text,
	"condition" text,
	"size" text,
	"cost_price" numeric(10, 2),
	"listed_price" numeric(10, 2),
	"sold_price" numeric(10, 2),
	"status" text DEFAULT 'sourced' NOT NULL,
	"platform" text DEFAULT 'vinted',
	"photo_urls" text[],
	"description" text,
	"source_type" text,
	"source_location" text,
	"listed_at" timestamp,
	"sold_at" timestamp,
	"shipped_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "price_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vinted_id" text NOT NULL,
	"title" text,
	"brand" text,
	"category" text,
	"size" text,
	"condition" text,
	"price" numeric(10, 2),
	"currency" text DEFAULT 'GBP',
	"status" text DEFAULT 'active',
	"url" text,
	"photo_url" text,
	"first_seen_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now(),
	"seen_count" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "price_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" text NOT NULL,
	"category" text NOT NULL,
	"condition" text,
	"size" text,
	"median_price" numeric(10, 2),
	"p25_price" numeric(10, 2),
	"p75_price" numeric(10, 2),
	"sample_count" integer,
	"last_updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"transaction_type" text NOT NULL,
	"gross_price" numeric(10, 2),
	"shipping_cost" numeric(10, 2) DEFAULT '0',
	"platform_fees" numeric(10, 2) DEFAULT '0',
	"profit" numeric(10, 2),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_status_idx" ON "items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "items_brand_idx" ON "items" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "price_data_vinted_id_idx" ON "price_data" USING btree ("vinted_id");--> statement-breakpoint
CREATE INDEX "price_data_brand_category_idx" ON "price_data" USING btree ("brand","category");--> statement-breakpoint
CREATE INDEX "price_stats_brand_category_idx" ON "price_stats" USING btree ("brand","category");