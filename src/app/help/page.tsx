"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Compass,
  LayoutDashboard,
  Package,
  Sparkles,
  TrendingUp,
  Globe,
  TerminalSquare,
  Lightbulb,
  BookOpen,
  ChevronRight,
  ArrowRight,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HELP_ENTRIES,
  GROUP_ORDER,
  slugify,
  type HelpEntry,
} from "@/lib/help-registry";

// ── Group metadata ─────────────────────────────────────────────
const GROUP_META: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; description: string }
> = {
  "Getting Started": {
    icon: Compass,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    description: "New to ReList? Learn the essentials and get set up in minutes.",
  },
  Dashboard: {
    icon: LayoutDashboard,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    description: "Track revenue, action items, and daily performance at a glance.",
  },
  Inventory: {
    icon: Package,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    description: "Manage items from sourcing to shipping with powerful tools.",
  },
  Describe: {
    icon: Sparkles,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    description: "Generate beautiful Vinted descriptions with AI from a single photo.",
  },
  Financials: {
    icon: TrendingUp,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    description: "Monitor margins, revenue targets, and financial performance.",
  },
  Settings: {
    icon: Settings2,
    color: "text-zinc-300",
    bgColor: "bg-zinc-400/10",
    description: "Set your revenue, hours, and margin targets that drive the whole app.",
  },
  "Chrome Extension": {
    icon: Globe,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    description: "Collect price data automatically while browsing Vinted.",
  },
  "Vinted Scraper": {
    icon: TerminalSquare,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    description: "Import your sold items history from Vinted in seconds.",
  },
};

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

// Featured articles — hand-picked entries that are most useful for Lily
const FEATURED_IDS = [
  "inventory-overview",
  "describe-overview",
  "dashboard-overview",
  "inventory-import-xlsx",
  "extension-overview",
];

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return HELP_ENTRIES.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.group.toLowerCase().includes(q)
    );
  }, [query]);

  const featured = useMemo(
    () => HELP_ENTRIES.filter((e) => FEATURED_IDS.includes(e.id)),
    []
  );

  const groups = useMemo(() => {
    const map = HELP_ENTRIES.reduce(
      (acc, entry) => {
        (acc[entry.group] ??= []).push(entry);
        return acc;
      },
      {} as Record<string, HelpEntry[]>
    );
    return GROUP_ORDER.filter((g) => map[g]).map((g) => ({
      group: g,
      count: map[g].length,
    }));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero Search Section */}
      <section className="relative pt-4 pb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none rounded-3xl" />
        <div className="relative text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
            How can we help?
          </h1>
          <p className="text-zinc-400 text-sm mb-6 max-w-xl mx-auto">
            Everything you need to know about using ReList
          </p>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search for guides, tips, and features..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-900 border-none rounded-full py-3 pl-12 pr-6 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all shadow-xl shadow-black/20"
            />
            {query && (
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                {filtered?.length ?? 0} result{filtered?.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Search Results */}
      {filtered !== null ? (
        <section className="pb-12">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Search className="mx-auto mb-4 size-10 text-zinc-600" />
              <p className="text-zinc-300 text-lg">No results for &ldquo;{query}&rdquo;</p>
              <p className="mt-2 text-sm text-zinc-500">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => {
                const meta = GROUP_META[entry.group];
                const Icon = meta?.icon ?? BookOpen;
                return (
                  <Link
                    key={entry.id}
                    href={`/help/${slugify(entry.group)}`}
                    className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div className={cn("mt-0.5 shrink-0 w-10 h-10 rounded-lg flex items-center justify-center", meta?.bgColor ?? "bg-zinc-800")}>
                      <Icon className={cn("size-5", meta?.color ?? "text-zinc-400")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                          {entry.title}
                        </h3>
                        {entry.category === "tip" && (
                          <span className="bg-amber-500/10 text-amber-400 text-[10px] font-medium px-1.5 py-0.5 rounded">
                            tip
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
                        {entry.description}
                      </p>
                      <span className="mt-2 inline-block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        {entry.group}
                      </span>
                    </div>
                    <ChevronRight className="size-4 text-zinc-600 group-hover:text-emerald-400 mt-3 shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Category Bento Grid */}
          <section className="pb-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {groups.map(({ group, count }, i) => {
                const meta = GROUP_META[group];
                const Icon = meta?.icon ?? BookOpen;
                const isLarge = i === 0;

                return (
                  <Link
                    key={group}
                    href={`/help/${slugify(group)}`}
                    className={cn(
                      "relative rounded-xl p-5 transition-all group overflow-hidden",
                      "bg-zinc-900/60 hover:bg-zinc-800/60",
                      isLarge && "md:col-span-2"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", meta?.bgColor ?? "bg-zinc-800")}>
                      <Icon className={cn("size-4", meta?.color ?? "text-zinc-400")} />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                      {group}
                    </h3>
                    <p className="text-zinc-400 leading-snug text-xs line-clamp-2">
                      {meta?.description}
                    </p>
                    <span className="mt-2 inline-block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      {count} topic{count !== 1 ? "s" : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Featured Guides — horizontal cards */}
          <section className="pb-10">
            <h2 className="text-lg font-bold text-white mb-4">Featured Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {featured.map((entry) => {
                const meta = GROUP_META[entry.group];
                const Icon = meta?.icon ?? BookOpen;
                return (
                  <Link
                    key={entry.id}
                    href={`/help/${slugify(entry.group)}`}
                    className="flex flex-col p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors group"
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", meta?.bgColor ?? "bg-zinc-800")}>
                      <Icon className={cn("size-4", meta?.color ?? "text-zinc-400")} />
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-100 mb-1 group-hover:text-emerald-400 transition-colors leading-snug">
                      {entry.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-auto">{entry.group}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Help CTA */}
          <section className="pb-8">
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/50 rounded-xl px-6 py-4 flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-400">
                Can&apos;t find what you need? ReList was built just for you — ask Calvin!
              </p>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold shrink-0">
                <Lightbulb className="size-3.5" />
                <span>Browse by category</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
