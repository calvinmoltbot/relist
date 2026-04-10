"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  BarChart3,
  Percent,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProfitChart } from "@/components/profit/profit-chart";
import { CategoryBreakdown } from "@/components/profit/category-breakdown";
import { SourceBreakdown } from "@/components/profit/source-breakdown";
import { TopItems } from "@/components/profit/top-items";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
  avgProfitPerItem: number;
  itemsSold: number;
  itemsListed: number;
  itemsSourced: number;
  stockCost: number;
  stockListedValue: number;
}

interface ItemProfit {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  cost: number;
  sold: number;
  profit: number;
  soldAt: string | null;
  sourceType: string | null;
}

interface CategoryData {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

interface SourceData {
  source: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

interface MonthData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

interface Targets {
  monthlyTarget: number;
  sixMonthTarget: number;
  weeklyHours: number;
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
}

interface ProfitData {
  summary: ProfitSummary;
  targets: Targets;
  itemProfits: ItemProfit[];
  byCategory: CategoryData[];
  bySource: SourceData[];
  byMonth: MonthData[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ProfitPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profit")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            Profit Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            Track your earnings, expenses, and margins
          </p>
        </div>
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <div className="size-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const hasData = summary.itemsSold > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Profit Dashboard
        </h1>
        <p className="text-sm text-zinc-500">
          Track your earnings, expenses, and margins
        </p>
      </div>

      {/* Revenue target */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Monthly Revenue — {formatMonthLabel(data.targets.currentMonth)}
              </p>
              <p className="text-xs text-zinc-500">
                {data.targets.daysRemaining} days remaining
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold text-zinc-100">
                {"\u00A3"}{data.targets.monthRevenue.toFixed(0)}
              </span>
              <span className="text-sm text-zinc-500">
                {" / \u00A3"}{data.targets.monthlyTarget.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                data.targets.onTrack ? "bg-emerald-500" : "bg-amber-500",
              )}
              style={{ width: `${Math.min(data.targets.revenueProgress, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{data.targets.revenueProgress.toFixed(0)}% of target</span>
            <span>
              Projected: {"\u00A3"}{data.targets.projectedMonthRevenue.toLocaleString()}
              {" \u00B7 "}
              {"\u00A3"}{data.targets.effectiveHourlyRate.toFixed(2)}/hr
              <span className="text-zinc-600"> (target {"\u00A3"}{data.targets.targetHourlyRate}/hr)</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Profit"
          value={`\u00A3${summary.totalProfit.toFixed(2)}`}
          icon={summary.totalProfit >= 0 ? TrendingUp : TrendingDown}
          accent={summary.totalProfit >= 0 ? "emerald" : "red"}
        />
        <StatCard
          label="Revenue"
          value={`\u00A3${summary.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          accent="blue"
        />
        <StatCard
          label="Avg Margin"
          value={`${summary.avgMargin.toFixed(1)}%`}
          icon={Percent}
          accent={summary.avgMargin >= 65 ? "emerald" : summary.avgMargin >= 40 ? "amber" : "red"}
          subtitle="Target: 65%"
        />
        <StatCard
          label="Items Sold"
          value={summary.itemsSold}
          icon={Package}
          accent="violet"
          subtitle={`${summary.itemsListed} listed, ${summary.itemsSourced} sourced`}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Avg profit/item" value={`\u00A3${summary.avgProfitPerItem.toFixed(2)}`} />
        <MiniStat label="Total cost" value={`\u00A3${summary.totalCost.toFixed(2)}`} />
        <MiniStat label="Stock cost" value={`\u00A3${summary.stockCost.toFixed(2)}`} />
        <MiniStat
          label="Stock listed value"
          value={`\u00A3${summary.stockListedValue.toFixed(2)}`}
        />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-white/[0.06]">
              <BarChart3 className="size-7 text-zinc-600" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-zinc-300">
              No sales data yet
            </h3>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              Mark items as sold in your inventory to see profit analytics here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Monthly chart */}
          {data.byMonth.length > 0 && (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>Monthly Profit</CardTitle>
                <CardDescription>Revenue, cost, and profit over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfitChart data={data.byMonth} />
              </CardContent>
            </Card>
          )}

          {/* Breakdowns */}
          <div className="grid gap-6 lg:grid-cols-2">
            {data.byCategory.length > 0 && (
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle>By Category</CardTitle>
                  <CardDescription>Which categories are most profitable</CardDescription>
                </CardHeader>
                <CardContent>
                  <CategoryBreakdown data={data.byCategory} />
                </CardContent>
              </Card>
            )}

            {data.bySource.length > 0 && (
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle>By Source</CardTitle>
                  <CardDescription>Which sourcing channels perform best</CardDescription>
                </CardHeader>
                <CardContent>
                  <SourceBreakdown data={data.bySource} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top items */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>Item Performance</CardTitle>
              <CardDescription>Profit per item, sorted by most profitable</CardDescription>
            </CardHeader>
            <CardContent>
              <TopItems data={data.itemProfits} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat cards
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
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 p-4 ring-1 ring-white/[0.06]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <div className={cn("flex size-7 items-center justify-center rounded-lg", accentBg[accent])}>
          <Icon className={cn("size-3.5", accentColors[accent])} />
        </div>
      </div>
      <p className={cn("mt-2 text-2xl font-semibold", accentColors[accent])}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 px-4 py-3 ring-1 ring-white/[0.06]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function formatMonthLabel(monthKey: string): string {
  const [year, m] = monthKey.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}
