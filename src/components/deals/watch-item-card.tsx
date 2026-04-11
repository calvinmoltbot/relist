"use client";

import { useState } from "react";
import {
  Clock,
  TrendingUp,
  ExternalLink,
  ShoppingBag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConvertDialog } from "./convert-dialog";

export interface WatchItemData {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  condition: string | null;
  currentPrice: string | null;
  estimatedResale: string | null;
  estimatedMarginPct: string | null;
  photoUrl: string | null;
  vintedUrl: string;
  status: string;
  createdAt: string;
}

function daysAgo(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function marginColor(pct: number): string {
  if (pct >= 30) return "text-emerald-400 bg-emerald-400/10";
  if (pct >= 15) return "text-amber-400 bg-amber-400/10";
  return "text-red-400 bg-red-400/10";
}

export function WatchItemCard({
  item,
  onConvert,
  onPass,
}: {
  item: WatchItemData;
  onConvert: (id: string, buyPrice: number) => void;
  onPass: (id: string) => void;
}) {
  const [convertOpen, setConvertOpen] = useState(false);
  const margin = item.estimatedMarginPct
    ? Math.round(Number(item.estimatedMarginPct))
    : null;
  const days = daysAgo(item.createdAt);

  return (
    <>
      <div className="rounded-xl bg-zinc-900/60 hover:bg-zinc-800/50 transition-colors overflow-hidden group">
        {/* Photo */}
        <div className="aspect-square bg-zinc-800 relative overflow-hidden">
          {item.photoUrl ? (
            <img
              src={item.photoUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              <ShoppingBag className="size-8" />
            </div>
          )}
          {margin !== null && (
            <span
              className={cn(
                "absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-lg",
                marginColor(margin),
              )}
            >
              {margin > 0 ? "+" : ""}{margin}%
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 mb-1">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
            {item.brand && <span>{item.brand}</span>}
            {item.size && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-zinc-600" />
                <span>{item.size}</span>
              </>
            )}
          </div>

          {/* Prices */}
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-lg font-bold text-white">
                £{Number(item.currentPrice ?? 0).toFixed(0)}
              </span>
              <span className="text-xs text-zinc-500 ml-1">listed</span>
            </div>
            {item.estimatedResale && (
              <div className="text-right">
                <span className="text-sm font-semibold text-emerald-400">
                  £{Number(item.estimatedResale).toFixed(0)}
                </span>
                <span className="text-xs text-zinc-500 ml-1">resale est.</span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-zinc-500 mb-4">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {days}d watching
            </span>
            {item.condition && <span>{item.condition}</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setConvertOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
            >
              <ShoppingBag className="size-3" />
              Bought it
            </button>
            <button
              onClick={() => onPass(item.id)}
              className="flex items-center justify-center px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-semibold hover:bg-zinc-700 transition-colors"
            >
              <X className="size-3" />
              Pass
            </button>
            <a
              href={item.vintedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-colors"
            >
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>

      <ConvertDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        itemTitle={item.title}
        suggestedPrice={item.currentPrice ? Number(item.currentPrice) : 0}
        onConfirm={(price) => {
          onConvert(item.id, price);
          setConvertOpen(false);
        }}
      />
    </>
  );
}
