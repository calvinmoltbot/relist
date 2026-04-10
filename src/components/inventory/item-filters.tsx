"use client";

import { useState } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { ItemStatus, SortBy } from "@/lib/inventory-store";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Status tabs
// ---------------------------------------------------------------------------
const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sourced", label: "Sourced" },
  { value: "listed", label: "Listed" },
  { value: "sold", label: "Sold" },
  { value: "shipped", label: "Shipped" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "date", label: "Date added" },
  { value: "price", label: "Price" },
  { value: "brand", label: "Brand" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface ItemFiltersProps {
  status: ItemStatus;
  search: string;
  sortBy: SortBy;
  onStatusChange: (status: ItemStatus) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: SortBy) => void;
  itemCounts: Record<string, number>;
}

export function ItemFilters({
  status,
  search,
  sortBy,
  onStatusChange,
  onSearchChange,
  onSortChange,
  itemCounts,
}: ItemFiltersProps) {
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Search + sort row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search by name or brand..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 bg-zinc-900 pl-8 text-sm placeholder:text-zinc-600"
          />
        </div>

        {/* Sort dropdown — controlled open state, no render prop */}
        <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-zinc-400"
            onClick={() => setSortOpen(true)}
          >
            <ArrowUpDown className="size-3" />
            <span className="hidden sm:inline">
              {SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? "Sort"}
            </span>
          </Button>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => {
                  onSortChange(opt.value);
                  setSortOpen(false);
                }}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {STATUSES.map((s) => {
          const count = s.value === "all"
            ? itemCounts.total ?? 0
            : itemCounts[s.value] ?? 0;
          return (
            <button
              key={s.value}
              onClick={() => onStatusChange(s.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                status === s.value
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
              )}
            >
              {s.label}
              <span
                className={cn(
                  "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px]",
                  status === s.value
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-zinc-800/60 text-zinc-600",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
