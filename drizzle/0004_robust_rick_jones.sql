ALTER TABLE "items" ADD COLUMN "last_edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "relist_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "items_last_edited_at_idx" ON "items" USING btree ("last_edited_at");