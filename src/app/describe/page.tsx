"use client";

import { useRef, useCallback, useState } from "react";
import { RefreshCw, Sparkles, Trash2, Camera, X, Copy, Check, Upload, Maximize2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDescribeStore } from "@/lib/describe-store";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
const TONES = [
  { value: "casual" as const, label: "Casual" },
  { value: "professional" as const, label: "Pro" },
  { value: "trendy" as const, label: "Trendy" },
];

const LENGTHS = [
  { value: "short" as const, label: "Short" },
  { value: "medium" as const, label: "Medium" },
  { value: "long" as const, label: "Long" },
];

const MODELS = [
  { id: "google/gemini-2.5-flash-lite", label: "Gemini Flash" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano" },
  { id: "qwen/qwen3.5-flash-02-23", label: "Qwen Flash" },
  { id: "mistralai/mistral-small-3.1-24b-instruct", label: "Mistral" },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma (Free)" },
];

const CONDITIONS = ["New with tags", "Like new", "Good", "Fair"];
const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "UK 4", "UK 6", "UK 8", "UK 10", "UK 12", "UK 14", "UK 16"];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DescribePage() {
  const {
    form, result, loading, error,
    setField, setImage, generate, clearForm,
  } = useDescribeStore();

  const prefersReducedMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const canGenerate = form.image !== null || form.brand || form.category;

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    },
    [setImage],
  );

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.description);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = result.description;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      {/* Header row */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">
          Description Generator
        </h1>
        <button
          onClick={clearForm}
          className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <Trash2 className="size-3" />
          Clear
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        {/* Left — Input */}
        <div className="space-y-4">
          {/* Photo */}
          {form.image ? (
            <div className="relative overflow-hidden rounded-xl border border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.image}
                alt="Item"
                className="w-full max-h-72 object-contain bg-zinc-950 cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              />
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 backdrop-blur-sm transition-colors hover:text-zinc-200"
              >
                <Maximize2 className="size-3.5" />
              </button>
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 backdrop-blur-sm transition-colors hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors",
                isDragging
                  ? "border-violet-500 bg-violet-500/5"
                  : "border-zinc-700 hover:border-zinc-500",
              )}
              onClick={() => fileRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
            >
              {isDragging ? (
                <Upload className="size-5 text-violet-400" />
              ) : (
                <Camera className="size-5 text-zinc-500" />
              )}
              <span className="text-xs text-zinc-500">
                {isDragging ? "Drop photo" : "Drop photo or click to upload"}
              </span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          {/* Fields */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Brand (e.g. Nike, Zara)"
              value={form.brand}
              onChange={(e) => setField("brand", e.target.value)}
              className="h-9 bg-zinc-900 text-sm"
            />
            <Input
              placeholder="Category (e.g. Dress, Jacket)"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className="h-9 bg-zinc-900 text-sm"
            />
            <ComboSelect
              value={form.condition}
              onChange={(v) => setField("condition", v)}
              options={CONDITIONS}
              placeholder="Condition"
            />
            <ComboSelect
              value={form.size}
              onChange={(v) => setField("size", v)}
              options={SIZES}
              placeholder="Size"
            />
            <Input
              placeholder="Style notes (optional)"
              value={form.style_notes}
              onChange={(e) => setField("style_notes", e.target.value)}
              className="col-span-2 h-9 bg-zinc-900 text-sm"
            />
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              options={TONES}
              value={form.tone}
              onChange={(v) => setField("tone", v)}
            />
            <Toggle
              options={LENGTHS}
              value={form.length}
              onChange={(v) => setField("length", v)}
            />
            <select
              value={form.model}
              onChange={(e) => setField("model", e.target.value)}
              className="h-7 rounded-md bg-zinc-800/50 px-2 text-[11px] text-zinc-400 outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Generate */}
          <Button
            className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:from-zinc-700 disabled:to-zinc-700 shadow-lg shadow-violet-500/20"
            disabled={!canGenerate || loading}
            onClick={generate}
          >
            {loading ? (
              prefersReducedMotion ? (
                <RefreshCw className="size-4 opacity-70" />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="size-4" />
                </motion.div>
              )
            ) : (
              <Sparkles className="size-4" />
            )}
            {loading ? "Generating..." : "Generate Description"}
          </Button>

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Right — Output */}
        <div>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 py-20"
              >
                {prefersReducedMotion ? (
                  <Sparkles className="size-6 text-violet-400" />
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="size-6 text-violet-400" />
                  </motion.div>
                )}
                <p className="text-sm text-zinc-500">Crafting your listing...</p>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                {(result.detected_brand || result.detected_category) && (
                  <div className="flex gap-1.5">
                    {result.detected_brand && (
                      <Badge variant="secondary" className="text-[10px]">
                        {result.detected_brand}
                      </Badge>
                    )}
                    {result.detected_category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {result.detected_category}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="rounded-xl bg-zinc-900 p-4 ring-1 ring-white/[0.06]">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                    {result.description}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCopy} className="flex-1 gap-1.5">
                    {copied ? (
                      <><Check className="size-3.5" /> Copied</>
                    ) : (
                      <><Copy className="size-3.5" /> Copy to Clipboard</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generate}
                    disabled={loading}
                    className="gap-1.5"
                  >
                    <RefreshCw className="size-3.5" />
                    Redo
                  </Button>
                </div>

                {result.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.hashtags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => navigator.clipboard.writeText(`#${tag}`)}
                        className="rounded-full bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 py-20 text-center"
              >
                <Sparkles className="size-8 text-zinc-700" />
                <p className="text-sm text-zinc-500">
                  Your description will appear here
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxOpen && form.image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.image}
                alt="Item full size"
                className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
              />
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 ring-1 ring-white/10 transition-colors hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle group
// ---------------------------------------------------------------------------
function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-zinc-800/50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
            value === opt.value
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComboSelect — dropdown with presets + custom input
// ---------------------------------------------------------------------------
function ComboSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustom = value && !options.includes(value);

  if (custom || isCustom) {
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => { if (!value) setCustom(false); }}
          className="h-9 bg-zinc-900 text-sm pr-7"
          autoFocus={custom}
        />
        <button
          onClick={() => { onChange(""); setCustom(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-9 w-full items-center rounded-md border border-input bg-zinc-900 px-3 text-sm transition-colors",
          value ? "text-zinc-200" : "text-zinc-500",
        )}
      >
        {value || placeholder}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-full rounded-lg bg-zinc-800 p-1 ring-1 ring-white/10 shadow-xl max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                value === opt
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200",
              )}
            >
              {opt}
            </button>
          ))}
          <div className="border-t border-zinc-700 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); setCustom(true); }}
              className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300"
            >
              + Custom...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
