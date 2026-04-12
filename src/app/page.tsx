"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Plus,
  Truck,
  Camera,
  Pencil,
  Tag,
  TrendingUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkupCalculator } from "@/components/dashboard/markup-calculator";

// ---------------------------------------------------------------------------
// Types (matches /api/dashboard)
// ---------------------------------------------------------------------------
interface DailyTask {
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
}

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
    todayItemsSold: number;
    daily: { date: string; dayOfWeek: number; count: number; revenue: number }[];
  };
  hourlyRate: number;
  targetHourlyRate: number;
  activeListingsTarget: number;
  urgentShipDays: number;
  actions: {
    needsListing: { id: string; name: string; brand: string | null; daysWaiting: number }[];
    needsShipping: {
      id: string;
      name: string;
      brand: string | null;
      soldAt: string | null;
      daysSinceSold: number;
    }[];
    staleListings: {
      id: string;
      name: string;
      brand: string | null;
      listedPrice: string | null;
      daysListed: number;
    }[];
  };
  recentActivity: { id: string; name: string; status: string; updatedAt: string | null }[];
  dailyPlan: { tasks: DailyTask[]; totalEstimatedMinutes: number };
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

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <div className="h-10 w-56 animate-pulse rounded bg-zinc-900" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-zinc-900" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 h-[500px] animate-pulse rounded-3xl bg-zinc-900" />
      </div>
    );
  }

  // Map plan tasks by type for kanban columns
  const shipTasks = data.dailyPlan.tasks.filter((t) => t.type === "ship");
  const updateTasks = data.dailyPlan.tasks.filter(
    (t) => t.type === "update" || t.type === "photo",
  );
  const reviewTasks = data.dailyPlan.tasks.filter((t) => t.type === "reprice");

  // Urgent = sold items waiting to ship for longer than the configured threshold
  const urgentThreshold = data.urgentShipDays;
  const urgentCount = data.actions.needsShipping.filter(
    (i) => i.daysSinceSold >= urgentThreshold,
  ).length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* ============================================================== */}
      {/* LEFT: Today's Flow */}
      {/* ============================================================== */}
      <section className="lg:col-span-8 flex flex-col gap-5 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100">
              Today&apos;s Flow
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {data.greeting}, Lily · {data.dailyPlan.tasks.length} tasks ·{" "}
              {data.dailyPlan.totalEstimatedMinutes} min
            </p>
          </div>
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-1.5">
                <AlertTriangle className="size-3.5 text-red-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                  {urgentCount} urgent
                </span>
              </div>
            )}
            <Link
              href="/inventory"
              className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110"
            >
              <Plus className="size-3.5" />
              NEW ITEM
            </Link>
          </div>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 min-h-0">
          <KanbanColumn
            title="To Ship"
            count={shipTasks.length}
            accent="emerald"
            emptyLabel="Nothing to ship"
          >
            {shipTasks.map((t) => {
              const ship = data.actions.needsShipping.find((s) => s.id === t.itemId);
              const urgent = ship ? ship.daysSinceSold >= urgentThreshold : false;
              return (
                <ShipCard
                  key={t.id}
                  itemId={t.itemId}
                  title={t.itemName}
                  subtitle={t.subtitle}
                  daysSinceSold={ship?.daysSinceSold ?? 0}
                  urgent={urgent}
                />
              );
            })}
          </KanbanColumn>

          <KanbanColumn
            title="To Update"
            count={updateTasks.length}
            accent="blue"
            emptyLabel="All up to date"
          >
            {updateTasks.map((t) => (
              <UpdateCard
                key={t.id}
                itemId={t.itemId}
                title={t.itemName}
                subtitle={t.subtitle}
                icon={t.icon === "camera" ? "camera" : "edit"}
              />
            ))}
          </KanbanColumn>

          <KanbanColumn
            title="To Review"
            count={reviewTasks.length}
            accent="amber"
            emptyLabel="Nothing to review"
          >
            {reviewTasks.map((t) => {
              const stale = data.actions.staleListings.find((s) => s.id === t.itemId);
              return (
                <ReviewCard
                  key={t.id}
                  itemId={t.itemId}
                  title={t.itemName}
                  price={stale?.listedPrice ?? null}
                  daysListed={stale?.daysListed ?? 0}
                />
              );
            })}
          </KanbanColumn>
        </div>

        {/* Markup calculator — sits under the kanban so it's visible without scrolling */}
        <MarkupCalculator />
      </section>

      {/* ============================================================== */}
      {/* RIGHT: Performance */}
      {/* ============================================================== */}
      <aside className="lg:col-span-4 rounded-3xl border border-white/[0.06] bg-zinc-900/60 p-5 shadow-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
            Performance
          </h3>
          <div className="flex gap-1">
            <span className="size-1 rounded-full bg-emerald-400" />
            <span className="size-1 rounded-full bg-emerald-400/40" />
            <span className="size-1 rounded-full bg-emerald-400/20" />
          </div>
        </div>

        {/* Daily Velocity */}
        <DailyVelocityCard
          todayItemsSold={data.week.todayItemsSold}
          daily={data.week.daily}
        />

        {/* Active listings progress */}
        <WeeklyListingsCard
          listed={data.stats.listed}
          target={data.activeListingsTarget}
        />

        {/* Monthly Revenue */}
        <MonthlyRevenueCard
          monthRevenue={data.month.revenue}
          monthTarget={data.month.target}
          weekRevenue={data.week.revenue}
        />

        {/* 7-day trend */}
        <WeeklyTrendCard
          itemsSoldThisWeek={data.week.itemsSold}
          daily={data.week.daily}
        />

        {/* CTA */}
        <Link
          href="/profit"
          className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-950 shadow-xl shadow-emerald-500/20 transition-all hover:brightness-110"
        >
          View Financials
          <TrendingUp className="size-4" />
        </Link>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban
