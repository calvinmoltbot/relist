import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/settings — return all settings as { key: value }
// ---------------------------------------------------------------------------
export async function GET() {
  const rows = await db.select().from(userSettings);
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json({ settings });
}

// ---------------------------------------------------------------------------
// PUT /api/settings — upsert settings from { key: value, ... }
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  const body: Record<string, string> = await request.json();

  for (const [key, value] of Object.entries(body)) {
    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.key, key));

    if (existing) {
      await db
        .update(userSettings)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(userSettings.key, key));
    } else {
      await db.insert(userSettings).values({ key, value: String(value) });
    }
  }

  // Return updated settings
  const rows = await db.select().from(userSettings);
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json({ settings });
}
