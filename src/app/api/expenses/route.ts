import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/db/schema";
import { desc, and, gte, lte, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// GET /api/expenses — list expenses with optional date filtering
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const preset = searchParams.get("preset");

  const { from, to } = resolveDateRange(preset, fromStr, toStr);

  const conditions = [];
  if (from) conditions.push(gte(expenses.incurredAt, from));
  if (to) conditions.push(lte(expenses.incurredAt, to));

  const rows = await db
    .select()
    .from(expenses)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(expenses.incurredAt));

  // Summary by category
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const amt = parseFloat(row.amount);
    total += amt;
    byCategory[row.category] = (byCategory[row.category] ?? 0) + amt;
  }

  return NextResponse.json({
    expenses: rows,
    summary: {
      total: Math.round(total * 100) / 100,
      byCategory,
      count: rows.length,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/expenses — create a new expense
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.category || !body.amount || !body.incurredAt) {
    return NextResponse.json(
      { error: "category, amount, and incurredAt are required" },
      { status: 400 },
    );
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      category: body.category,
      description: body.description ?? null,
      amount: String(body.amount),
      itemId: body.itemId ?? null,
      incurredAt: new Date(body.incurredAt),
    })
    .returning();

  return NextResponse.json({ expense }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/expenses?id=<uuid>
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(expenses)
    .where(eq(expenses.id, id))
    .returning({ id: expenses.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}

// ---------------------------------------------------------------------------
// Date range helper (shared logic with profit route)
// ---------------------------------------------------------------------------
function resolveDateRange(
  preset: string | null,
  fromStr: string | null,
  toStr: string | null,
): { from: Date | null; to: Date | null } {
  const now = new Date();

  if (preset) {
    switch (preset) {
      case "this_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        };
      case "last_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        };
      case "last_90_days":
        return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to: now };
      case "this_year":
        return { from: new Date(now.getFullYear(), 0, 1), to: now };
      case "tax_year": {
        const taxYearStart =
          now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
            ? new Date(now.getFullYear(), 3, 6)
            : new Date(now.getFullYear() - 1, 3, 6);
        return { from: taxYearStart, to: now };
      }
      default:
        return { from: null, to: null };
    }
  }

  return {
    from: fromStr ? new Date(fromStr + "T00:00:00") : null,
    to: toStr ? new Date(toStr + "T23:59:59") : null,
  };
}