// ---------------------------------------------------------------------------
type Accent = "emerald" | "blue" | "amber";

const ACCENT: Record<Accent, { bar: string; dot: string; glow: string }> = {
  emerald: {
    bar: "bg-emerald-400",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_10px_rgba(74,222,128,0.2)]",
  },
  blue: {
    bar: "bg-blue-400",
    dot: "bg-blue-400",
    glow: "shadow-[0_0_10px_rgba(96,165,250,0.2)]",
  },
  amber: {
    bar: "bg-amber-400",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_10px_rgba(251,191,36,0.2)]",
  },
};

function KanbanColumn({
  title,
  count,
  accent,
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  accent: Accent;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.04] bg-zinc-950/60 p-3 min-h-0">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-5 w-1.5 rounded-full", a.bar, a.glow)} />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-100">
            {title}
          </h3>
        </div>
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
          {String(count).padStart(2, "0")}
        </span>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-1 max-h-[520px]">
        {count === 0 ? (
          <div className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/[0.08] bg-zinc-900/40 px-3 py-6 text-center">
            <span className={cn("size-1.5 rounded-full", a.dot, "opacity-50")} />
            <p className="text-xs font-medium text-zinc-200">{emptyLabel}</p>
            <p className="text-[10px] text-zinc-400">You&apos;re all caught up</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function ShipCard({
  itemId,
  title,
  subtitle,
  daysSinceSold,
  urgent,
}: {
  itemId: string;
  title: string;
  subtitle: string;
  daysSinceSold: number;
  urgent: boolean;
}) {
  return (
    <Link
      href={`/inventory?edit=${itemId}`}
      className={cn(
        "group block rounded-xl bg-zinc-800 p-3.5 shadow-md shadow-black/30 transition-all",
        urgent
          ? "border-l-4 border-red-500 hover:bg-zinc-800"
          : "border border-white/[0.08] hover:border-emerald-400/50 hover:bg-zinc-800/90",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-tight",
            urgent ? "text-red-400" : "text-emerald-400",
          )}
        >
          {urgent ? "URGENT" : "TO SHIP"}
        </span>
        <Truck
          className={cn(
            "size-3.5 transition-colors",
            urgent ? "text-red-400" : "text-zinc-500 group-hover:text-emerald-400",
          )}
        />
      </div>
      <h4 className="mb-1 text-sm font-bold leading-tight text-zinc-100 line-clamp-2">
        {title}
      </h4>
      <p className="mb-3 text-[11px] text-zinc-400 line-clamp-2">{subtitle}</p>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-bold",
            urgent
              ? "bg-red-500/10 text-red-400"
              : "text-zinc-400",
          )}
        >
          {daysSinceSold === 0
            ? "Sold today"
            : `${daysSinceSold}d since sold`}
        </span>
      </div>
    </Link>
  );
}

