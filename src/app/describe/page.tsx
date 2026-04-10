"use client";

import { useRef, useCallback } from "react";
import { RefreshCw, Sparkles, Trash2, Camera, X, Copy, Check } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDescribeStore } from "@/lib/describe-store";
import { cn } from "@/lib/utils";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Tone / length / model options
// ---------------------------------------------------------------------------
const TONES = [
  { value: "casual" as const, label: "Casual" },
  { value: "professional" as const, label: "Pro" },
  { value: "trendy" as const, label: "Trendy" },
];

const LENGTHS = [
  { value: "short" as const, label: "Short" },
  { value: "medium" as const, label: "Med" },
  { value: "long" as const, label: "Long" },
];

const MODELS = [
  { id: "google/gemini-2.5-flash-lite", label: "Gemini Flash" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano" },
  { id: "qwen/qwen3.5-flash-02-23", label: "Qwen Flash" },
  { id: "mistralai/mistral-small-3.1-24b-instruct", label: "Mistral" },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma (Free)" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DescribePage() {
  const {
    form,
    result,
    loading,
    error,
    setField,
    setImage,
    generate,
    clearForm,
  } = useDescribeStore();

  const prefersReducedMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const canGenerate = form.image !== null || form.brand || form.category;

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      e.target.value = "";
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

  const currentModel = MODELS.find((m) => m.id === form.model) ?? MODELS[0];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      {/* Input strip */}
      <div className="rounded-xl bg-zinc-900 p-3 ring-1 ring-white/[0.06]">
        {/* Row 1: Photo + fields */}
        <div className="flex gap-3">
          {/* Photo thumbnail */}
          <div className="shrink-0">
            {form.image ? (
              <div className="relative size-[72px] overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex size-[72px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-400"
              >
                <Camera className="size-4" />
                <span className="text-[9px]">Photo</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {/* Fields grid */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            <Input
              placeholder="Brand"
              value={form.brand}
              onChange={(e) => setField("brand", e.target.value)}
              className="h-8 bg-zinc-800/50 text-xs"
            />
            <Input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className="h-8 bg-zinc-800/50 text-xs"
            />
            <Input
              placeholder="Condition"
              value={form.condition}
              onChange={(e) => setField("condition", e.target.value)}
              className="h-8 bg-zinc-800/50 text-xs"
            />
            <Input
              placeholder="Size"
              value={form.size}
              onChange={(e) => setField("size", e.target.value)}
              className="h-8 bg-zinc-800/50 text-xs"
            />
            <Input
              placeholder="Style notes (optional)"
              value={form.style_notes}
              onChange={(e) => setField("style_notes", e.target.value)}
              className="col-span-2 h-8 bg-zinc-800/50 text-xs"
            />
          </div>
        </div>

        {/* Row 2: Controls + Generate */}
        <div className="mt-3 flex items-center gap-2">
          {/* Tone toggle */}
          <div className="flex rounded-md bg-zinc-800/50 p-0.5">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setField("tone", t.value)}
                className={cn(
                  "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-all",
                  form.tone === t.value
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Length toggle */}
          <div className="flex rounded-md bg-zinc-800/50 p-0.5">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                onClick={() => setField("length", l.value)}
                className={cn(
                  "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-all",
                  form.length === l.value
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setModelOpen(!modelOpen)}
              className="rounded-md bg-zinc-800/50 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-300"
            >
              {currentModel.label}
            </button>
            {modelOpen && (
              <div className="absolute top-full left-0 z-20 mt-1 w-44 rounded-lg bg-zinc-800 p-1 ring-1 ring-white/10 shadow-xl">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setField("model", m.id);
                      setModelOpen(false);
                    }}
                    className={cn(
                      "block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                      form.model === m.id
                        ? "bg-zinc-700 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Clear */}
          <button
            onClick={clearForm}
            className="text-zinc-600 transition-colors hover:text-zinc-400"
          >
            <Trash2 className="size-3.5" />
          </button>

          {/* Generate */}
          <Button
            size="sm"
            disabled={!canGenerate || loading}
            onClick={generate}
            className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:from-zinc-700 disabled:to-zinc-700 shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              prefersReducedMotion ? (
                <RefreshCw className="size-3.5 opacity-70" />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="size-3.5" />
                </motion.div>
              )
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {loading ? "Working..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}

      {/* Output */}
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
            {/* Detected badges */}
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

            {/* Description */}
            <div className="rounded-xl bg-zinc-900 p-4 ring-1 ring-white/[0.06]">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {result.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopy}
                className="flex-1 gap-1.5"
              >
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

            {/* Hashtags */}
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
            className="flex flex-col items-center justify-center gap-2 py-20 text-center"
          >
            <Sparkles className="size-6 text-zinc-600" />
            <p className="text-sm text-zinc-500">
              Add a photo or details, then hit Generate
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
