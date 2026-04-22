"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Timer,
  Percent,
  PoundSterling,
  Package,
  TrendingUp,
  Flame,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DateRangePicker,
  type DatePreset,
} from "@/components/profit/date-range-picker";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ---------------------------------------------------------------------------
// Types — mirror /api/bestsellers shape
// ---------------------------------------------------------------------------
interface GroupStat {
  key: string;
  count: number;
  medianDaysToSell: number;
  medianProfit: number;
  medianMarginPct: number;
  totalRevenue: number;
  fastestDays: number;
  slowestDays: number;
}

interface ItemStat {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  daysToSell: number;
  soldPrice: number;
  netProfit: number;
  marginPct: number;
}

interface BestsellersData {
  overall: {
    totalSold: number;
    medianDaysToSell: number;
    medianProfit: number;
    medianMarginPct: number;
    fastestDays: number;
    totalRevenue: number;
  };
  groups: Record<
    "brand" | "category" | "sourceType" | "condition" | "size",
    GroupStat[]
  >;
  topFastest: ItemStat[];
  topProfit: ItemStat[];
  minGroupSize: number;
}

type Dimension = keyof BestsellersData["groups"];

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "brand", label: "Brand" },
  { value: "sourceType", label: "Source" },
  { value: "condition", label: "Condition" },
  { value: "size", label: "Size" },
];

