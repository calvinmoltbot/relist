"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Package,
  Tag,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types — subset of /api/profit response we need here
// ---------------------------------------------------------------------------
interface FinancesData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    netProfit: number;
    avgMargin: number;
    itemsSold: number;
    itemsListed: number;
    itemsSourced: number;
    stockCost: number;
    stockListedValue: number;
  };
  targets: {
    currentMonth: string;
    monthRevenue: number;
    monthProfit: number;
    monthItemsSold: number;
    monthlyTarget: number;
    revenueProgress: number;
    onTrack: boolean;
    daysRemaining: number;
  };
}

const gbp = (n: number) =>
  n.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: n < 100 ? 2 : 0,
  });

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export default function FinancesPage() {
  const [data, setData] = useState<FinancesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profit")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Header />
        <div className="flex items-center justify-center py-20 text-zinc-300">
          <div className="size-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, targets } = data;
  const stockUnrealised = summary.stockListedValue - summary.stockCost;
  const stockUnsold = summary.itemsListed + summary.itemsSourced;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
      <Header />

      {/* This month — Lily's "trading account" view */}
      <Card className="border-zinc-800 bg-gradient-to-br from-emerald-950/40 via-zinc-900/60 to-zinc-900/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-200">
            {formatMonthLabel(targets.currentMonth)}
          </CardTitle>
          <CardDescription className="text-zinc-300">
            {targets.monthItemsSold} sold ·{" "}
            {targets.daysRemaining} {targets.daysRemaining === 1 ? "day" : "days"} left in the month
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <BigStat
            label="Sales"
            value={gbp(targets.monthRevenue)}
            sub={`${targets.revenueProgress.toFixed(0)}% of £${targets.monthlyTarget.toLocaleString()} target`}
            tone={targets.onTrack ? "emerald" : "amber"}
          />
          <BigStat
            label="Profit"
            value={gbp(targets.monthProfit)}
            sub={
              targets.monthRevenue > 0
                ? `${((targets.monthProfit / targets.monthRevenue) * 100).toFixed(0)}% margin`
                : "no sales yet"
            }
            tone={targets.monthProfit >= 0 ? "emerald" : "red"}
          />
        </CardContent>
      </Card>

      {/* All-time totals */}
      <section className="space-y-3">
        <SectionHeading
          icon={TrendingUp}
          title="All time"
          subtitle="Everything you've sold on Vinted"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Sales" value={gbp(summary.totalRevenue)} accent="blue" />
          <Stat
            label="Profit"
            value={gbp(summary.netProfit)}
            accent={summary.netProfit >= 0 ? "emerald" : "red"}
          />
          <Stat
            label="Avg margin"
            value={`${summary.avgMargin.toFixed(0)}%`}
            accent="violet"
          />
          <Stat
            label="Items sold"
            value={summary.itemsSold.toString()}
            accent="zinc"
          />
        </div>
      </section>

      {/* Stock view */}
      <section className="space-y-3">
        <SectionHeading
          icon={Package}
          title="Stock"
          subtitle={`${stockUnsold} ${stockUnsold === 1 ? "item" : "items"} unsold (listed + sourced)`}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <StockCard
            label="At cost"
            value={gbp(summary.stockCost)}
            description="What you've spent"
            icon={Wallet}
            tone="zinc"
          />
          <StockCard
            label="At listed value"
            value={gbp(summary.stockListedValue)}
            description="What it's listed for"
            icon={Tag}
            tone="blue"
          />
          <StockCard
            label="Unrealised profit"
            value={gbp(stockUnrealised)}
            description="If everything sells at list price"
            icon={Sparkles}
            tone={stockUnrealised >= 0 ? "emerald" : "red"}
          />
        </div>

        {stockUnsold > 0 && (
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300"
          >
            View inventory <ArrowRight className="size-3.5" />
          </Link>
        )}
      </section>

      <p className="text-xs text-zinc-400">
        Want a deeper look — breakdown by category, expenses, tax export?{" "}
        <Link href="/profit" className="text-emerald-400 hover:text-emerald-300">
          Open Financials →
        </Link>
      </p>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-100">Finances</h1>
      <p className="text-sm text-zinc-300">
        Sales, profit, and what your stock is worth
      </p>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-zinc-400" />
      <h2 className="text-sm font-medium text-zinc-200">{title}</h2>
      {subtitle && (
        <span className="text-xs text-zinc-400">· {subtitle}</span>
      )}
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "amber" | "red";
}) {
  const toneClass = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  }[tone];
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", toneClass)}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-300">{sub}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "blue" | "violet" | "red" | "zinc";
}) {
  const accentClass = {
    emerald: "text-emerald-400",
    blue: "text-sky-400",
    violet: "text-violet-400",
    red: "text-red-400",
    zinc: "text-zinc-100",
  }[accent];
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="py-3">
        <p className="text-xs text-zinc-400">{label}</p>
        <p className={cn("mt-1 text-lg font-semibold tabular-nums", accentClass)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function StockCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "zinc" | "blue" | "emerald" | "red";
}) {
  const toneClass = {
    zinc: "text-zinc-100 ring-zinc-700/40 bg-zinc-800/40",
    blue: "text-sky-400 ring-sky-500/30 bg-sky-500/10",
    emerald: "text-emerald-400 ring-emerald-500/30 bg-emerald-500/10",
    red: "text-red-400 ring-red-500/30 bg-red-500/10",
  }[tone];
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="py-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md ring-1",
              toneClass,
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <p className="text-sm font-medium text-zinc-200">{label}</p>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-100">
          {value}
        </p>
        <p className="mt-0.5 text-xs text-zinc-300">{description}</p>
      </CardContent>
    </Card>
  );
}
