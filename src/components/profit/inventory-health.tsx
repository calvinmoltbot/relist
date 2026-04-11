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

interface InventoryHealthData {
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

interface InventoryHealthProps {
  data: InventoryHealthData;
  sellThroughRate: number;
  avgDaysToSell: number | null;
}

const BUCKET_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  "0-30": { label: "0–30 days", color: "bg-emerald-500", bgColor: "text-emerald-400" },
  "31-60": { label: "31–60 days", color: "bg-amber-500", bgColor: "text-amber-400" },
  "61-90": { label: "61–90 days", color: "bg-orange-500", bgColor: "text-orange-400" },
  "90+": { label: "90+ days", color: "bg-red-500", bgColor: "text-red-400" },
};

export function InventoryHealth({ data, sellThroughRate, avgDaysToSell }: InventoryHealthProps) {
  const totalItems = Object.values(data.agingBuckets).reduce((a, b) => a + b, 0);
  const totalValue = Object.values(data.agingValues).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Unsold Items"
          value={String(data.totalUnsold)}
          icon={Package}
        />
        <MiniStat
          label="Sell-Through Rate"
          value={`${sellThroughRate.toFixed(1)}%`}
          icon={TrendingDown}
          accent={sellThroughRate >= 50 ? "emerald" : sellThroughRate >= 30 ? "amber" : "red"}
        />
        <MiniStat
          label="Avg Days to Sell"
          value={avgDaysToSell != null ? `${avgDaysToSell.toFixed(0)}d` : "—"}
          icon={Clock}
        />
        <MiniStat
          label="Stock at Risk"
          value={`£${data.stockAtRisk.toFixed(0)}`}
          icon={AlertTriangle}
          accent={data.stockAtRisk > 0 ? "red" : "emerald"}
        />
      </div>

      {/* Aging chart */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Inventory Aging</CardTitle>
          <CardDescription>
            How long your unsold items have been listed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">
              No unsold inventory to analyse
            </p>
          ) : (
            <>
              {/* Stacked bar */}
              <div className="mb-4 flex h-8 overflow-hidden rounded-lg bg-zinc-800">
                {Object.entries(data.agingBuckets).map(([bucket, count]) => {
                  if (count === 0) return null;
                  const pct = (count / totalItems) * 100;
                  const meta = BUCKET_LABELS[bucket];
                  return (
                    <div
                      key={bucket}
                      className={cn("flex items-center justify-center text-[10px] font-medium text-white transition-all", meta.color)}
                      style={{ width: `${pct}%` }}
                      title={`${meta.label}: ${count} items`}
                    >
                      {pct >= 10 ? count : ""}
                    </div>
                  );
                })}
              </div>

              {/* Legend + details */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                      <p className="text-xs text-zinc-500">£{value.toFixed(0)} value</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dead stock list */}
      {data.deadStock.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Dead Stock</CardTitle>
              <Badge variant="secondary" className="bg-red-500/10 text-red-400 text-[10px] px-1.5 py-0">
                {data.deadStock.length} items
              </Badge>
            </div>
            <CardDescription>
              Items listed for 60+ days — consider repricing or delisting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.deadStock.slice(0, 15).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-zinc-800/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-zinc-200">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-zinc-500">{item.brand}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-zinc-400">
                      £{item.listedPrice.toFixed(0)}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        item.daysListed >= 90
                          ? "bg-red-500/10 text-red-400"
                          : "bg-orange-500/10 text-orange-400"
                      )}
                    >
                      {item.daysListed}d
                    </Badge>
                  </div>
                </div>
              ))}
              {data.deadStock.length > 15 && (
                <p className="pt-2 text-center text-xs text-zinc-500">
                  + {data.deadStock.length - 15} more items
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini stat card
// ---------------------------------------------------------------------------
function MiniStat({
  label,
  value,
  icon: Icon,
  accent = "zinc",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "emerald" | "amber" | "red" | "zinc";
}) {
  const accentColors = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    zinc: "text-zinc-300",
  };

  return (
    <div className="rounded-xl bg-zinc-900 px-3 py-2.5 sm:px-4 sm:py-3 ring-1 ring-white/[0.06]">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3 text-zinc-500" />
        <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
      </div>
      <p className={cn("mt-1 text-base sm:text-lg font-semibold", accentColors[accent])}>
        {value}
      </p>
    </div>
  );
}
