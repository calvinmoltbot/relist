"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ConvertDialog({
  open,
  onOpenChange,
  itemTitle,
  suggestedPrice,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  suggestedPrice: number;
  onConfirm: (buyPrice: number) => void;
}) {
  const [price, setPrice] = useState(String(suggestedPrice || ""));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Bought</DialogTitle>
          <DialogDescription>
            How much did you pay for &ldquo;{itemTitle}&rdquo;?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
              Purchase price (£)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="text-lg"
              autoFocus
            />
          </div>
          <button
            onClick={() => onConfirm(parseFloat(price) || 0)}
            className="w-full py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition-colors"
          >
            Add to Inventory
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
