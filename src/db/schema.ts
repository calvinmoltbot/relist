import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Items (inventory)
// ---------------------------------------------------------------------------
export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category"),
    condition: text("condition"), // new | like_new | good | fair
    size: text("size"),
    costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
    listedPrice: numeric("listed_price", { precision: 10, scale: 2 }),
    soldPrice: numeric("sold_price", { precision: 10, scale: 2 }),
    status: text("status").notNull().default("sourced"), // sourced | listed | sold | shipped
    platform: text("platform").default("vinted"),
    photoUrls: text("photo_urls").array(),
    description: text("description"),
    sourceType: text("source_type"), // charity_shop | car_boot | online | other
    sourceLocation: text("source_location"),
    vintedUrl: text("vinted_url"),
    listedAt: timestamp("listed_at"),
    soldAt: timestamp("sold_at"),
    buyerPaidShipping: boolean("buyer_paid_shipping").default(true),
    shippedAt: timestamp("shipped_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("items_status_idx").on(table.status),
    index("items_brand_idx").on(table.brand),
    index("items_category_idx").on(table.category),
    index("items_created_at_idx").on(table.createdAt),
    index("items_listed_at_idx").on(table.listedAt),
    index("items_sold_at_idx").on(table.soldAt),
    index("items_vinted_url_idx").on(table.vintedUrl),
  ],
);

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .references(() => items.id)
    .notNull(),
  transactionType: text("transaction_type").notNull(), // buy | sell
  grossPrice: numeric("gross_price", { precision: 10, scale: 2 }),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).default(
    "0",
  ),
  platformFees: numeric("platform_fees", { precision: 10, scale: 2 }).default(
    "0",
  ),
  profit: numeric("profit", { precision: 10, scale: 2 }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("transactions_item_id_idx").on(table.itemId),
]);

// ---------------------------------------------------------------------------
// Price Data (market snapshots from Vinted monitoring)
// ---------------------------------------------------------------------------
export const priceData = pgTable(
  "price_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vintedId: text("vinted_id").notNull(),
    title: text("title"),
    brand: text("brand"),
    category: text("category"),
    size: text("size"),
    condition: text("condition"),
    price: numeric("price", { precision: 10, scale: 2 }),
    currency: text("currency").default("GBP"),
    status: text("status").default("active"), // active | disappeared
    url: text("url"),
    photoUrl: text("photo_url"),
    firstSeenAt: timestamp("first_seen_at").defaultNow(),
    lastSeenAt: timestamp("last_seen_at").defaultNow(),
    seenCount: integer("seen_count").default(1),
  },
  (table) => [
    index("price_data_vinted_id_idx").on(table.vintedId),
    index("price_data_brand_category_idx").on(table.brand, table.category),
  ],
);

// ---------------------------------------------------------------------------
// Price Stats (aggregated market data)
// ---------------------------------------------------------------------------
export const priceStats = pgTable(
  "price_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brand: text("brand").notNull(),
    category: text("category").notNull(),
    condition: text("condition"),
    size: text("size"),
    medianPrice: numeric("median_price", { precision: 10, scale: 2 }),
    p25Price: numeric("p25_price", { precision: 10, scale: 2 }),
    p75Price: numeric("p75_price", { precision: 10, scale: 2 }),
    sampleCount: integer("sample_count"),
    lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  },
  (table) => [
    index("price_stats_brand_category_idx").on(table.brand, table.category),
  ],
);

// ---------------------------------------------------------------------------
// Watch Items (flip tracker — items Lily is considering buying to resell)
// ---------------------------------------------------------------------------
export const watchItems = pgTable(
  "watch_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vintedUrl: text("vinted_url").notNull(),
    vintedId: text("vinted_id"),
    title: text("title").notNull(),
    brand: text("brand"),
    category: text("category"),
    size: text("size"),
    condition: text("condition"),
    currentPrice: numeric("current_price", { precision: 10, scale: 2 }),
    targetBuyPrice: numeric("target_buy_price", { precision: 10, scale: 2 }),
    estimatedResale: numeric("estimated_resale", { precision: 10, scale: 2 }),
    estimatedMarginPct: numeric("estimated_margin_pct", { precision: 5, scale: 2 }),
    photoUrl: text("photo_url"),
    status: text("status").notNull().default("watching"), // watching | bought | passed | sold_out
    convertedItemId: uuid("converted_item_id").references(() => items.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("watch_items_vinted_url_idx").on(table.vintedUrl),
    index("watch_items_status_idx").on(table.status),
    index("watch_items_brand_category_idx").on(table.brand, table.category),
  ],
);

// ---------------------------------------------------------------------------
// Deal Alerts (user-configured search filters)
// ---------------------------------------------------------------------------
export const dealAlerts = pgTable("deal_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  brands: text("brands").array(),
  categories: text("categories").array(),
  maxPrice: numeric("max_price", { precision: 10, scale: 2 }),
  minMarginPct: numeric("min_margin_pct", { precision: 5, scale: 2 }),
  sizes: text("sizes").array(),
  enabled: boolean("enabled").default(true),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// Expenses (business-wide costs: packaging, promotions, supplies)
// ---------------------------------------------------------------------------
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: text("category").notNull(), // shipping_supplies | packaging | promotion | platform_fee | other
    description: text("description"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    itemId: uuid("item_id").references(() => items.id),
    incurredAt: timestamp("incurred_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("expenses_incurred_at_idx").on(table.incurredAt),
    index("expenses_category_idx").on(table.category),
  ],
);

// ---------------------------------------------------------------------------
// User Settings (configurable targets, key-value pairs)
// ---------------------------------------------------------------------------
export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------
export type Item = InferSelectModel<typeof items>;
export type NewItem = InferInsertModel<typeof items>;

export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;

export type PriceData = InferSelectModel<typeof priceData>;
export type NewPriceData = InferInsertModel<typeof priceData>;

export type PriceStat = InferSelectModel<typeof priceStats>;
export type NewPriceStat = InferInsertModel<typeof priceStats>;

export type WatchItem = InferSelectModel<typeof watchItems>;
export type NewWatchItem = InferInsertModel<typeof watchItems>;

export type DealAlert = InferSelectModel<typeof dealAlerts>;
export type NewDealAlert = InferInsertModel<typeof dealAlerts>;

export type Expense = InferSelectModel<typeof expenses>;
export type NewExpense = InferInsertModel<typeof expenses>;

export type UserSetting = InferSelectModel<typeof userSettings>;
export type NewUserSetting = InferInsertModel<typeof userSettings>;
