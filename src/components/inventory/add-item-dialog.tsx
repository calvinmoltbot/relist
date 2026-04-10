"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
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
import type { NewInventoryItem } from "@/lib/inventory-store";
import { InventoryPhotoUpload } from "@/components/inventory/inventory-photo-upload";

// ---------------------------------------------------------------------------
// Presets
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface AddItemDialogProps {
  onAdd: (item: NewInventoryItem) => void;
  label?: string;
  buttonSize?: "sm" | "default";
}

export function AddItemDialog({ onAdd, label = "Add Item", buttonSize = "sm" }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [size, setSize] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [listedPrice, setListedPrice] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const reset = useCallback(() => {
    setName("");
    setBrand("");
    setCategory("");
    setCondition("");
    setSize("");
    setCostPrice("");
    setListedPrice("");
    setSourceType("");
    setSourceLocation("");
    setDescription("");
    setPhotos([]);
  }, []);

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: category || undefined,
      condition: condition || undefined,
      size: size.trim() || undefined,
      costPrice: costPrice || undefined,
      listedPrice: listedPrice || undefined,
      sourceType: sourceType || undefined,
      sourceLocation: sourceLocation.trim() || undefined,
      description: description.trim() || undefined,
      photoUrls: photos.length > 0 ? photos : undefined,
    });

    reset();
    setOpen(false);
  };

  return (
    <>
      <Button size={buttonSize} className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Item</SheetTitle>
          <SheetDescription>
            Add a new item to your inventory. Only name is required.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4">
          {/* Photos */}
          <div className="flex flex-col gap-1.5">
            <Label>Photos</Label>
            <InventoryPhotoUpload photos={photos} onChange={setPhotos} />
          </div>

          {/* Name — required */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-name">
              Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="item-name"
              placeholder="e.g. Vintage Levi's 501 Jeans"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900"
              autoFocus
            />
          </div>

          {/* Brand */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-brand">Brand</Label>
            <Input
              id="item-brand"
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
            <Label htmlFor="item-size">Size</Label>
            <Input
              id="item-size"
              placeholder="e.g. M, UK 6, W32 L30"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="bg-zinc-900"
            />
          </div>

          {/* Prices side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-cost">Cost price</Label>
              <Input
                id="item-cost"
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
              <Label htmlFor="item-listed">Listed price</Label>
              <Input
                id="item-listed"
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
            <Label htmlFor="item-source-loc">Source location</Label>
            <Input
              id="item-source-loc"
              placeholder="e.g. Oxfam Camden, Battersea car boot"
              value={sourceLocation}
              onChange={(e) => setSourceLocation(e.target.value)}
              className="bg-zinc-900"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-desc">Description</Label>
            <textarea
              id="item-desc"
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
            Add Item
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  );
}
