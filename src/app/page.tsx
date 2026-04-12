"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  TrendingUp,
  Clock,
  ArrowRight,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanMyDay } from "@/components/daily-plan/plan-my-day";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardData {
  greeting: string;
  stats: {
    totalItems: number;
    sourced: number;
    listed: number;
    sold: number;
    shipped: number;
  };
  month: {
    key: string;
    revenue: number;
    profit: number;
    itemsSold: number;
    target: number;
    progress: number;
    projected: number;
    onTrack: boolean;
    daysRemaining: number;
  };
  week: {
    revenue: number;
    itemsSold: number;
  };
  hourlyRate: number;
  targetHourlyRate: number;
  actions: {
    needsListing: { id: string; name: string; brand: string | null; daysWaiting: number }[];
    needsShipping: { id: string; name: string; brand: string | null; soldAt: string | null; daysSinceSold: number }[];
    staleListings: { id: string; name: string; brand: string | null; listedPrice: string | null; daysListed: number }[];
  };
  recentActivity: { id: string; name: string; status: string; updatedAt: string | null }[];
  dailyPlan: {
    tasks: {
      id: string;
      type: "ship" | "update" | "reprice" | "photo";
      priority: number;
      title: string;
      subtitle: string;
      itemId: string;
      itemName: string;
      action: string;
      estimatedMinutes: number;
      icon: "package" | "edit" | "tag" | "camera";
    }[];
    totalEstimatedMinutes: number;
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { month, week, stats } = data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      {/* Row 1: Greeting + quick nav */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            {data.greeting}, Lily
          </h1>
        </div>
        <div className="flex gap-2">
          <QuickLink href="/inventory" label="Inventory" icon={Package} />
          <QuickLink href="/profit" label="Financials" icon={TrendingUp} />
        </div>
      </div>

      {/* Row 2: Kanban board — the main action area, at the top */}
      <PlanMyDay initialTasks={data.dailyPlan.tasks} />

      {/* Row 3: Stats + Revenue target — side by side */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Left: Key numbers */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="This month"
            value={`£${month.profit.toFixed(0)}`}
            subtitle={`${month.itemsSold} sold · £${month.revenue.toFixed(0)} revenue`}
            accent="emerald"
          />
          <StatCard
            label="This week"
            value={`£${week.revenue.toFixed(0)}`}
            subtitle={`${week.itemsSold} item${week.itemsSold !== 1 ? "s" : ""} sold`}
            accent="blue"
          />
          <StatCard
            label="Hourly rate"
            value={`£${data.hourlyRate.toFixed(0)}/hr`}
            subtitle={`Target: £${data.targetHourlyRate}/hr`}
            accent={data.hourlyRate >= data.targetHourlyRate ? "emerald" : "amber"}
          />
          <StatCard
            label="Inventory"
            value={stats.totalItems}
            subtitle={`${stats.listed} listed · ${stats.sourced} to list`}
            accent="violet"
          />
        </div>

        {/* Right: Revenue target */}
        <div className="rounded-xl bg-zinc-900 p-4 ring-1 ring-white/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="size-4 text-violet-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Monthly Target
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-100">
                £{month.revenue.toFixed(0)}
              </span>
              <span className="text-sm text-zinc-300">
                / £{month.target.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  month.onTrack ? "bg-emerald-500" : "bg-amber-500",
                )}
                style={{ width: `${Math.min(month.progress, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-300">{month.progress.toFixed(0)}%</span>
              <span className={month.onTrack ? "text-emerald-400" : "text-amber-400"}>
                {month.onTrack
                  ? `On track · projected £${month.projected.toLocaleString()}`
                  : `${month.daysRemaining}d left · projected £${month.projected.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recent activity — compact, only if there is any */}
      {data.recentActivity.length > 0 && (
        <div className="rounded-xl bg-zinc-900 p-3 ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-200">Recent activity</span>
            <Link href="/inventory" className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors">
              View all →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {data.recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 shrink-0 rounded-lg bg-zinc-800/50 px-3 py-2"
              >
                <StatusDot status={item.status} />
                <span className="text-xs text-zinc-200 whitespace-nowrap">{item.name}</span>
                <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                  {item.updatedAt ? formatRelative(item.updatedAt) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
type Accent = "emerald" | "blue" | "amber" | "violet";

const accentColors: Record<Accent, string> = {
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  violet: "text-violet-400",
};

function StatCard({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  accent: Accent;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 p-3 ring-1 ring-white/[0.06]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-bold", accentColors[accent])}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-300">{subtitle}</p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] hover:text-zinc-100">
        <Icon className="size-3.5 text-zinc-400" />
        {label}
        <ArrowRight className="size-3 text-zinc-400" />
      </div>
    </Link>
  );
}

const STATUS_DOTS: Record<string, string> = {
  sourced: "bg-amber-400",
  listed: "bg-blue-400",
  sold: "bg-emerald-400",
  shipped: "bg-violet-400",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOTS[status] ?? "bg-zinc-400")} />
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
