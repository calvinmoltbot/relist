"use client";

import { AlertTriangle, Clock, TrendingDown, Package } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface InventoryHealthData {
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
}

const BUCKET_LABELS: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  "0-3": { label: "Just listed", color: "bg-emerald-500", bgColor: "text-emerald-400" },
  "4-7": { label: "This week", color: "bg-lime-500", bgColor: "text-lime-400" },
  "8-14": { label: "2 weeks", color: "bg-amber-500", bgColor: "text-amber-400" },
  "15-21": { label: "Over 2 weeks", color: "bg-orange-500", bgColor: "text-orange-400" },
  "22+": { label: "Really stale", color: "bg-red-500", bgColor: "text-red-400" },
};

// ---------------------------------------------------------------------------
// Freshness — the 4 key metrics at the top of the Health page.
// ---------------------------------------------------------------------------
export function FreshnessStats({
  data,
  sellThroughRate,
  avgDaysToSell,
}: {
  data: InventoryHealthData;
  sellThroughRate: number;
  avgDaysToSell: number | null;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-zinc-100">Freshness</CardTitle>
        <CardDescription className="text-zinc-400">
          Headline numbers for your active inventory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat
            label="Unsold Items"
            value={String(data.totalUnsold)}
            icon={Package}
          />
          <MiniStat
            label="Sell-Through Rate"
            value={`${sellThroughRate.toFixed(1)}%`}
            icon={TrendingDown}
            accent={
              sellThroughRate >= 50
                ? "emerald"
                : sellThroughRate >= 30
                  ? "amber"
                  : "red"
            }
          />
          <MiniStat
            label="Avg Days to Sell"
            value={avgDaysToSell != null ? `${avgDaysToSell.toFixed(0)}d` : "—"}
            icon={Clock}
          />
          <MiniStat
            label="Stale (15+ days)"
            value={`£${data.stockAtRisk.toFixed(0)}`}
            icon={AlertTriangle}
            accent={data.stockAtRisk > 0 ? "red" : "emerald"}
            title="Total listed value of items unsold for more than 2 weeks — the best candidates for reprice or relist."
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inventory Aging — stacked bar + per-bucket legend.
// ---------------------------------------------------------------------------
export function AgingChart({ data }: { data: InventoryHealthData }) {
  const totalItems = Object.values(data.agingBuckets).reduce((a, b) => a + b, 0);

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-zinc-100">
          Inventory Aging
        </CardTitle>
        <CardDescription className="text-zinc-400">
          How long your unsold items have been listed. Aim to keep everything in the left-hand bands.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalItems === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-300">
            No unsold inventory to analyse
          </p>
        ) : (
          <>
            <div className="mb-4 flex h-8 overflow-hidden rounded-lg bg-zinc-800">
              {Object.entries(data.agingBuckets).map(([bucket, count]) => {
                if (count === 0) return null;
                const pct = (count / totalItems) * 100;
                const meta = BUCKET_LABELS[bucket];
                return (
                  <div
                    key={bucket}
                    className={cn(
                      "flex items-center justify-center text-[10px] font-medium text-white transition-all",
                      meta.color,
                    )}
                    style={{ width: `${pct}%` }}
                    title={`${meta.label}: ${count} items`}
                  >
                    {pct >= 10 ? count : ""}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(data.agingBuckets).map(([bucket, count]) => {
                const meta = BUCKET_LABELS[bucket];
                const value = data.agingValues[bucket] ?? 0;
                return (
                  <div key={bucket} className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2.5 rounded-full", meta.color)} />
                      <span className="text-xs text-zinc-400">{meta.label}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-zinc-200">
                      {count} items
                    </p>
                    <p className="text-xs text-zinc-300">£{value.toFixed(0)} value</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dead Stock — items past the user's refresh threshold.
// ---------------------------------------------------------------------------
export function DeadStockCard({ data }: { data: InventoryHealthData }) {
  if (data.deadStock.length === 0) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">Dead Stock</CardTitle>
          <CardDescription className="text-zinc-400">
            Items past your refresh threshold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-emerald-300">
            Nothing is past your refresh threshold — nice work.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base text-zinc-100">Dead Stock</CardTitle>
          <Badge
            variant="secondary"
            className="bg-red-500/10 px-1.5 py-0 text-[10px] text-red-400"
          >
            {data.deadStock.length} items
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          Items past your refresh threshold — consider repricing or relisting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {data.deadStock.slice(0, 15).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-zinc-800/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-zinc-200">{item.name}</p>
                {item.brand && (
                  <p className="text-xs text-zinc-300">{item.brand}</p>
                )}
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-3">
                <span className="text-xs text-zinc-400">
                  £{item.listedPrice.toFixed(0)}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "px-1.5 py-0 text-[10px]",
                    item.daysListed >= 22
                      ? "bg-red-500/10 text-red-400"
                      : item.daysListed >= 15
                        ? "bg-orange-500/10 text-orange-400"
                        : "bg-amber-500/10 text-amber-400",
                  )}
                >
                  {item.daysListed}d
                </Badge>
              </div>
            </div>
          ))}
          {data.deadStock.length > 15 && (
            <p className="pt-2 text-center text-xs text-zinc-300">
              + {data.deadStock.length - 15} more items
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mini stat tile
// ---------------------------------------------------------------------------
function MiniStat({
  label,
  value,
  icon: Icon,
  accent = "zinc",
  title,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "emerald" | "amber" | "red" | "zinc";
  title?: string;
}) {
  const accentColors = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    zinc: "text-zinc-300",
  };

  return (
    <div
      title={title}
      className="rounded-xl bg-zinc-900 px-3 py-2.5 ring-1 ring-white/[0.06] sm:px-4 sm:py-3"
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-3 text-zinc-300" />
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-300 sm:text-[11px]">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-1 text-base font-semibold sm:text-lg",
          accentColors[accent],
        )}
      >
        {value}
      </p>
    </div>
  );
}
