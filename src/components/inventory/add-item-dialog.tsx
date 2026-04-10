"use client";

import { useState, useCallback } from "react";
import { Plus, Sparkles, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NewInventoryItem } from "@/lib/inventory-store";
import { InventoryPhotoUpload } from "@/components/inventory/inventory-photo-upload";

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------
const CATEGORY_PRESETS = [
  "jeans", "tops", "dresses", "jackets", "shoes", "bags", "accessories", "books", "other",
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
    setName(""); setBrand(""); setCategory(""); setCondition("");
    setSize(""); setCostPrice(""); setListedPrice(""); setSourceType("");
    setSourceLocation(""); setDescription(""); setPhotos([]);
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a new item to your inventory. Only name is required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {/* Photos */}
            <div className="flex flex-col gap-1.5">
              <Label>Photos</Label>
              <InventoryPhotoUpload photos={photos} onChange={setPhotos} />
            </div>

            {/* Two column grid for fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Name — required, full width */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
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

              {/* Prices */}
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

              {/* Source location */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="item-source-loc">Source location</Label>
                <Input
                  id="item-source-loc"
                  placeholder="e.g. Oxfam Camden, Battersea car boot"
                  value={sourceLocation}
                  onChange={(e) => setSourceLocation(e.target.value)}
                  className="bg-zinc-900"
                />
              </div>
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

            {/* Description with AI generate */}
            <DescriptionField
              description={description}
              onDescriptionChange={setDescription}
              image={photos[0] ?? null}
              brand={brand}
              category={category}
              condition={condition}
              itemSize={size}
            />
          </form>

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="w-full sm:w-auto"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Description field with inline AI generate
// ---------------------------------------------------------------------------
function DescriptionField({
  description,
  onDescriptionChange,
  image,
  brand,
  category,
  condition,
  itemSize,
}: {
  description: string;
  onDescriptionChange: (v: string) => void;
  image: string | null;
  brand: string;
  category: string;
  condition: string;
  itemSize: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: image ?? undefined,
          brand: brand || undefined,
          category: category || undefined,
          condition: condition || undefined,
          size: itemSize || undefined,
          tone: "casual",
          length: "medium",
          model: "google/gemini-2.5-flash-lite",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate");
      }

      const data = await res.json();
      onDescriptionChange(data.description);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }, [image, brand, category, condition, itemSize, onDescriptionChange]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="item-desc">Description</Label>
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] font-medium text-violet-400 transition-colors hover:text-violet-300 disabled:opacity-50"
          disabled={generating || (!image && !brand && !category)}
          onClick={handleGenerate}
        >
          {generating ? (
            <RefreshCw className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {generating ? "Generating..." : "AI Generate"}
        </button>
      </div>
      <textarea
        id="item-desc"
        rows={4}
        placeholder="Notes about condition, unique details..."
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-zinc-900 px-2.5 py-2 text-sm placeholder:text-zinc-600 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {genError && (
        <p className="text-xs text-red-400">{genError}</p>
      )}
    </div>
  );
}
