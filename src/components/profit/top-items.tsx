"use client";

import { cn } from "@/lib/utils";

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

export function TopItems({ data }: { data: ItemProfit[] }) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        <div className="col-span-5">Item</div>
        <div className="col-span-2 text-right">Cost</div>
        <div className="col-span-2 text-right">Sold</div>
        <div className="col-span-3 text-right">Profit</div>
      </div>

      {/* Rows */}
      {data.map((item) => {
        const margin = item.sold > 0 ? (item.profit / item.sold) * 100 : 0;

        return (
          <div
            key={item.id}
            className="grid grid-cols-12 gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-zinc-800/50"
          >
            <div className="col-span-5 min-w-0">
              <p className="truncate font-medium text-zinc-200">{item.name}</p>
              <p className="truncate text-xs text-zinc-500">
                {[item.brand, item.category].filter(Boolean).join(" \u00B7 ")}
              </p>
            </div>
            <div className="col-span-2 flex items-center justify-end text-zinc-400">
              {"\u00A3"}{item.cost.toFixed(2)}
            </div>
            <div className="col-span-2 flex items-center justify-end text-zinc-300">
              {"\u00A3"}{item.sold.toFixed(2)}
            </div>
            <div className="col-span-3 flex items-center justify-end gap-2">
              <span
                className={cn(
                  "font-medium",
                  item.profit >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {item.profit >= 0 ? "+" : ""}{"\u00A3"}{item.profit.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500">
                {margin.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
