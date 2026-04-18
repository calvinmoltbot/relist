"use client";

import { useState } from "react";
import { Package, ChevronDown, Pencil, Trash2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { InventoryItem } from "@/lib/inventory-store";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  sourced: {
    label: "Sourced",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  },
  listed: {
    label: "Listed",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  },
  sold: {
    label: "Sold",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  shipped: {
    label: "Shipped",
    className: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  },
};

const STATUS_ORDER: string[] = ["sourced", "listed", "sold", "shipped"];

// ---------------------------------------------------------------------------
// ItemCard
// ---------------------------------------------------------------------------
interface ItemCardProps {
  item: InventoryItem;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export function ItemCard({ item, onStatusChange, onEdit, onDelete }: ItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.sourced;
  const cost = item.costPrice ? parseFloat(item.costPrice) : null;
  const listed = item.listedPrice ? parseFloat(item.listedPrice) : null;
  const sold = item.soldPrice ? parseFloat(item.soldPrice) : null;
  const profit = sold != null && cost != null ? sold - cost : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12]">
      {/* Photo area */}
      <div className="relative flex h-40 items-center justify-center bg-zinc-800/50 overflow-hidden">
        {item.thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="size-10 text-zinc-400" />
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="outline"
            className={cn("text-[11px] font-medium", statusCfg.className)}
          >
            {statusCfg.label}
          </Badge>
        </div>
        {/* Category badge */}
        {item.category && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[11px] bg-zinc-700/80 text-zinc-300">
              {item.category}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Name + brand */}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-zinc-100">
            {item.name}
          </h3>
          {item.brand && (
            <p className="truncate text-xs text-zinc-400">{item.brand}</p>
          )}
        </div>

        {/* Price row — includes profit chip when sold */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {cost != null && (
            <span className="text-zinc-300">{"\u00A3"}{cost.toFixed(2)}</span>
          )}
          {listed != null && sold == null && (
            <>
              <ArrowRight className="size-3 text-zinc-400" />
              <span className="text-blue-400">{"\u00A3"}{listed.toFixed(2)}</span>
            </>
          )}
          {sold != null && (
            <>
              <ArrowRight className="size-3 text-zinc-400" />
              <span className="text-emerald-400">{"\u00A3"}{sold.toFixed(2)}</span>
            </>
          )}
          {profit != null && (
            <span
              className={cn(
                "ml-auto shrink-0 font-medium tabular-nums",
                profit >= 0 ? "text-emerald-400" : "text-red-400",
              )}
            >
              {profit >= 0 ? "+" : ""}{"\u00A3"}{profit.toFixed(2)}
            </span>
          )}
        </div>

        {/* Size */}
        {item.size && (
          <p className="text-[11px] text-zinc-300">Size: {item.size}</p>
        )}
      </div>

      {/* Actions footer */}
      <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2">
        {/* Quick status change — controlled open state, no render prop */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <Button
            variant="ghost"
            size="xs"
            className="gap-1 text-zinc-400 hover:text-zinc-200"
            onClick={() => setMenuOpen(true)}
          >
            {statusCfg.label}
            <ChevronDown className="size-3" />
          </Button>
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Change status</DropdownMenuLabel>
              {STATUS_ORDER.map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <DropdownMenuItem
                    key={s}
                    disabled={s === item.status}
                    onSelect={() => {
                      onStatusChange(item.id, s);
                      setMenuOpen(false);
                    }}
                  >
                    <span className={cn("size-2 rounded-full", cfg.className.split(" ")[1])} />
                    {cfg.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-zinc-300 hover:text-zinc-200"
            onClick={() => onEdit(item)}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-zinc-300 hover:text-red-400"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