const SOURCE_LABELS: Record<string, string> = {
  charity_shop: "Charity shop",
  car_boot: "Car boot",
  online: "Online",
  other: "Other",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

function prettifyKey(dimension: Dimension, key: string): string {
  if (dimension === "sourceType") return SOURCE_LABELS[key] ?? key;
  if (dimension === "condition") return CONDITION_LABELS[key] ?? key;
  if (key === "uncategorised") return "Uncategorised";
  return key;
}

function formatDays(days: number): string {
  if (days < 1) return "same day";
  if (days === 1) return "1 day";
  return `${Math.round(days)} days`;
}

function formatMoney(value: number): string {
  return `£${value.toFixed(2)}`;
}

function formatPct(value: number): string {
  return `${Math.round(value)}%`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BestsellersPage() {
  const [data, setData] = useState<BestsellersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimension, setDimension] = useState<Dimension>("category");
  const [sort, setSort] = useState<"fastest" | "profit" | "margin">("fastest");
  const [preset, setPreset] = useState<DatePreset>("all_time");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/bestsellers?preset=${preset}`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = (await res.json()) as BestsellersData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preset]);

  const groups = data?.groups[dimension] ?? [];
  const sortedGroups = useMemo(() => {
    if (!groups.length) return [];
    const copy = [...groups];
    if (sort === "fastest") return copy.sort((a, b) => a.medianDaysToSell - b.medianDaysToSell);
    if (sort === "profit") return copy.sort((a, b) => b.medianProfit - a.medianProfit);
    return copy.sort((a, b) => b.medianMarginPct - a.medianMarginPct);
  }, [groups, sort]);

  const chartData = useMemo(() => {
    return sortedGroups.slice(0, 8).map((g) => ({
      name: prettifyKey(dimension, g.key),
      days: g.medianDaysToSell,
      profit: g.medianProfit,
    }));
  }, [sortedGroups, dimension]);

  const hasEnoughData = (data?.overall.totalSold ?? 0) >= data?.minGroupSize!;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-100">
            <Trophy className="size-5 text-amber-400" />
            Best Sellers
          </h1>
          <p className="text-sm text-zinc-300">
            What's flying out the door — time-to-sell grouped by product attributes.
          </p>
        </div>
        <DateRangePicker preset={preset} onPresetChange={setPreset} />
      </header>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {data && !loading && !error && (
        <>
          <OverallStats overall={data.overall} />

          {!hasEnoughData ? (
            <EmptyState minGroupSize={data.minGroupSize} />
          ) : (
            <>
              <Card className="border-zinc-800 bg-zinc-900/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-zinc-100">Group breakdown</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Groups with fewer than {data.minGroupSize} sales are hidden so one lucky
                    sale doesn't skew the ranking.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Tabs
                      value={dimension}
                      onValueChange={(v) => setDimension(v as Dimension)}
                    >
                      <TabsList className="flex-wrap bg-zinc-900 border border-zinc-800">
                        {DIMENSIONS.map((d) => (
                          <TabsTrigger key={d.value} value={d.value}>
                            {d.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {DIMENSIONS.map((d) => (
                        <TabsContent key={d.value} value={d.value} />
                      ))}
                    </Tabs>
                    <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs">
                      {(
                        [
                          { v: "fastest", label: "Fastest" },
                          { v: "profit", label: "Profit" },
                          { v: "margin", label: "Margin" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => setSort(opt.v)}
                          className={cn(
                            "rounded px-3 py-1 font-medium transition",
                            sort === opt.v
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "text-zinc-400 hover:text-zinc-200",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {chartData.length > 0 && (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barGap={2}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#27272a"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#a1a1aa", fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: "#3f3f46" }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            tick={{ fill: "#a1a1aa", fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: "#3f3f46" }}
                            label={{
                              value: "Days to sell",
                              angle: -90,
                              position: "insideLeft",
                              fill: "#71717a",
                              fontSize: 11,
                            }}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(39, 39, 42, 0.5)" }}
                            contentStyle={{
                              backgroundColor: "#18181b",
                              border: "1px solid #27272a",
                              borderRadius: "8px",
                              color: "#e4e4e7",
                            }}
                            formatter={(value, name) => {
                              const v = Number(value ?? 0);
                              return name === "days"
                                ? [formatDays(v), "Median days"]
                                : [formatMoney(v), "Median profit"];
                            }}
                          />
                          <Bar
                            dataKey="days"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            name="days"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <GroupTable dimension={dimension} groups={sortedGroups} />
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <HallOfFame
                  title="Fastest to sell"
                  icon={<Flame className="size-4 text-orange-400" />}
                  items={data.topFastest}
                  valueLabel="days"
                  valueFormatter={(i) => formatDays(i.daysToSell)}
                />
                <HallOfFame
                  title="Highest profit"
                  icon={<TrendingUp className="size-4 text-emerald-400" />}
                  items={data.topProfit}
                  valueLabel="profit"
                  valueFormatter={(i) => formatMoney(i.netProfit)}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function OverallStats({
  overall,
}: {
  overall: BestsellersData["overall"];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<Package className="size-4" />}
        label="Sold items analysed"
        value={overall.totalSold.toString()}
        tone="default"
      />
      <StatCard
        icon={<Timer className="size-4" />}
        label="Median days to sell"
        value={overall.totalSold ? formatDays(overall.medianDaysToSell) : "—"}
        tone="emerald"
      />
      <StatCard
        icon={<PoundSterling className="size-4" />}
        label="Median profit"
        value={overall.totalSold ? formatMoney(overall.medianProfit) : "—"}
        tone="emerald"
      />
      <StatCard
        icon={<Percent className="size-4" />}
        label="Median margin"
        value={overall.totalSold ? formatPct(overall.medianMarginPct) : "—"}
        tone="amber"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "default" | "emerald" | "amber";
}) {
  const toneClasses = {
    default: "text-zinc-100",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
  };
  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400">
          <span className="text-zinc-500">{icon}</span>
          {label}
        </div>
        <div className={cn("mt-2 text-2xl font-semibold", toneClasses[tone])}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function GroupTable({
  dimension,
  groups,
}: {
  dimension: Dimension;
  groups: GroupStat[];
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
        Not enough sales grouped by this attribute yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-400">
          <tr>
            <th className="px-3 py-2 font-medium">Group</th>
            <th className="px-3 py-2 text-right font-medium">Sales</th>
            <th className="px-3 py-2 text-right font-medium">Median days</th>
            <th className="px-3 py-2 text-right font-medium">Range</th>
            <th className="px-3 py-2 text-right font-medium">Median profit</th>
            <th className="px-3 py-2 text-right font-medium">Median margin</th>
            <th className="px-3 py-2 text-right font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {groups.map((g) => (
            <tr key={g.key} className="hover:bg-zinc-900/40">
              <td className="px-3 py-2 font-medium text-zinc-100">
                {prettifyKey(dimension, g.key)}
              </td>
              <td className="px-3 py-2 text-right text-zinc-300">{g.count}</td>
              <td className="px-3 py-2 text-right text-emerald-300">
                {formatDays(g.medianDaysToSell)}
              </td>
              <td className="px-3 py-2 text-right text-xs text-zinc-400">
                {g.fastestDays}–{g.slowestDays}d
              </td>
              <td className="px-3 py-2 text-right text-zinc-100">
                {formatMoney(g.medianProfit)}
              </td>
              <td className="px-3 py-2 text-right">
                <MarginBadge pct={g.medianMarginPct} />
              </td>
              <td className="px-3 py-2 text-right text-zinc-300">
                {formatMoney(g.totalRevenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarginBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 65
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : pct >= 40
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return (
    <Badge variant="outline" className={cn("border", tone)}>
      {formatPct(pct)}
    </Badge>
  );
}

function HallOfFame({
  title,
  icon,
  items,
  valueLabel,
  valueFormatter,
}: {
  title: string;
  icon: React.ReactNode;
  items: ItemStat[];
  valueLabel: string;
  valueFormatter: (i: ItemStat) => string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="px-4 pb-4 text-sm text-zinc-400">No sold items yet.</div>
        ) : (
          <ol className="divide-y divide-zinc-800">
            {items.map((item, idx) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-right text-xs font-semibold text-zinc-500">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-100">
                      {item.name}
                    </div>
                    <div className="truncate text-xs text-zinc-400">
                      {[item.brand, item.category].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-emerald-300">
                    {valueFormatter(item)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {valueLabel}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-zinc-800" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-rose-500/30 bg-rose-500/10">
      <CardContent className="p-4 text-sm text-rose-200">
        Couldn't load stats: {message}
      </CardContent>
    </Card>
  );
}

function EmptyState({ minGroupSize }: { minGroupSize: number }) {
  return (
    <Card className="border-dashed border-zinc-800 bg-zinc-900/30">
      <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
        <Trophy className="size-8 text-zinc-600" />
        <div className="text-base font-medium text-zinc-200">
          Not enough sales yet
        </div>
        <div className="max-w-sm text-sm text-zinc-400">
          Best sellers needs at least {minGroupSize} sold items with a listed date
          before it can compare groups. Keep going — it'll fill up fast.
        </div>
      </CardContent>
    </Card>
  );
}
