"use client";

import { useCallback, useRef } from "react";
import { Camera, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InventoryPhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}

export function InventoryPhotoUpload({
  photos,
  onChange,
  max = 5,
}: InventoryPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = max - photos.length;
      const toProcess = Array.from(files).slice(0, remaining);

      for (const file of toProcess) {
        if (!file.type.startsWith("image/")) continue;
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          onChange([...photos, dataUrl]);
        };
        reader.readAsDataURL(file);
      }
    },
    [photos, onChange, max],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(photos.filter((_, i) => i !== index));
    },
    [photos, onChange],
  );

  const canAdd = photos.length < max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <div
            key={i}
            className="relative size-20 overflow-hidden rounded-lg border border-zinc-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={`Photo ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute top-0.5 right-0.5 size-5 bg-zinc-900/80 backdrop-blur-sm hover:bg-zinc-900"
              onClick={() => handleRemove(i)}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/30 text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-200"
          >
            {photos.length === 0 ? (
              <>
                <Camera className="size-5" />
                <span className="text-[10px]">Add photo</span>
              </>
            ) : (
              <>
                <Plus className="size-4" />
                <span className="text-[10px]">{photos.length}/{max}</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset so the same file can be re-selected
          e.target.value = "";
        }}
      />
    </div>
  );
}
