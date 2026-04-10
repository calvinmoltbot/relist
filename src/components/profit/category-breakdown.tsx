"use client";

import { cn } from "@/lib/utils";

interface CategoryData {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

export function CategoryBreakdown({ data }: { data: CategoryData[] }) {
  const maxProfit = Math.max(...data.map((d) => Math.abs(d.profit)), 1);

  return (
    <div className="space-y-3">
      {data.map((row) => {
        const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
        const barWidth = (Math.abs(row.profit) / maxProfit) * 100;

        return (
          <div key={row.category} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize text-zinc-200">
                {row.category}
              </span>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>{row.count} sold</span>
                <span className={cn(margin >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {margin.toFixed(0)}% margin
                </span>
                <span className={cn("font-medium", row.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {"\u00A3"}{row.profit.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  row.profit >= 0 ? "bg-emerald-500/60" : "bg-red-500/60",
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
