import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  items,
  transactions,
  expenses,
  watchItems,
  dealAlerts,
  userSettings,
  priceData,
  priceStats,
} from "@/db/schema";

// ---------------------------------------------------------------------------
// GET /api/backup — Full export of Lily's data as a single JSON file.
// Intended as a safety net: download now, restore manually if something goes
// very wrong later.
// ---------------------------------------------------------------------------
export async function GET() {
  const [
    allItems,
    allTransactions,
    allExpenses,
    allWatchItems,
    allDealAlerts,
    allSettings,
    allPriceData,
    allPriceStats,
  ] = await Promise.all([
    db.select().from(items),
    db.select().from(transactions),
    db.select().from(expenses),
    db.select().from(watchItems),
    db.select().from(dealAlerts),
    db.select().from(userSettings),
    db.select().from(priceData),
    db.select().from(priceStats),
  ]);

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: {
      items: allItems.length,
      transactions: allTransactions.length,
      expenses: allExpenses.length,
      watchItems: allWatchItems.length,
      dealAlerts: allDealAlerts.length,
      settings: allSettings.length,
      priceData: allPriceData.length,
      priceStats: allPriceStats.length,
    },
    data: {
      items: allItems,
      transactions: allTransactions,
      expenses: allExpenses,
      watchItems: allWatchItems,
      dealAlerts: allDealAlerts,
      userSettings: allSettings,
      priceData: allPriceData,
      priceStats: allPriceStats,
    },
  };

  // Record the download time so the Dashboard can nudge when it gets stale.
  const now = new Date().toISOString();
  await db
    .insert(userSettings)
    .values({ key: "last_backup_at", value: now })
    .onConflictDoUpdate({
      target: userSettings.key,
      set: { value: now, updatedAt: sql`now()` },
    });

  const filename = `relist-backup-${now.slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
