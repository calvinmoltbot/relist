import { db } from "@/lib/db";
import { userSettings } from "@/db/schema";

export interface Targets {
  monthlyRevenueTarget: number;
  weeklyHours: number;
  targetHourlyRate: number;
  marginTargetPct: number;
  activeListingsTarget: number;
  urgentShipDays: number;
}

const DEFAULTS: Record<string, string> = {
  monthly_revenue_target: "3000",
  weekly_hours: "25",
  target_hourly_rate: "18",
  margin_target_pct: "65",
  active_listings_target: "30",
  urgent_ship_days: "2",
};

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(userSettings);
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function getTargets(): Promise<Targets> {
  const s = await getSettings();
  return {
    monthlyRevenueTarget: Number(s.monthly_revenue_target),
    weeklyHours: Number(s.weekly_hours),
    targetHourlyRate: Number(s.target_hourly_rate),
    marginTargetPct: Number(s.margin_target_pct),
    activeListingsTarget: Number(s.active_listings_target),
    urgentShipDays: Number(s.urgent_ship_days),
  };
}