function UpdateCard({
  itemId,
  title,
  subtitle,
  icon,
}: {
  itemId: string;
  title: string;
  subtitle: string;
  icon: "edit" | "camera";
}) {
  const Icon = icon === "camera" ? Camera : Pencil;
  return (
    <Link
      href={`/inventory?edit=${itemId}`}
      className="group block rounded-xl border border-white/[0.08] bg-zinc-800 p-3.5 shadow-md shadow-black/30 transition-all hover:border-blue-400/50 hover:bg-zinc-800/90"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-tight text-blue-400">
          {icon === "camera" ? "ADD PHOTOS" : "UPDATE"}
        </span>
        <Icon className="size-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
      </div>
      <h4 className="mb-1 text-sm font-bold leading-tight text-zinc-100 line-clamp-2">
        {title}
      </h4>
      <p className="text-[11px] text-zinc-400 line-clamp-2">{subtitle}</p>
    </Link>
  );
}

function ReviewCard({
  itemId,
  title,
  price,
  daysListed,
}: {
  itemId: string;
  title: string;
  price: string | null;
  daysListed: number;
}) {
  return (
    <Link
      href={`/inventory?edit=${itemId}`}
      className="group block rounded-xl border border-white/[0.08] bg-zinc-800 p-3.5 shadow-md shadow-black/30 transition-all hover:border-amber-400/50 hover:bg-zinc-800/90"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-tight text-amber-400">
          REPRICE
        </span>
        <Tag className="size-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
      </div>
      <h4 className="mb-1 text-sm font-bold leading-tight text-zinc-100 line-clamp-2">
        {title}
      </h4>
      <p className="mb-3 text-[11px] text-zinc-400">
        {price ? `Listed £${parseFloat(price).toFixed(0)} · ${daysListed}d` : `${daysListed}d listed`}
      </p>
      <div className="flex gap-2">
        <span className="flex-1 rounded-lg bg-amber-500/10 py-1.5 text-center text-[10px] font-bold text-amber-400">
          REVIEW
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Performance cards
// ---------------------------------------------------------------------------
function DailyVelocityCard({
  todayItemsSold,
  daily,
}: {
  todayItemsSold: number;
  daily: { date: string; count: number }[];
}) {
  // Use last 4 days (including today) as the sparkline
  const lastFour = daily.slice(-4);
  const maxCount = Math.max(1, ...lastFour.map((d) => d.count));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.04] bg-zinc-900 p-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
        Today
      </span>
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-2xl font-black text-zinc-100">
            {todayItemsSold}{" "}
            <span className="text-sm font-medium text-zinc-400">
              item{todayItemsSold !== 1 ? "s" : ""}
            </span>
          </span>
          <span className="text-[10px] text-zinc-300">sold</span>
        </div>
        <div className="flex h-10 w-24 items-end gap-1">
          {lastFour.map((d, i) => {
            const isToday = i === lastFour.length - 1;
            const pct = (d.count / maxCount) * 100;
            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.count}`}
                className={cn(
                  "flex-1 rounded-sm",
                  isToday ? "bg-emerald-400" : "bg-emerald-400/20",
                )}
                style={{ height: `${Math.max(6, pct)}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeeklyListingsCard({ listed, target }: { listed: number; target: number }) {
  const pct = Math.min(100, Math.round((listed / target) * 100));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            Active Listings
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-400">{listed}</span>
            <span className="text-xs text-zinc-400">/ {target} items</span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-xs font-bold text-blue-400">{pct}%</span>
          <span className="text-[10px] text-zinc-300">of target</span>
        </div>
      </div>
      <div className="h-3 w-full rounded-full border border-white/[0.04] bg-zinc-950 p-0.5">
        <div
          className="h-full rounded-full bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.4)] transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MonthlyRevenueCard({
  monthRevenue,
  monthTarget,
  weekRevenue,
}: {
  monthRevenue: number;
  monthTarget: number;
  weekRevenue: number;
}) {
  const weeklyTarget = monthTarget * (12 / 52);
  const delta = weekRevenue - weeklyTarget;
  const ahead = delta >= 0;
  const monthPct = Math.min(100, (monthRevenue / monthTarget) * 100);
  const weekPct = Math.min(100, (weekRevenue / weeklyTarget) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Monthly running total */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          Monthly Revenue
        </div>
        <div className="text-3xl font-black text-emerald-400">
          £{monthRevenue.toFixed(0)}
          <span className="ml-1.5 text-xs font-medium text-zinc-300">
            / £{monthTarget.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-950 ring-1 ring-white/[0.04]">
          <div
            className="h-full rounded-full bg-emerald-500/70 transition-all duration-700"
            style={{ width: `${monthPct}%` }}
          />
        </div>
      </div>

      {/* Rolling 7-day pace */}
      <div className="rounded-2xl border border-white/[0.04] bg-zinc-950/60 p-3">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Last 7 days
            </div>
            <div className="text-lg font-black text-zinc-100">
              £{weekRevenue.toFixed(0)}
              <span className="ml-1.5 text-[11px] font-medium text-zinc-300">
                / £{weeklyTarget.toFixed(0)} target
              </span>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              ahead
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-amber-500/15 text-amber-400",
            )}
          >
            {ahead ? "↑" : "↓"} £{Math.abs(delta).toFixed(0)}
          </div>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/[0.04]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              ahead ? "bg-emerald-500" : "bg-amber-500",
            )}
            style={{ width: `${weekPct}%` }}
          />
          {/* 100% weekly target marker */}
          <div
            className="absolute inset-y-0 right-0 w-0.5 bg-zinc-200/60"
            title="Weekly target"
          />
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-300">
          {ahead
            ? `£${delta.toFixed(0)} above weekly target`
            : `£${Math.abs(delta).toFixed(0)} below weekly target`}
        </p>
      </div>
    </div>
  );
}

