import { NextResponse } from "next/server";
import { buildDailyPlan } from "@/lib/daily-plan";

export async function GET() {
  const plan = await buildDailyPlan();
  return NextResponse.json(plan);
}
