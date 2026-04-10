"use client";

import { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Lightbulb,
  ChevronRight,
  LayoutDashboard,
  Package,
  Sparkles,
  TrendingUp,
  Globe,
  TerminalSquare,
  Compass,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HELP_ENTRIES, type HelpEntry } from "@/lib/help-registry";

// ── Group metadata ─────────────────────────────────────────────
const GROUP_META: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  "Getting Started": { icon: Compass, color: "text-blue-400" },
  Dashboard: { icon: LayoutDashboard, color: "text-emerald-400" },
  Inventory: { icon: Package, color: "text-amber-400" },
  Describe: { icon: Sparkles, color: "text-violet-400" },
  Profit: { icon: TrendingUp, color: "text-green-400" },
  "Chrome Extension": { icon: Globe, color: "text-sky-400" },
  "Vinted Scraper": { icon: TerminalSquare, color: "text-orange-400" },
};

const GROUP_ORDER = [
  "Getting Started",
  "Dashboard",
  "Inventory",
  "Describe",
  "Profit",
  "Chrome Extension",
  "Vinted Scraper",
];

function groupEntries(
  entries: HelpEntry[]
): { group: string; entries: HelpEntry[] }[] {
  const map = entries.reduce(
    (acc, entry) => {
      (acc[entry.group] ??= []).push(entry);
      return acc;
    },
    {} as Record<string, HelpEntry[]>
  );

  return GROUP_ORDER.filter((g) => map[g]).map((g) => ({
    group: g,
    entries: map[g],
  }));
}

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return groupEntries(HELP_ENTRIES);
    const q = query.toLowerCase();
    const matching = HELP_ENTRIES.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.group.toLowerCase().includes(q)
    );
    return groupEntries(matching);
  }, [query]);

  const totalResults = filtered.reduce(
    (sum, g) => sum + g.entries.length,
    0
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Help</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Everything you need to know about using ReList
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          type="text"
          placeholder="Search help topics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 pl-10 text-sm"
        />
        {query && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {totalResults} result{totalResults !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-zinc-500">
            <Search className="mx-auto mb-3 size-8 text-zinc-600" />
            <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
            <p className="mt-1 text-xs text-zinc-600">
              Try a different search term
            </p>
          </div>
        )}

        {filtered.map(({ group, entries }) => {
          const meta = GROUP_META[group] ?? {
            icon: BookOpen,
            color: "text-zinc-400",
          };
          const Icon = meta.icon;
          const isExpanded = expandedGroup === group || !!query;

          return (
            <Card
              key={group}
              className="border-zinc-800 bg-zinc-900/50 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedGroup(isExpanded && !query ? null : group)
                }
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-800/30"
              >
                <Icon className={cn("size-5 shrink-0", meta.color)} />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-zinc-100">
                    {group}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {entries.length} topic{entries.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "size-4 text-zinc-600 transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>

              {isExpanded && (
                <CardContent className="border-t border-zinc-800/50 px-5 pb-4 pt-3">
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div key={entry.id} className="group">
                        <div className="flex items-start gap-2">
                          {entry.category === "tip" ? (
                            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500/70" />
                          ) : (
                            <BookOpen className="mt-0.5 size-3.5 shrink-0 text-zinc-600" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-zinc-200">
                                {entry.title}
                              </h3>
                              {entry.category === "tip" && (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-500/10 text-amber-400 text-[10px] px-1.5 py-0"
                                >
                                  tip
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                              {entry.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-8 pb-4 text-center text-xs text-zinc-600">
        Need more help? Ask Calvin — he built this for you.
      </p>
    </div>
  );
}