function WeeklyTrendCard({
  itemsSoldThisWeek,
  daily,
}: {
  itemsSoldThisWeek: number;
  daily: { date: string; dayOfWeek: number; count: number; revenue: number }[];
}) {
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const maxCount = Math.max(1, ...daily.map((d) => d.count));
  return (
    <div className="border-t border-white/[0.05] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          7 Day Trend
        </p>
        <Info className="size-3.5 text-zinc-500" />
      </div>
      <div className="flex h-20 items-end gap-2">
        {daily.map((d, i) => {
          const isToday = i === daily.length - 1;
          const pct = (d.count / maxCount) * 100;
          const empty = d.count === 0;
          return (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${d.date}: ${d.count} sold · £${d.revenue.toFixed(0)}`}
            >
              <div
                className={cn(
                  "w-full rounded-t-md transition-colors",
                  isToday
                    ? "bg-emerald-400"
                    : empty
                      ? "bg-zinc-800/60"
                      : "bg-zinc-700 hover:bg-emerald-400/60",
                )}
                style={{ height: empty ? "6%" : `${Math.max(8, pct)}%` }}
              />
              <span
                className={cn(
                  "text-[9px]",
                  isToday ? "text-emerald-400 font-bold" : "text-zinc-300",
                )}
              >
                {dayLabels[d.dayOfWeek]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-zinc-300">
        {itemsSoldThisWeek} item{itemsSoldThisWeek !== 1 ? "s" : ""} sold this week
      </p>
    </div>
  );
}
