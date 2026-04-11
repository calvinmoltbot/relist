CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"item_id" uuid,
	"incurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "vinted_url" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "buyer_paid_shipping" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_incurred_at_idx" ON "expenses" USING btree ("incurred_at");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");