import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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

  const filename = `relist-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
