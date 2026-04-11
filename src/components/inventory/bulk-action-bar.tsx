"use client";

import { useState, useCallback } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  Tag,
  Trash2,
  X,
  Receipt,
  AlertTriangle,
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
  /** How many of the selected items are currently sold or shipped */
  selectedSoldCount: number;
  onSetStatus: (
    status: string,
    extras?: { soldAt?: string; soldPrice?: string },
  ) => Promise<void>;
  onSetDate: (field: "soldAt" | "shippedAt", date: string) => Promise<void>;
  onSetPrice: (price: string) => Promise<void>;
  onSetFees: (fees: {
    shippingCost?: string;
    platformFees?: string;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
}

const STATUS_OPTIONS = [
  { value: "sourced", label: "Sourced", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  { value: "listed", label: "Listed", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  { value: "sold", label: "Sold", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  { value: "shipped", label: "Shipped", color: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
];

// ---------------------------------------------------------------------------
// BulkActionBar
// ---------------------------------------------------------------------------
export function BulkActionBar({
  selectedCount,
  selectedSoldCount,
  onSetStatus,
  onSetDate,
  onSetPrice,
  onSetFees,
  onDelete,
  onClearSelection,
}: BulkActionBarProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [feesDialogOpen, setFeesDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Status dialog state
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [showReversalWarning, setShowReversalWarning] = useState(false);
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

  // Set fees state
  const [shippingCost, setShippingCost] = useState("");
  const [platformFees, setPlatformFees] = useState("");

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

  const handleStatusSelect = useCallback(
    (status: string) => {
      setTargetStatus(status);

      // Check if this is a reversal (sold/shipped → sourced/listed)
      const isReversal =
        (status === "sourced" || status === "listed") && selectedSoldCount > 0;

      if (isReversal) {
        setShowReversalWarning(true);
      } else {
        setShowReversalWarning(false);
      }
    },
    [selectedSoldCount],
  );

  const handleStatusConfirm = useCallback(async () => {
    if (!targetStatus) return;
    await withLoading(async () => {
      const extras: { soldAt?: string; soldPrice?: string } = {};
      if (targetStatus === "sold") {
        extras.soldAt = soldDate;
        if (soldPrice) extras.soldPrice = soldPrice;
      }
      await onSetStatus(targetStatus, extras);
      setStatusDialogOpen(false);
      setTargetStatus(null);
      setShowReversalWarning(false);
      setSoldPrice("");
    });
  }, [targetStatus, soldDate, soldPrice, onSetStatus, withLoading]);

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
            className="rounded-md p-0.5 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
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
            onClick={() => {
              setTargetStatus(null);
              setShowReversalWarning(false);
              setStatusDialogOpen(true);
            }}
            disabled={loading}
          >
            <ArrowRightLeft className="size-3.5" />
            Set Status
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
            className="gap-1.5 text-zinc-400 hover:text-zinc-200"
            onClick={() => setFeesDialogOpen(true)}
            disabled={loading}
          >
            <Receipt className="size-3.5" />
            Set Fees
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

      {/* ---------- Set Status Dialog ---------- */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Status</DialogTitle>
            <DialogDescription>
              Change the status of {selectedCount} item
              {selectedCount > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Status buttons */}
            <div className="flex flex-col gap-1.5">
              <Label>New status</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleStatusSelect(s.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      targetStatus === s.value
                        ? s.color
                        : "border-transparent bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reversal warning */}
            {showReversalWarning && (
              <div className="flex gap-2.5 rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                <div className="text-xs text-amber-300">
                  <p className="font-medium">
                    {selectedSoldCount} item{selectedSoldCount > 1 ? "s are" : " is"} currently sold/shipped
                  </p>
                  <p className="mt-1 text-amber-300/80">
                    Reverting will create credit transactions to offset the
                    original sales and clear sold dates and prices.
                  </p>
                </div>
              </div>
            )}

            {/* Extra fields for "sold" status */}
            {targetStatus === "sold" && (
              <>
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
                    <span className="font-normal text-zinc-300">(optional)</span>
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
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={!targetStatus || loading}
              onClick={handleStatusConfirm}
              variant={showReversalWarning ? "destructive" : "default"}
            >
              {loading
                ? "Updating..."
                : showReversalWarning
                  ? `Revert ${selectedSoldCount} item${selectedSoldCount > 1 ? "s" : ""}`
                  : "Set Status"}
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
                      : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-300"
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
                      : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-300"
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

      {/* ---------- Set Fees Dialog ---------- */}
      <Dialog open={feesDialogOpen} onOpenChange={setFeesDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Transaction Fees</DialogTitle>
            <DialogDescription>
              Update shipping cost and/or platform fees for {selectedCount} item
              {selectedCount > 1 ? "s" : ""}. Profit will be recalculated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-shipping">Shipping cost ({"\u00A3"})</Label>
              <Input
                id="bulk-shipping"
                type="number"
                step="0.01"
                min="0"
                placeholder="Leave blank to keep current"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="max-w-[200px] bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-fees">Platform fees ({"\u00A3"})</Label>
              <Input
                id="bulk-fees"
                type="number"
                step="0.01"
                min="0"
                placeholder="Leave blank to keep current"
                value={platformFees}
                onChange={(e) => setPlatformFees(e.target.value)}
                className="max-w-[200px] bg-zinc-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={(!shippingCost && !platformFees) || loading}
              onClick={() =>
                withLoading(async () => {
                  await onSetFees({
                    shippingCost: shippingCost || undefined,
                    platformFees: platformFees || undefined,
                  });
                  setFeesDialogOpen(false);
                  setShippingCost("");
                  setPlatformFees("");
                })
              }
            >
              {loading ? "Updating..." : "Set Fees"}
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
