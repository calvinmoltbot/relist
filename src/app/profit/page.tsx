"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
  Percent,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProfitChart } from "@/components/profit/profit-chart";
import { CategoryBreakdown } from "@/components/profit/category-breakdown";
import { SourceBreakdown } from "@/components/profit/source-breakdown";
import { TopItems } from "@/components/profit/top-items";
import {
  DateRangePicker,
  type DatePreset,
} from "@/components/profit/date-range-picker";
import { ExpensesTab } from "@/components/profit/expenses-tab";
import { TaxExportTab } from "@/components/profit/tax-export-tab";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfitData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    netProfit: number;
    totalShipping: number;
    totalFees: number;
    totalExpenses: number;
    avgMargin: number;
    avgProfitPerItem: number;
    itemsSold: number;
    itemsListed: number;
    itemsSourced: number;
    stockCost: number;
    stockListedValue: number;
    sellThroughRate: number;
    avgDaysToSell: number | null;
  };
  comparison: {
    revenueDelta: number | null;
    profitDelta: number | null;
    itemsSoldDelta: number | null;
  };
  targets: {
    monthlyTarget: number;
    weeklyHours: number;
    marginTarget: number;
    currentMonth: string;
    monthRevenue: number;
    monthProfit: number;
    monthItemsSold: number;
    projectedMonthRevenue: number;
    daysRemaining: number;
    revenueProgress: number;
    effectiveHourlyRate: number;
    targetHourlyRate: number;
    onTrack: boolean;
  };
  weeklyPulse: {
    itemsSold: number;
    revenue: number;
    revenueDelta: number | null;
  };
  inventoryHealth: {
    agingBuckets: Record<string, number>;
    agingValues: Record<string, number>;
    deadStock: {
      id: string;
      name: string;
      brand: string | null;
      listedPrice: number;
      daysListed: number;
    }[];
    totalUnsold: number;
    inventoryTurnover: number;
    stockAtRisk: number;
  };
  itemProfits: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    cost: number;
    sold: number;
    profit: number;
    netProfit: number;
    soldAt: string | null;
    sourceType: string | null;
  }[];
  byCategory: {
    category: string;
    revenue: number;
    cost: number;
    profit: number;
    count: number;
  }[];
  bySource: {
    source: string;
    revenue: number;
    cost: number;
    profit: number;
    count: number;
  }[];
  byExpenseCategory: {
    category: string;
    amount: number;
  }[];
  byMonth: {
    month: string;
    revenue: number;
    cost: number;
    profit: number;
    count: number;
  }[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function FinancialsPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DatePreset>("all_time");

  const fetchData = useCallback((p: DatePreset) => {
    setLoading(true);
    const url = p === "all_time" ? "/api/profit" : `/api/profit?preset=${p}`;
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(preset);
  }, [preset, fetchData]);

  function handlePresetChange(p: DatePreset) {
    setPreset(p);
  }

  if (loading && !data) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Financials</h1>
          <p className="text-sm text-zinc-300">
            Track your earnings, expenses, and business health
          </p>
        </div>
        <div className="flex items-center justify-center py-16 sm:py-20 text-zinc-300">
          <div className="size-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, targets, comparison, weeklyPulse } = data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
      {/* Header + Date Picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Financials</h1>
          <p className="text-sm text-zinc-300">
            Track your earnings, expenses, and business health
          </p>
        </div>
        <DateRangePicker preset={preset} onPresetChange={handlePresetChange} />
      </div>

      {/* Revenue target bar — always current month, above tabs */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="py-3 sm:py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Monthly Revenue — {formatMonthLabel(targets.currentMonth)}
              </p>
              <p className="text-xs text-zinc-300">
                {targets.daysRemaining} days remaining
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-xl sm:text-2xl font-semibold text-zinc-100">
                £{targets.monthRevenue.toFixed(0)}
              </span>
              <span className="text-sm text-zinc-300">
                {" / £"}{targets.monthlyTarget.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                targets.onTrack ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{
                width: `${Math.min(targets.revenueProgress, 100)}%`,
              }}
            />
          </div>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-zinc-300 sm:flex-row sm:justify-between">
            <span>{targets.revenueProgress.toFixed(0)}% of target</span>
            <span>
              Projected: £{targets.projectedMonthRevenue.toLocaleString()}
              {" · "}
              £{targets.effectiveHourlyRate.toFixed(2)}/hr
              <span className="text-zinc-400 hidden sm:inline">
                {" "}(target £{targets.targetHourlyRate}/hr)
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line" className="mb-4 overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="tax" className="whitespace-nowrap">Tax &amp; Export</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ─────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="space-y-4 sm:space-y-5">
            {/* Weekly pulse */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="flex items-center gap-3 sm:gap-4 py-3">
                <Zap className="size-4 text-amber-400 shrink-0" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4 text-sm">
                  <span className="text-zinc-300">
                    <span className="font-semibold text-zinc-100">
                      {weeklyPulse.itemsSold}
                    </span>{" "}
                    sold this week
                  </span>
                  <span className="text-zinc-300 hidden sm:inline">·</span>
                  <span className="text-zinc-300">
                    £
                    <span className="font-semibold text-zinc-100">
                      {weeklyPulse.revenue.toFixed(0)}
                    </span>{" "}
                    revenue
                  </span>
                  {weeklyPulse.revenueDelta != null && (
                    <>
                      <span className="text-zinc-300 hidden sm:inline">·</span>
                      <DeltaBadge value={weeklyPulse.revenueDelta} label="vs last week" />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Net Profit"
                value={`£${summary.netProfit.toFixed(2)}`}
                icon={summary.netProfit >= 0 ? TrendingUp : TrendingDown}
                accent={summary.netProfit >= 0 ? "emerald" : "red"}
                delta={comparison.profitDelta}
              />
              <StatCard
                label="Revenue"
                value={`£${summary.totalRevenue.toFixed(2)}`}
                icon={DollarSign}
                accent="blue"
                delta={comparison.revenueDelta}
              />
              <StatCard
                label="Avg Margin"
                value={`${summary.avgMargin.toFixed(1)}%`}
                icon={Percent}
                accent={
                  summary.avgMargin >= 65
                    ? "emerald"
                    : summary.avgMargin >= 40
                      ? "amber"
                      : "red"
                }
                subtitle={`Target: ${data.targets.marginTarget}%`}
              />
              <StatCard
                label="Items Sold"
                value={summary.itemsSold}
                icon={Package}
                accent="violet"
                delta={comparison.itemsSoldDelta}
                subtitle={`${summary.itemsListed} listed · ${summary.itemsSourced} sourced`}
              />
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Avg profit/item" value={`£${summary.avgProfitPerItem.toFixed(2)}`} />
              <MiniStat label="Sell-through rate" value={`${summary.sellThroughRate.toFixed(1)}%`} />
              <MiniStat label="Stock cost" value={`£${summary.stockCost.toFixed(2)}`} />
              <MiniStat label="Stock listed value" value={`£${summary.stockListedValue.toFixed(2)}`} />
            </div>

            {/* Monthly chart */}
            {summary.itemsSold > 0 && data.byMonth.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Monthly Profit</CardTitle>
                  <CardDescription>
                    Revenue, cost, and profit over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfitChart data={data.byMonth} />
                </CardContent>
              </Card>
            )}

            {summary.itemsSold === 0 && (
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-white/[0.06]">
                    <BarChart3 className="size-7 text-zinc-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-zinc-300">
                    No sales data{preset !== "all_time" ? " in this period" : " yet"}
                  </h3>
                  <p className="mt-1 max-w-xs text-sm text-zinc-300">
                    {preset !== "all_time"
                      ? "Try a different date range or mark items as sold."
                      : "Mark items as sold in your inventory to see profit analytics here."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Breakdown Tab ────────────────────────────────────── */}
        <TabsContent value="breakdown">
          <div className="space-y-6">
            {summary.itemsSold === 0 ? (
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardContent className="py-12 text-center text-sm text-zinc-300">
                  No sales data{preset !== "all_time" ? " in this period" : ""} to break down.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  {data.byCategory.length > 0 && (
                    <Card className="border-zinc-800 bg-zinc-900/50">
                      <CardHeader className="pb-0">
                        <CardTitle className="text-sm">By Category</CardTitle>
                        <CardDescription>
                          Which categories are most profitable
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CategoryBreakdown data={data.byCategory} />
                      </CardContent>
                    </Card>
                  )}

                  {data.bySource.length > 0 && (
                    <Card className="border-zinc-800 bg-zinc-900/50">
                      <CardHeader className="pb-0">
                        <CardTitle className="text-sm">By Source</CardTitle>
                        <CardDescription>
                          Which sourcing channels perform best
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SourceBreakdown data={data.bySource} />
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm">Item Performance</CardTitle>
                    <CardDescription>
                      Profit per item, sorted by most profitable
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TopItems data={data.itemProfits} />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTab
            preset={preset}
            totalExpenses={summary.totalExpenses}
            byExpenseCategory={data.byExpenseCategory}
            onExpenseAdded={() => fetchData(preset)}
          />
        </TabsContent>

        <TabsContent value="tax">
          <TaxExportTab
            summary={summary}
            totalExpenses={summary.totalExpenses}
            byExpenseCategory={data.byExpenseCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------
type Accent = "emerald" | "blue" | "amber" | "red" | "violet";

const accentColors: Record<Accent, string> = {
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  red: "text-red-400",
  violet: "text-violet-400",
};

const accentBg: Record<Accent, string> = {
  emerald: "bg-emerald-500/10",
  blue: "bg-blue-500/10",
  amber: "bg-amber-500/10",
  red: "bg-red-500/10",
  violet: "bg-violet-500/10",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  subtitle,
  delta,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  subtitle?: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 p-3 sm:p-4 ring-1 ring-white/[0.06]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-300">
          {label}
        </p>
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            accentBg[accent]
          )}
        >
          <Icon className={cn("size-3.5", accentColors[accent])} />
        </div>
      </div>
      <p className={cn("mt-1.5 sm:mt-2 text-xl sm:text-2xl font-semibold", accentColors[accent])}>
        {value}
      </p>
      <div className="mt-0.5 flex items-center gap-2">
        {delta != null && <DeltaBadge value={delta} />}
        {subtitle && (
          <p className="text-[11px] text-zinc-300">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 px-3 py-2.5 sm:px-4 sm:py-3 ring-1 ring-white/[0.06]">
      <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-zinc-300">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function DeltaBadge({ value, label }: { value: number; label?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium",
        positive ? "text-emerald-400" : "text-red-400"
      )}
    >
      {positive ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {Math.abs(value).toFixed(0)}%
      {label && <span className="text-zinc-300 font-normal ml-0.5">{label}</span>}
    </span>
  );
}

function formatMonthLabel(monthKey: string): string {
  const [year, m] = monthKey.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}
