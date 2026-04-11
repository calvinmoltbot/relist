"use client";

import { useState, useCallback } from "react";
import {
  Truck,
  ShoppingBag,
  CalendarDays,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BulkActionBarProps {
  selectedCount: number;
  onMarkShipped: () => Promise<void>;
  onMarkSold: (date: string, soldPrice?: string) => Promise<void>;
  onSetDate: (field: "soldAt" | "shippedAt", date: string) => Promise<void>;
  onSetPrice: (price: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
}

// ---------------------------------------------------------------------------
// BulkActionBar
// ---------------------------------------------------------------------------
export function BulkActionBar({
  selectedCount,
  onMarkShipped,
  onMarkSold,
  onSetDate,
  onSetPrice,
  onDelete,
  onClearSelection,
}: BulkActionBarProps) {
  const [soldDialogOpen, setSoldDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mark sold state
  const [soldDate, setSoldDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [soldPrice, setSoldPrice] = useState("");

  // Set date state
  const [dateField, setDateField] = useState<"soldAt" | "shippedAt">("soldAt");
  const [dateValue, setDateValue] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Set price state
  const [priceValue, setPriceValue] = useState("");

  const withLoading = useCallback(
    async (fn: () => Promise<void>) => {
      setLoading(true);
      try {
        await fn();
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl bg-blue-500/[0.08] px-4 py-2.5 ring-1 ring-blue-500/20">
        {/* Count + clear */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-400">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-md p-0.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-white/[0.08]" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-zinc-400 hover:text-zinc-200"
            onClick={() =>
              withLoading(async () => {
                await onMarkShipped();
              })
            }
            disabled={loading}
          >
            <Truck className="size-3.5" />
            Mark Shipped
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-zinc-400 hover:text-zinc-200"
            onClick={() => setSoldDialogOpen(true)}
            disabled={loading}
          >
            <ShoppingBag className="size-3.5" />
            Mark Sold
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-zinc-400 hover:text-zinc-200"
            onClick={() => setDateDialogOpen(true)}
            disabled={loading}
          >
            <CalendarDays className="size-3.5" />
            Set Date
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-zinc-400 hover:text-zinc-200"
            onClick={() => setPriceDialogOpen(true)}
            disabled={loading}
          >
            <Tag className="size-3.5" />
            Set Price
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-red-400/70 hover:text-red-400"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* ---------- Mark Sold Dialog ---------- */}
      <Dialog open={soldDialogOpen} onOpenChange={setSoldDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Sold</DialogTitle>
            <DialogDescription>
              Set the sold date and optionally the sold price for{" "}
              {selectedCount} item{selectedCount > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-sold-date">Sold date</Label>
              <Input
                id="bulk-sold-date"
                type="date"
                value={soldDate}
                onChange={(e) => setSoldDate(e.target.value)}
                className="max-w-[200px] bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-sold-price">
                Sold price{" "}
                <span className="text-zinc-500 font-normal">(optional)</span>
              </Label>
              <Input
                id="bulk-sold-price"
                type="number"
                step="0.01"
                placeholder="e.g. 25.00"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                className="max-w-[200px] bg-zinc-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!soldDate || loading}
              onClick={() =>
                withLoading(async () => {
                  await onMarkSold(
                    soldDate,
                    soldPrice || undefined,
                  );
                  setSoldDialogOpen(false);
                  setSoldPrice("");
                })
              }
            >
              {loading ? "Updating..." : "Mark Sold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Set Date Dialog ---------- */}
      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Date</DialogTitle>
            <DialogDescription>
              Choose which date field to update for {selectedCount} item
              {selectedCount > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label>Date field</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDateField("soldAt")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    dateField === "soldAt"
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  Sold Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateField("shippedAt")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    dateField === "shippedAt"
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  Shipped Date
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-date-value">Date</Label>
              <Input
                id="bulk-date-value"
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="max-w-[200px] bg-zinc-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!dateValue || loading}
              onClick={() =>
                withLoading(async () => {
                  await onSetDate(dateField, dateValue);
                  setDateDialogOpen(false);
                })
              }
            >
              {loading ? "Updating..." : "Set Date"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Set Price Dialog ---------- */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Listed Price</DialogTitle>
            <DialogDescription>
              Update the listed price for {selectedCount} item
              {selectedCount > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-price-value">Price ({"\u00A3"})</Label>
            <Input
              id="bulk-price-value"
              type="number"
              step="0.01"
              placeholder="e.g. 25.00"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              className="max-w-[200px] bg-zinc-900"
            />
          </div>
          <DialogFooter>
            <Button
              disabled={!priceValue || loading}
              onClick={() =>
                withLoading(async () => {
                  await onSetPrice(priceValue);
                  setPriceDialogOpen(false);
                  setPriceValue("");
                })
              }
            >
              {loading ? "Updating..." : "Set Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Delete Confirm Dialog ---------- */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Items</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCount} item
              {selectedCount > 1 ? "s" : ""}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() =>
                withLoading(async () => {
                  await onDelete();
                  setDeleteDialogOpen(false);
                })
              }
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
