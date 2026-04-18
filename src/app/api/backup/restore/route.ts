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
// POST /api/backup/restore — Replace ALL data with the uploaded backup file.
//
// The neon-http driver doesn't support transactions, so this runs sequentially.
// The client is expected to download a fresh /api/backup immediately before
// calling this, so if something fails mid-way Lily still has a recovery file.
// ---------------------------------------------------------------------------

const SUPPORTED_VERSIONS = [1];

// Until auth lands (#16), only allow destructive restores when the server is
// running outside Vercel's production environment. The read-only GET is open.
function isRestoreAllowed() {
  return process.env.VERCEL_ENV !== "production";
}

const TABLE_KEYS = [
  "items",
  "transactions",
  "expenses",
  "watchItems",
  "dealAlerts",
  "userSettings",
  "priceData",
  "priceStats",
] as const;

type TableKey = (typeof TABLE_KEYS)[number];
type BackupData = Partial<Record<TableKey, unknown[]>>;

interface BackupFile {
  version: number;
  exportedAt?: string;
  counts?: Partial<Record<TableKey, number>>;
  data: BackupData;
}

function isBackupFile(x: unknown): x is BackupFile {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  if (typeof obj.version !== "number") return false;
  if (!obj.data || typeof obj.data !== "object") return false;
  return true;
}

export async function POST(request: Request) {
  if (!isRestoreAllowed()) {
    return NextResponse.json(
      { error: "Restore is disabled in production until auth is in place." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isBackupFile(body)) {
    return NextResponse.json(
      { error: "File is not a ReList backup (missing version or data)" },
      { status: 400 },
    );
  }

  if (!SUPPORTED_VERSIONS.includes(body.version)) {
    return NextResponse.json(
      {
        error: `Unsupported backup version ${body.version}. This app reads versions: ${SUPPORTED_VERSIONS.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const data = body.data;
  for (const key of TABLE_KEYS) {
    const rows = data[key];
    if (rows !== undefined && !Array.isArray(rows)) {
      return NextResponse.json(
        { error: `data.${key} must be an array if present` },
        { status: 400 },
      );
    }
  }

  // Wipe in FK-safe order: children before parents.
  // items is referenced by transactions, expenses, watchItems — delete those first.
  await db.delete(transactions);
  await db.delete(expenses);
  await db.delete(watchItems);
  await db.delete(dealAlerts);
  await db.delete(priceData);
  await db.delete(priceStats);
  await db.delete(userSettings);
  await db.delete(items);

  // Insert parents before children.
  const counts: Record<TableKey, number> = {
    items: 0,
    transactions: 0,
    expenses: 0,
    watchItems: 0,
    dealAlerts: 0,
    userSettings: 0,
    priceData: 0,
    priceStats: 0,
  };

  const itemRows = (data.items ?? []) as (typeof items.$inferInsert)[];
  if (itemRows.length) {
    await db.insert(items).values(itemRows);
    counts.items = itemRows.length;
  }

  const txRows = (data.transactions ?? []) as (typeof transactions.$inferInsert)[];
  if (txRows.length) {
    await db.insert(transactions).values(txRows);
    counts.transactions = txRows.length;
  }

  const expenseRows = (data.expenses ?? []) as (typeof expenses.$inferInsert)[];
  if (expenseRows.length) {
    await db.insert(expenses).values(expenseRows);
    counts.expenses = expenseRows.length;
  }

  const watchRows = (data.watchItems ?? []) as (typeof watchItems.$inferInsert)[];
  if (watchRows.length) {
    await db.insert(watchItems).values(watchRows);
    counts.watchItems = watchRows.length;
  }

  const alertRows = (data.dealAlerts ?? []) as (typeof dealAlerts.$inferInsert)[];
  if (alertRows.length) {
    await db.insert(dealAlerts).values(alertRows);
    counts.dealAlerts = alertRows.length;
  }

  const settingRows = (data.userSettings ?? []) as (typeof userSettings.$inferInsert)[];
  if (settingRows.length) {
    await db.insert(userSettings).values(settingRows);
    counts.userSettings = settingRows.length;
  }

  const priceDataRows = (data.priceData ?? []) as (typeof priceData.$inferInsert)[];
  if (priceDataRows.length) {
    await db.insert(priceData).values(priceDataRows);
    counts.priceData = priceDataRows.length;
  }

  const priceStatRows = (data.priceStats ?? []) as (typeof priceStats.$inferInsert)[];
  if (priceStatRows.length) {
    await db.insert(priceStats).values(priceStatRows);
    counts.priceStats = priceStatRows.length;
  }

  const now = new Date().toISOString();
  await db
    .insert(userSettings)
    .values({ key: "last_restore_at", value: now })
    .onConflictDoUpdate({
      target: userSettings.key,
      set: { value: now, updatedAt: sql`now()` },
    });

  return NextResponse.json({ ok: true, counts, restoredAt: now });
}

// ---------------------------------------------------------------------------
// GET /api/backup/restore — Row counts for the current DB, so the client can
// compare against an uploaded file and warn if the upload looks too small.
// ---------------------------------------------------------------------------
export async function GET() {
  const [
    itemsCount,
    txCount,
    expensesCount,
    watchCount,
    alertsCount,
    settingsCount,
    priceDataCount,
    priceStatsCount,
  ] = await Promise.all([
    db.$count(items),
    db.$count(transactions),
    db.$count(expenses),
    db.$count(watchItems),
    db.$count(dealAlerts),
    db.$count(userSettings),
    db.$count(priceData),
    db.$count(priceStats),
  ]);

  return NextResponse.json({
    counts: {
      items: itemsCount,
      transactions: txCount,
      expenses: expensesCount,
      watchItems: watchCount,
      dealAlerts: alertsCount,
      userSettings: settingsCount,
      priceData: priceDataCount,
      priceStats: priceStatsCount,
    },
  });
}
