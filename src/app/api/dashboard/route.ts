import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";

// ---------------------------------------------------------------------------
// GET /api/dashboard — JSON wrapper around getDashboardData, used for
// client-side refreshes. The Dashboard page itself now calls
// getDashboardData directly from a Server Component.
// ---------------------------------------------------------------------------
export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
    },
  });
}
