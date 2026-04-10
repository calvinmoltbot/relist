"use client";

import { type Tone, type Length } from "@/lib/describe-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ToneControlsProps {
  tone: Tone;
  length: Length;
  model: string;
  onToneChange: (tone: Tone) => void;
  onLengthChange: (length: Length) => void;
  onModelChange: (model: string) => void;
}

const tones: { value: Tone; label: string; emoji: string }[] = [
  { value: "casual", label: "Casual", emoji: "\u{1F60A}" },
  { value: "professional", label: "Professional", emoji: "\u{1F454}" },
  { value: "trendy", label: "Trendy", emoji: "\u{2728}" },
];

const lengths: { value: Length; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

const models = [
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini Flash Lite",
    cost: "$0.25/1k",
    tier: "recommended" as const,
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    cost: "$0.19/1k",
    tier: "recommended" as const,
  },
  {
    id: "qwen/qwen3.5-flash-02-23",
    name: "Qwen3.5 Flash",
    cost: "$0.16/1k",
    tier: "budget" as const,
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1",
    cost: "$0.07/1k",
    tier: "budget" as const,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 (Free)",
    cost: "Free",
    tier: "free" as const,
  },
];

const tierColors = {
  recommended: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  budget: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  free: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (opt: { value: T; label: string }) => React.ReactNode;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-zinc-800/50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
            value === opt.value
              ? "bg-zinc-700 text-zinc-100 shadow-sm"
              : "text-zinc-400 hover:text-zinc-300"
          )}
        >
          {renderLabel ? renderLabel(opt) : opt.label}
        </button>
      ))}
    </div>
  );
}

export function ToneControls({
  tone,
  length,
  model,
  onToneChange,
  onLengthChange,
  onModelChange,
}: ToneControlsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          AI Model
        </label>
        <div className="grid grid-cols-2 gap-1">
          {models.filter((m) => m.tier !== "free").map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModelChange(m.id)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-1.5 text-left transition-all duration-200",
                model === m.id
                  ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
              )}
            >
              <span className="text-xs font-medium">{m.name}</span>
              <Badge
                variant="outline"
                className={cn("text-[10px]", tierColors[m.tier])}
              >
                {m.cost}
              </Badge>
            </button>
          ))}
          {models.filter((m) => m.tier === "free").map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModelChange(m.id)}
              className={cn(
                "col-span-2 flex items-center justify-center gap-2 rounded-lg px-3 py-1 text-center transition-all duration-200",
                model === m.id
                  ? "text-violet-400"
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              <span className="text-xs">{m.name}</span>
              <Badge
                variant="outline"
                className={cn("text-[10px]", tierColors[m.tier])}
              >
                {m.cost}
              </Badge>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          Tone
        </label>
        <ToggleGroup
          options={tones}
          value={tone}
          onChange={onToneChange}
          renderLabel={(opt) => {
            const t = tones.find((t) => t.value === opt.value);
            return (
              <span>
                {t?.emoji} {opt.label}
              </span>
            );
          }}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          Length
        </label>
        <ToggleGroup options={lengths} value={length} onChange={onLengthChange} />
      </div>
    </div>
  );
}
