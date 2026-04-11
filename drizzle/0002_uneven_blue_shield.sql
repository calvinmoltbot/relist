CREATE TABLE "watch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vinted_url" text NOT NULL,
	"vinted_id" text,
	"title" text NOT NULL,
	"brand" text,
	"category" text,
	"size" text,
	"condition" text,
	"current_price" numeric(10, 2),
	"target_buy_price" numeric(10, 2),
	"estimated_resale" numeric(10, 2),
	"estimated_margin_pct" numeric(5, 2),
	"photo_url" text,
	"status" text DEFAULT 'watching' NOT NULL,
	"converted_item_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "watch_items" ADD CONSTRAINT "watch_items_converted_item_id_items_id_fk" FOREIGN KEY ("converted_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "watch_items_vinted_url_idx" ON "watch_items" USING btree ("vinted_url");--> statement-breakpoint
CREATE INDEX "watch_items_status_idx" ON "watch_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "watch_items_brand_category_idx" ON "watch_items" USING btree ("brand","category");--> statement-breakpoint
CREATE INDEX "items_created_at_idx" ON "items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "items_listed_at_idx" ON "items" USING btree ("listed_at");--> statement-breakpoint
CREATE INDEX "items_sold_at_idx" ON "items" USING btree ("sold_at");--> statement-breakpoint
CREATE INDEX "items_vinted_url_idx" ON "items" USING btree ("vinted_url");--> statement-breakpoint
CREATE INDEX "transactions_item_id_idx" ON "transactions" USING btree ("item_id");