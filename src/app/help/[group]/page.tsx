"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Lightbulb,
  Compass,
  LayoutDashboard,
  Package,
  Sparkles,
  TrendingUp,
  Globe,
  TerminalSquare,
  ChevronRight,
  Settings2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HELP_ENTRIES,
  GROUP_ORDER,
  slugify,
  groupFromSlug,
  type HelpEntry,
} from "@/lib/help-registry";

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
  "Deal Finder": {
    icon: Zap,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    description: "Track items you're watching for a good flip and see estimated margins.",
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

export default function HelpGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group: slug } = use(params);
  const groupName = groupFromSlug(slug);

  if (!groupName) notFound();

  const meta = GROUP_META[groupName];
  const Icon = meta?.icon ?? BookOpen;

  const entries = useMemo(
    () => HELP_ENTRIES.filter((e) => e.group === groupName),
    [groupName]
  );

  const otherGroups = useMemo(
    () => GROUP_ORDER.filter((g) => g !== groupName),
    [groupName]
  );

  const entriesByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of HELP_ENTRIES) {
      map[e.group] = (map[e.group] ?? 0) + 1;
    }
    return map;
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8 font-medium">
        <Link href="/help" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
          <ArrowLeft className="size-3.5" />
          Help Center
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-zinc-300">{groupName}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Category Header */}
          <header className="mb-10">
            <div className="flex items-center gap-4 mb-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", meta?.bgColor ?? "bg-zinc-800")}>
                <Icon className={cn("size-6", meta?.color ?? "text-zinc-400")} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                {groupName}
              </h1>
            </div>
            <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              {meta?.description}
            </p>
          </header>

          {/* Article Cards */}
          <div className="space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="p-6 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    {entry.category === "tip" ? (
                      <Lightbulb className="size-4 text-amber-400" />
                    ) : (
                      <BookOpen className="size-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-zinc-100">
                        {entry.title}
                      </h3>
                      {entry.category === "tip" && (
                        <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                          Tip
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-72 space-y-6 lg:sticky lg:top-6">
          {/* Other Categories */}
          <section className="bg-zinc-900/60 rounded-xl p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
              Other Categories
            </h4>
            <ul className="space-y-1">
              {otherGroups.map((g) => {
                const gMeta = GROUP_META[g];
                const GIcon = gMeta?.icon ?? BookOpen;
                return (
                  <li key={g}>
                    <Link
                      href={`/help/${slugify(g)}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/60 transition-colors text-zinc-400 hover:text-white group"
                    >
                      <div className="flex items-center gap-3">
                        <GIcon className={cn("size-4", gMeta?.color)} />
                        <span className="text-sm font-medium">{g}</span>
                      </div>
                      <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 group-hover:bg-emerald-400/10 group-hover:text-emerald-400 transition-all">
                        {entriesByGroup[g] ?? 0}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Support Card */}
          <section className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-emerald-500/10 to-blue-500/5">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
            <Lightbulb className="size-6 text-emerald-400 mb-3" />
            <h4 className="text-base font-bold text-white mb-2">Need more help?</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              ReList was built by Calvin, just for you. If something&apos;s not clear, just ask!
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
