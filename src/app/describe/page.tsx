"use client";

import { RefreshCw, Sparkles, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PhotoUpload } from "@/components/describe/photo-upload";
import { ToneControls } from "@/components/describe/tone-controls";
import { DescriptionOutput } from "@/components/describe/description-output";
import { useDescribeStore } from "@/lib/describe-store";

export default function DescribePage() {
  const {
    form,
    result,
    loading,
    error,
    history,
    setField,
    setImage,
    generate,
    clearForm,
    setResult,
  } = useDescribeStore();

  const canGenerate = form.image !== null || form.brand || form.category;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            AI Description Generator
          </h1>
          <p className="text-sm text-zinc-500">
            Upload a photo, get a Vinted-ready listing in seconds
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearForm}
          className="gap-1.5 text-zinc-400"
        >
          <Trash2 className="size-3.5" />
          Clear
        </Button>
      </div>

      {/* Main content */}
      <div>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column — Input */}
          <div className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle>Item Photo</CardTitle>
                <CardDescription>
                  A good photo helps generate better descriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhotoUpload image={form.image} onImageChange={setImage} />
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
                <CardDescription>
                  Optional — helps the AI write a more accurate description
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Brand
                    </label>
                    <Input
                      placeholder="e.g. Zara, Nike, Levi's"
                      value={form.brand}
                      onChange={(e) => setField("brand", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Category
                    </label>
                    <Input
                      placeholder="e.g. Dress, Jacket, Sneakers"
                      value={form.category}
                      onChange={(e) => setField("category", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Condition
                    </label>
                    <Input
                      placeholder="e.g. Like new, Good, Fair"
                      value={form.condition}
                      onChange={(e) => setField("condition", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Size
                    </label>
                    <Input
                      placeholder="e.g. S, M, L, 38, 42"
                      value={form.size}
                      onChange={(e) => setField("size", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Style Notes
                    </label>
                    <Input
                      placeholder="e.g. Y2K vibes, perfect for summer, goes with everything"
                      value={form.style_notes}
                      onChange={(e) => setField("style_notes", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle>Output Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <ToneControls
                  tone={form.tone}
                  length={form.length}
                  model={form.model}
                  onToneChange={(t) => setField("tone", t)}
                  onLengthChange={(l) => setField("length", l)}
                  onModelChange={(m) => setField("model", m)}
                />
              </CardContent>
            </Card>

            {/* Generate button */}
            <Button
              className="w-full gap-2 py-5 text-sm font-semibold"
              size="lg"
              disabled={!canGenerate || loading}
              onClick={generate}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="size-4" />
                </motion.div>
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading ? "Generating..." : "Generate Description"}
            </Button>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Right column — Output */}
          <div className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle>Generated Description</CardTitle>
                <CardDescription>
                  {result
                    ? "Your listing is ready to copy"
                    : "Fill in the details and hit Generate"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-3 py-16"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Sparkles className="size-8 text-primary" />
                      </motion.div>
                      <p className="text-sm text-zinc-400">
                        Crafting your listing...
                      </p>
                    </motion.div>
                  ) : result ? (
                    <motion.div key="result">
                      <DescriptionOutput
                        description={result.description}
                        hashtags={result.hashtags}
                        detected_brand={result.detected_brand}
                        detected_category={result.detected_category}
                      />

                      <Separator className="my-4" />

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={generate}
                        disabled={loading}
                      >
                        <RefreshCw className="size-3.5" />
                        Regenerate
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-2 py-16 text-center"
                    >
                      <div className="flex size-12 items-center justify-center rounded-full bg-zinc-800">
                        <Sparkles className="size-5 text-zinc-500" />
                      </div>
                      <p className="text-sm text-zinc-500">
                        Your generated description will appear here
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* History */}
            {history.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-4 text-zinc-500" />
                    Recent Generations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {history.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setResult(item)}
                        className="w-full rounded-lg border border-zinc-800 p-3 text-left transition-colors hover:bg-zinc-800/50"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {item.tone}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {item.length}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-zinc-600">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-zinc-400">
                          {item.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
