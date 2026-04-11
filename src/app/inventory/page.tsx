"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { Package, LayoutGrid, List, Upload, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useInventoryStore } from "@/lib/inventory-store";
import type { InventoryItem } from "@/lib/inventory-store";
import { ItemCard } from "@/components/inventory/item-card";
import { ItemFilters } from "@/components/inventory/item-filters";
import { AddItemDialog } from "@/components/inventory/add-item-dialog";
import { EditItemDialog } from "@/components/inventory/edit-item-dialog";
import { ImportButton } from "@/components/inventory/import-button";

// ---------------------------------------------------------------------------
// Inventory Page
// ---------------------------------------------------------------------------
export default function InventoryPage() {
  const {
    items,
    loading,
    filters,
    fetchItems,
    addItem,
    updateItem,
    deleteItem,
    setFilters,
  } = useInventoryStore();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [bulkDateOpen, setBulkDateOpen] = useState(false);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchItems();
  }, [fetchItems, filters]);

  // ---------------------------------------------------------------------------
  // Computed stats
  // ---------------------------------------------------------------------------
  const stats = useMemo(() => {
    const all = items;
    const totalCost = all.reduce(
      (sum, i) => sum + (i.costPrice ? parseFloat(i.costPrice) : 0),
      0,
    );
    const totalListed = all
      .filter((i) => i.listedPrice)
      .reduce((sum, i) => sum + parseFloat(i.listedPrice!), 0);
    const sourced = all.filter((i) => i.status === "sourced").length;
    const listed = all.filter((i) => i.status === "listed").length;
    const sold = all.filter((i) => i.status === "sold").length;
    const shipped = all.filter((i) => i.status === "shipped").length;

    return { total: all.length, totalCost, totalListed, sourced, listed, sold, shipped };
  }, [items]);

  const itemCounts = useMemo(
    () => ({
      total: stats.total,
      sourced: stats.sourced,
      listed: stats.listed,
      sold: stats.sold,
      shipped: stats.shipped,
    }),
    [stats],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleStatusChange = useCallback(
    (id: string, status: string) => {
      updateItem(id, { status } as Partial<InventoryItem>);
    },
    [updateItem],
  );

  const handleEdit = useCallback((item: InventoryItem) => {
    setEditItem(item);
    setEditOpen(true);
  }, []);

  const handleEditSave = useCallback(
    (id: string, data: Partial<InventoryItem>) => {
      updateItem(id, data);
    },
    [updateItem],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteItem(id);
    },
    [deleteItem],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Inventory</h1>
          <p className="text-sm text-zinc-500">
            Track your items from source to sale
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg bg-zinc-900 p-0.5 ring-1 ring-white/[0.06]">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <List className="size-3.5" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkDateOpen(true)}
            className="gap-1.5"
          >
            <CalendarDays className="size-3.5" />
            <span className="hidden sm:inline">Bulk Dates</span>
          </Button>
          <ImportButton onImported={fetchItems} />
          <AddItemDialog onAdd={addItem} />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total items" value={stats.total} />
        <StatCard
          label="Stock value"
          value={`\u00A3${stats.totalCost.toFixed(2)}`}
        />
        <StatCard
          label="Listed value"
          value={`\u00A3${stats.totalListed.toFixed(2)}`}
        />
        <StatCard
          label="Sold"
          value={stats.sold + stats.shipped}
          suffix="items"
        />
      </div>

      {/* Filters */}
      <ItemFilters
        status={filters.status}
        search={filters.search}
        sortBy={filters.sortBy}
        onStatusChange={(s) => setFilters({ status: s })}
        onSearchChange={(s) => setFilters({ search: s })}
        onSortChange={(s) => setFilters({ sortBy: s })}
        itemCounts={itemCounts}
      />

      {/* Item grid / list */}
      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <div className="size-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
          <p className="mt-3 text-sm">Loading inventory...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-white/[0.06]">
            <Package className="size-7 text-zinc-600" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-zinc-300">
            No items yet
          </h3>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            Add your first item to start tracking your inventory from source to
            sale.
          </p>
          <AddItemDialog onAdd={addItem} label="Add your first item" />
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <ListRow
              key={item.id}
              item={item}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <EditItemDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEditSave}
      />

      {/* Bulk date update dialog */}
      <BulkDateDialog
        open={bulkDateOpen}
        onOpenChange={setBulkDateOpen}
        items={items}
        onDone={fetchItems}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 px-4 py-3 ring-1 ring-white/[0.06]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-zinc-100">
        {value}
        {suffix && (
          <span className="ml-1 text-xs font-normal text-zinc-500">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk date update dialog
// ---------------------------------------------------------------------------
function BulkDateDialog({
  open,
  onOpenChange,
  items,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  onDone: () => void;
}) {
  const [date, setDate] = useState("");
  const [scope, setScope] = useState<"all_sold" | "no_date">("all_sold");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const soldItems = items.filter(
    (i) => i.status === "sold" || i.status === "shipped"
  );
  const noDateItems = soldItems.filter((i) => !i.soldAt);

  const targetItems = scope === "no_date" ? noDateItems : soldItems;

  async function handleApply() {
    if (!date || targetItems.length === 0) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/inventory/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: targetItems.map((i) => i.id),
          updates: { soldAt: date },
        }),
      });
      const data = await res.json();
      setResult(`Updated ${data.updated} items`);
      onDone();
    } catch {
      setResult("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Update Sold Date</DialogTitle>
          <DialogDescription>
            Set the sold date for multiple items at once. Useful for imported items that are all showing the wrong date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label>Which items?</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope("all_sold")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  scope === "all_sold"
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                All sold/shipped ({soldItems.length})
              </button>
              <button
                type="button"
                onClick={() => setScope("no_date")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  scope === "no_date"
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                Missing date only ({noDateItems.length})
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-date">Set sold date to</Label>
            <Input
              id="bulk-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-900 max-w-[200px]"
            />
          </div>

          {targetItems.length > 0 && date && (
            <p className="text-xs text-zinc-500">
              This will update <span className="text-zinc-300 font-medium">{targetItems.length}</span> items
              to <span className="text-zinc-300 font-medium">{date}</span>
            </p>
          )}

          {result && (
            <p className="text-xs text-emerald-400">{result}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleApply}
            disabled={!date || targetItems.length === 0 || saving}
          >
            {saving ? "Updating..." : `Update ${targetItems.length} items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// List row (compact view)
// ---------------------------------------------------------------------------
const STATUS_COLORS: Record<string, string> = {
  sourced: "bg-amber-400",
  listed: "bg-blue-400",
  sold: "bg-emerald-400",
  shipped: "bg-violet-400",
};

function ListRow({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const cost = item.costPrice ? parseFloat(item.costPrice) : null;
  const listed = item.listedPrice ? parseFloat(item.listedPrice) : null;
  const sold = item.soldPrice ? parseFloat(item.soldPrice) : null;

  return (
    <div
      className="flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.12] cursor-pointer"
      onClick={() => onEdit(item)}
    >
      {/* Status dot */}
      <span
        className={`size-2 shrink-0 rounded-full ${STATUS_COLORS[item.status] ?? "bg-zinc-500"}`}
      />

      {/* Photo placeholder */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
        <Package className="size-4 text-zinc-600" />
      </div>

      {/* Name + brand */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">
          {item.name}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {[item.brand, item.category, item.size].filter(Boolean).join(" \u00B7 ")}
        </p>
      </div>

      {/* Prices */}
      <div className="hidden text-right text-xs sm:block">
        {cost != null && (
          <span className="text-zinc-500">{"\u00A3"}{cost.toFixed(2)}</span>
        )}
        {listed != null && (
          <span className="ml-2 text-blue-400">{"\u00A3"}{listed.toFixed(2)}</span>
        )}
        {sold != null && (
          <span className="ml-2 text-emerald-400">{"\u00A3"}{sold.toFixed(2)}</span>
        )}
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-zinc-600 hover:text-red-400"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
      >
        <span className="sr-only">Delete</span>
        &times;
      </Button>
    </div>
  );
}
