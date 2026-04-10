"use client";

import { cn } from "@/lib/utils";

interface SourceData {
  source: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

const SOURCE_LABELS: Record<string, string> = {
  charity_shop: "Charity shop",
  car_boot: "Car boot",
  online: "Online",
  other: "Other",
  unknown: "Unknown",
};

export function SourceBreakdown({ data }: { data: SourceData[] }) {
  const maxProfit = Math.max(...data.map((d) => Math.abs(d.profit)), 1);

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
        const avgProfit = row.count > 0 ? row.profit / row.count : 0;
        const barWidth = (Math.abs(row.profit) / maxProfit) * 100;

        return (
          <div key={row.source} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-200">
                {SOURCE_LABELS[row.source] ?? row.source}
              </span>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>{row.count} sold</span>
                <span>{"\u00A3"}{avgProfit.toFixed(2)}/item</span>
                <span className={cn("font-medium", row.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {"\u00A3"}{row.profit.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  row.profit >= 0 ? "bg-blue-500/60" : "bg-red-500/60",
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
