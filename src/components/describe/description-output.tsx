"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DescriptionOutputProps {
  description: string;
  hashtags: string[];
  detected_brand?: string | null;
  detected_category?: string | null;
}

export function DescriptionOutput({
  description,
  hashtags,
  detected_brand,
  detected_category,
}: DescriptionOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement("textarea");
      textarea.value = description;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Detected info */}
      {(detected_brand || detected_category) && (
        <div className="flex flex-wrap gap-2">
          {detected_brand && (
            <Badge variant="secondary" className="text-xs">
              Brand: {detected_brand}
            </Badge>
          )}
          {detected_category && (
            <Badge variant="secondary" className="text-xs">
              Category: {detected_category}
            </Badge>
          )}
        </div>
      )}

      {/* Description preview */}
      <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">
            Listing Preview
          </span>
          <span className="text-xs text-zinc-400">
            {description.length} chars
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
          {description}
        </p>
      </div>

      {/* Copy button — prominent */}
      <Button
        onClick={handleCopy}
        size="lg"
        className="w-full gap-2 text-sm font-medium"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Check className="size-4" />
              Copied!
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Clipboard className="size-4" />
              Copy to Clipboard
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      {/* Hashtag suggestions */}
      {hashtags.length > 0 && (
        <div>
          <span className="mb-2 block text-xs font-medium text-zinc-300">
            Suggested Hashtags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer text-xs transition-colors hover:bg-zinc-800"
                onClick={() => {
                  navigator.clipboard.writeText(`#${tag}`);
                }}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
