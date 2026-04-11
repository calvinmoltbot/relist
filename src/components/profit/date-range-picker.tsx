"use client";

import { useCallback } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DatePreset =
  | "this_month"
  | "last_month"
  | "last_90_days"
  | "this_year"
  | "tax_year"
  | "all_time";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_90_days", label: "90 Days" },
  { value: "this_year", label: "This Year" },
  { value: "tax_year", label: "Tax Year" },
  { value: "all_time", label: "All Time" },
];

interface DateRangePickerProps {
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
}

export function DateRangePicker({ preset, onPresetChange }: DateRangePickerProps) {
  return (
    <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:gap-1.5 sm:px-0 sm:pb-0 scrollbar-none">
      <Calendar className="size-4 shrink-0 text-zinc-500" />
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onPresetChange(p.value)}
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[36px] sm:min-h-0 sm:py-1",
            preset === p.value
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
