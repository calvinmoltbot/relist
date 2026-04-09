"use client";

import { type Tone, type Length } from "@/lib/describe-store";
import { cn } from "@/lib/utils";

interface ToneControlsProps {
  tone: Tone;
  length: Length;
  onToneChange: (tone: Tone) => void;
  onLengthChange: (length: Length) => void;
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
    <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
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
  onToneChange,
  onLengthChange,
}: ToneControlsProps) {
  return (
    <div className="space-y-3">
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
