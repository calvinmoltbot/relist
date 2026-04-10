"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  image: string | null;
  onImageChange: (image: string | null) => void;
}

export function PhotoUpload({ image, onImageChange }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {image ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative aspect-video overflow-hidden rounded-xl border border-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Item preview"
              className="h-full w-full object-cover"
            />
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute top-2 right-2 bg-zinc-900/80 backdrop-blur-sm hover:bg-zinc-900"
              onClick={() => onImageChange(null)}
            >
              <X className="size-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "flex aspect-video cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            <motion.div
              animate={isDragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-zinc-800">
                {isDragging ? (
                  <Upload className="size-6 text-primary" />
                ) : (
                  <Camera className="size-6 text-zinc-400" />
                )}
              </div>
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-300">
                {isDragging ? "Drop your photo" : "Drop your photo here"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                or click to browse
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
