"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/lib/inventory-store";

// ---------------------------------------------------------------------------
// Status config (matches item-card.tsx)
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
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

// ---------------------------------------------------------------------------
// Inline editable cell
// ---------------------------------------------------------------------------
function InlineEditCell({
  value,
  onSave,
  type = "text",
  prefix,
  placeholder,
  className,
}: {
  value: string;
  onSave: (val: string) => void;
  type?: "text" | "number" | "date";
  prefix?: string;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // Sync external value changes
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  }, [draft, value, onSave]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "w-full text-left rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-zinc-800 cursor-text",
          className,
        )}
      >
        {value ? (
          <>
            {prefix}
            {value}
          </>
        ) : (
          <span className="text-zinc-400">{placeholder ?? "\u2014"}</span>
        )}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="w-full rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-100 outline-none ring-1 ring-blue-500/40 focus:ring-blue-500/60"
      step={type === "number" ? "0.01" : undefined}
    />
  );
}

// ---------------------------------------------------------------------------
// InventoryTable
// ---------------------------------------------------------------------------
interface InventoryTableProps {
  items: InventoryItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onInlineEdit: (id: string, field: string, value: string) => void;
  onEdit: (item: InventoryItem) => void;
}

export function InventoryTable({
  items,
  selectedIds,
  onSelectionChange,
  onInlineEdit,
  onEdit,
}: InventoryTableProps) {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = items.some((i) => selectedIds.has(i.id)) && !allSelected;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map((i) => i.id)));
    }
  }, [allSelected, items, onSelectionChange]);

  const toggleOne = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-zinc-900 ring-1 ring-white/[0.06]">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-[11px] font-medium uppercase tracking-wider text-zinc-300">
            <th className="sticky top-0 z-10 w-10 border-b border-white/[0.06] bg-zinc-900 px-3 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="size-3.5 rounded border-zinc-600 bg-zinc-800 accent-blue-500 cursor-pointer"
              />
            </th>
            <th className="sticky top-0 z-10 min-w-[200px] border-b border-white/[0.06] bg-zinc-900 px-3 py-2.5">Item</th>
            <th className="sticky top-0 z-10 w-24 border-b border-white/[0.06] bg-zinc-900 px-3 py-2.5">Status</th>
            <th className="sticky top-0 z-10 w-24 border-b border-white/[0.06] bg-zinc-900 px-3 py-2.5">Cost</th>
            <th className="sticky top-0 z-10 w-24 border-b border-white/[0.06] bg-zinc-900 px-3 py-2.5">Listed</th>
            <th className="sticky top-0 z-10 w-24 border-b border-white/[0.06] bg-zinc-900 px-3 py-2.5">Sold</th>
            <th className="sticky top-0 z-10 w-28 border-b border-white/[0.06] bg-zinc-900 px-3 py-2.5">Sold Date</th>
            <th className="sticky top-0 z-10 w-24 border-b border-white/[0.06] bg-zinc-900 px-3 py-2.5">Profit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const cost = item.costPrice ? parseFloat(item.costPrice) : null;
            const sold = item.soldPrice ? parseFloat(item.soldPrice) : null;
            const profit = sold != null && cost != null ? sold - cost : null;
            const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.sourced;

            // Format soldAt for date input
            const soldAtDisplay = item.soldAt
              ? new Date(item.soldAt).toISOString().split("T")[0]
              : "";

            return (
              <tr
                key={item.id}
                className={cn(
                  "border-b border-white/[0.04] transition-colors hover:bg-zinc-800/50",
                  isSelected && "bg-blue-500/[0.04]",
                )}
              >
                {/* Checkbox */}
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(item.id)}
                    className="size-3.5 rounded border-zinc-600 bg-zinc-800 accent-blue-500 cursor-pointer"
                  />
                </td>

                {/* Item name + subtitle */}
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="group/item flex items-center gap-2.5 text-left"
                  >
                    {/* Thumbnail */}
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 overflow-hidden">
                      {item.thumbnailUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-3.5 text-zinc-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-zinc-200 group-hover/item:text-zinc-100">
                        {item.name}
                      </p>
                      <p className="truncate text-[11px] text-zinc-300">
                        {[item.brand, item.size, item.category]
                          .filter(Boolean)
                          .join(" \u00B7 ")}
                      </p>
                    </div>
                  </button>
                </td>

                {/* Status */}
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[11px] font-medium", statusCfg.className)}
                  >
                    {statusCfg.label}
                  </Badge>
                </td>

                {/* Cost — editable */}
                <td className="px-3 py-2">
                  <InlineEditCell
                    value={item.costPrice ?? ""}
                    onSave={(val) => onInlineEdit(item.id, "costPrice", val)}
                    type="number"
                    prefix={"\u00A3"}
                    placeholder={"\u2014"}
                    className="text-zinc-400"
                  />
                </td>

                {/* Listed price */}
                <td className="px-3 py-2 text-blue-400">
                  {item.listedPrice ? (
                    <span className="px-1.5 py-0.5">{"\u00A3"}{parseFloat(item.listedPrice).toFixed(2)}</span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-zinc-400">{"\u2014"}</span>
                  )}
                </td>

                {/* Sold price — editable */}
                <td className="px-3 py-2">
                  <InlineEditCell
                    value={item.soldPrice ?? ""}
                    onSave={(val) => onInlineEdit(item.id, "soldPrice", val)}
                    type="number"
                    prefix={"\u00A3"}
                    placeholder={"\u2014"}
                    className="text-emerald-400"
                  />
                </td>

                {/* Sold date — editable */}
                <td className="px-3 py-2">
                  <InlineEditCell
                    value={soldAtDisplay}
                    onSave={(val) => onInlineEdit(item.id, "soldAt", val)}
                    type="date"
                    className="text-zinc-400"
                  />
                </td>

                {/* Profit */}
                <td className="px-3 py-2">
                  {profit != null ? (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-xs font-medium",
                        profit >= 0 ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      {profit >= 0 ? "+" : ""}{"\u00A3"}{profit.toFixed(2)}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-zinc-400">{"\u2014"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-zinc-300">
          No items match your filters
        </div>
      )}
    </div>
  );
}
