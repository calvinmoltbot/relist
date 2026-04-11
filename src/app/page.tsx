"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
  Truck,
  Tag,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { month, week, actions, stats } = data;
  const totalActions =
    actions.needsListing.length +
    actions.needsShipping.length +
    actions.staleListings.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          {data.greeting}, Lily
        </h1>
        <p className="text-sm text-zinc-500">
          {totalActions > 0
            ? `You have ${totalActions} item${totalActions === 1 ? "" : "s"} needing attention`
            : "You\u2019re all caught up today"}
        </p>
      </div>

      {/* Revenue target progress */}
      <Card>
        <CardContent className="py-3 sm:py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-violet-400" />
              <span className="text-sm font-medium text-zinc-200">
                Monthly Revenue Target
              </span>
            </div>
            <div className="sm:text-right">
              <span className="text-lg font-semibold text-zinc-100">
                {"\u00A3"}{month.revenue.toFixed(0)}
              </span>
              <span className="text-sm text-zinc-500"> / {"\u00A3"}{month.target.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                month.onTrack ? "bg-emerald-500" : "bg-amber-500",
              )}
              style={{ width: `${Math.min(month.progress, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span>{month.progress.toFixed(0)}% of target</span>
            <span>
              {month.onTrack ? (
                <span className="text-emerald-400">On track — projected {"\u00A3"}{month.projected.toLocaleString()}</span>
              ) : (
                <span className="text-amber-400">{month.daysRemaining} days left — projected {"\u00A3"}{month.projected.toLocaleString()}</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="This month"
          value={`\u00A3${month.profit.toFixed(2)}`}
          subtitle={`${month.itemsSold} items sold`}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="This week"
          value={`\u00A3${week.revenue.toFixed(2)}`}
          subtitle={`${week.itemsSold} items sold`}
          icon={TrendingUp}
          accent="blue"
        />
        <StatCard
          label="Hourly rate"
          value={`\u00A3${data.hourlyRate.toFixed(2)}/hr`}
          subtitle={`Target: \u00A3${data.targetHourlyRate}/hr`}
          icon={Clock}
          accent={data.hourlyRate >= data.targetHourlyRate ? "emerald" : "amber"}
        />
        <StatCard
          label="Inventory"
          value={stats.totalItems}
          subtitle={`${stats.listed} listed, ${stats.sourced} to list`}
          icon={Package}
          accent="violet"
        />
      </div>

      {/* Action items */}
      {totalActions > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Needs shipping */}
          {actions.needsShipping.length > 0 && (
            <ActionCard
              title="Ship Now"
              icon={Truck}
              accent="red"
              count={actions.needsShipping.length}
            >
              {actions.needsShipping.map((item) => (
                <ActionRow key={item.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-zinc-500">{item.brand}</p>
                    )}
                  </div>
                  {item.daysSinceSold > 0 && (
                    <Badge variant="outline" className="shrink-0 text-red-400 border-red-500/25 text-[10px]">
                      {item.daysSinceSold}d ago
                    </Badge>
                  )}
                </ActionRow>
              ))}
            </ActionCard>
          )}

          {/* Needs listing */}
          {actions.needsListing.length > 0 && (
            <ActionCard
              title="Ready to List"
              icon={Tag}
              accent="amber"
              count={actions.needsListing.length}
            >
              {actions.needsListing.map((item) => (
                <ActionRow key={item.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-zinc-500">{item.brand}</p>
                    )}
                  </div>
                  {item.daysWaiting > 2 && (
                    <Badge variant="outline" className="shrink-0 text-amber-400 border-amber-500/25 text-[10px]">
                      {item.daysWaiting}d waiting
                    </Badge>
                  )}
                </ActionRow>
              ))}
            </ActionCard>
          )}

          {/* Stale listings */}
          {actions.staleListings.length > 0 && (
            <ActionCard
              title="Consider Relisting"
              icon={AlertCircle}
              accent="zinc"
              count={actions.staleListings.length}
            >
              {actions.staleListings.map((item) => (
                <ActionRow key={item.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{item.name}</p>
                    <p className="text-xs text-zinc-500">
                      {item.listedPrice && `\u00A3${parseFloat(item.listedPrice).toFixed(2)}`}
                      {" \u00B7 "}{item.daysListed}d listed
                    </p>
                  </div>
                </ActionRow>
              ))}
            </ActionCard>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink href="/inventory" label="View Inventory" icon={Package} />
        <QuickLink href="/describe" label="Generate Description" icon={Tag} />
        <QuickLink href="/profit" label="Full Profit Report" icon={TrendingUp} />
      </div>

      {/* Recent activity */}
      {data.recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusDot status={item.status} />
                    <span className="truncate text-zinc-300">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {item.status}
                    </Badge>
                    {item.updatedAt && (
                      <span className="text-[10px] text-zinc-600">
                        {formatRelative(item.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
type Accent = "emerald" | "blue" | "amber" | "red" | "violet" | "zinc";

const accentColors: Record<Accent, string> = {
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  red: "text-red-400",
  violet: "text-violet-400",
  zinc: "text-zinc-400",
};

const accentBg: Record<Accent, string> = {
  emerald: "bg-emerald-500/10",
  blue: "bg-blue-500/10",
  amber: "bg-amber-500/10",
  red: "bg-red-500/10",
  violet: "bg-violet-500/10",
  zinc: "bg-zinc-500/10",
};

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 p-3 sm:p-4 ring-1 ring-white/[0.06]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <div className={cn("flex size-7 items-center justify-center rounded-lg", accentBg[accent])}>
          <Icon className={cn("size-3.5", accentColors[accent])} />
        </div>
      </div>
      <p className={cn("mt-1.5 sm:mt-2 text-lg sm:text-xl font-semibold", accentColors[accent])}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
    </div>
  );
}

function ActionCard({
  title,
  icon: Icon,
  accent,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={cn("size-4", accentColors[accent])} />
          {title}
          <Badge variant="outline" className="text-[10px] ml-auto">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">{children}</div>
      </CardContent>
    </Card>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 sm:py-1.5 hover:bg-zinc-800/50 min-h-[44px] sm:min-h-0">
      {children}
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
      <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3.5 sm:py-3 ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] hover:bg-zinc-800/50 min-h-[44px]">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">{label}</span>
        </div>
        <ArrowRight className="size-3.5 text-zinc-600" />
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
    <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOTS[status] ?? "bg-zinc-500")} />
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
