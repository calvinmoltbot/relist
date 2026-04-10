"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InventoryItem } from "@/lib/inventory-store";

// ---------------------------------------------------------------------------
// Presets (shared with add-item-dialog)
// ---------------------------------------------------------------------------
const CATEGORY_PRESETS = [
  "jeans",
  "tops",
  "dresses",
  "jackets",
  "shoes",
  "bags",
  "accessories",
  "books",
  "other",
];

const CONDITION_OPTIONS = [
  { value: "new", label: "New with tags" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const SOURCE_TYPES = [
  { value: "charity_shop", label: "Charity shop" },
  { value: "car_boot", label: "Car boot" },
  { value: "online", label: "Online" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "sourced", label: "Sourced" },
  { value: "listed", label: "Listed" },
  { value: "sold", label: "Sold" },
  { value: "shipped", label: "Shipped" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface EditItemDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<InventoryItem>) => void;
}

export function EditItemDialog({ item, open, onOpenChange, onSave }: EditItemDialogProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [size, setSize] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [listedPrice, setListedPrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [status, setStatus] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [description, setDescription] = useState("");

  // Populate form when item changes
  useEffect(() => {
    if (item) {
      setName(item.name ?? "");
      setBrand(item.brand ?? "");
      setCategory(item.category ?? "");
      setCondition(item.condition ?? "");
      setSize(item.size ?? "");
      setCostPrice(item.costPrice ?? "");
      setListedPrice(item.listedPrice ?? "");
      setSoldPrice(item.soldPrice ?? "");
      setStatus(item.status ?? "sourced");
      setSourceType(item.sourceType ?? "");
      setSourceLocation(item.sourceLocation ?? "");
      setDescription(item.description ?? "");
    }
  }, [item]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent | React.MouseEvent) => {
      e?.preventDefault();
      if (!item || !name.trim()) return;

      onSave(item.id, {
        name: name.trim(),
        brand: brand.trim() || null,
        category: category || null,
        condition: condition || null,
        size: size.trim() || null,
        costPrice: costPrice || null,
        listedPrice: listedPrice || null,
        soldPrice: soldPrice || null,
        status,
        sourceType: sourceType || null,
        sourceLocation: sourceLocation.trim() || null,
        description: description.trim() || null,
      });

      onOpenChange(false);
    },
    [item, name, brand, category, condition, size, costPrice, listedPrice, soldPrice, status, sourceType, sourceLocation, description, onSave, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Item</SheetTitle>
          <SheetDescription>
            Update item details. Only name is required.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    status === s.value
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name — required */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-item-name">
              Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="edit-item-name"
              placeholder="e.g. Vintage Levi's 501 Jeans"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900"
            />
          </div>

          {/* Brand */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-item-brand">Brand</Label>
            <Input
              id="edit-item-brand"
              placeholder="e.g. Levi's, Nike, Zara"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="bg-zinc-900"
            />
          </div>

          {/* Category presets */}
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? "" : c)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    category === c
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div className="flex flex-col gap-1.5">
            <Label>Condition</Label>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(condition === c.value ? "" : c.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    condition === c.value
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-item-size">Size</Label>
            <Input
              id="edit-item-size"
              placeholder="e.g. M, UK 6, W32 L30"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="bg-zinc-900"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-item-cost">Cost price</Label>
              <Input
                id="edit-item-cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-item-listed">Listed price</Label>
              <Input
                id="edit-item-listed"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={listedPrice}
                onChange={(e) => setListedPrice(e.target.value)}
                className="bg-zinc-900"
              />
            </div>
          </div>

          {/* Sold price (only relevant for sold/shipped) */}
          {(status === "sold" || status === "shipped") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-item-sold">Sold price</Label>
              <Input
                id="edit-item-sold"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                className="bg-zinc-900"
              />
            </div>
          )}

          {/* Source type */}
          <div className="flex flex-col gap-1.5">
            <Label>Source</Label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_TYPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSourceType(sourceType === s.value ? "" : s.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    sourceType === s.value
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source location */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-item-source-loc">Source location</Label>
            <Input
              id="edit-item-source-loc"
              placeholder="e.g. Oxfam Camden, Battersea car boot"
              value={sourceLocation}
              onChange={(e) => setSourceLocation(e.target.value)}
              className="bg-zinc-900"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-item-desc">Description</Label>
            <textarea
              id="edit-item-desc"
              rows={3}
              placeholder="Notes about condition, unique details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-zinc-900 px-2.5 py-2 text-sm placeholder:text-zinc-600 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </form>

        <SheetFooter>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full"
          >
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
