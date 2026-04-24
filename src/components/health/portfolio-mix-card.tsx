"use client";

import { useEffect, useState } from "react";
import { PieChart as PieIcon, Lightbulb } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Dimension = "category" | "brand" | "size" | "source";

interface GroupRow {
  key: string;
  count: number;
  valueTiedUp: number;
  medianDaysListed: number;
  pctOfCount: number;
  pctOfValue: number;
}

interface MixPayload {
  dimension: Dimension;
  totalCount: number;
  totalValue: number;
  groups: GroupRow[];
  insights: string[];
}

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "brand", label: "Brand" },
  { key: "size", label: "Size" },
  { key: "source", label: "Source" },
];

// Distinct but calm palette — first slice is the hot-spot colour.
const COLORS = [
  "#f87171", // rose-400 — top / concentration warning
  "#fbbf24", // amber-400
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
  "#34d399", // emerald-400
  "#f472b6", // pink-400
  "#94a3b8", // slate-400
];

function prettyKey(k: string): string {
  if (k === "—") return "Unspecified";
  if (k.includes("_"))
    return k
      .split("_")
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(" ");
  return k;
}

export function PortfolioMixCard() {
  const [dimension, setDimension] = useState<Dimension>("category");
  const [data, setData] = useState<MixPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/health/portfolio-mix?dimension=${dimension}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as MixPayload;
        if (!cancelled) setData(json);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dimension]);

  if (!loading && (!data || data.totalCount === 0)) return null;

  const displayed = (data?.groups ?? []).slice(0, 7);
  const otherCount = (data?.groups ?? []).slice(7).reduce((s, g) => s + g.count, 0);
  const slices =
    otherCount > 0
      ? [
          ...displayed,
          {
            key: "Other",
            count: otherCount,
            valueTiedUp: 0,
            medianDaysListed: 0,
            pctOfCount: data ? (otherCount / data.totalCount) * 100 : 0,
            pctOfValue: 0,
          },
        ]
      : displayed;

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
          <PieIcon className="size-4 text-violet-400" />
          Where your unsold stock lives
        </CardTitle>
        <CardDescription className="text-zinc-400">
          If 40% of your dead stock sits in one group, that&apos;s a sourcing
          decision — not just a pricing one.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Dimension tabs */}
        <div className="inline-flex self-start rounded-md border border-zinc-800 bg-zinc-950/50 p-0.5">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDimension(d.key)}
              className={cn(
                "rounded px-2.5 py-1 text-xs transition",
                dimension === d.key
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-300 hover:text-zinc-100",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        {loading || !data ? (
          <div className="h-40 animate-pulse rounded bg-zinc-800/40" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <Donut slices={slices} />
            <div className="flex min-w-0 flex-col gap-1.5">
              {slices.map((g, i) => (
                <div
                  key={g.key}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate text-zinc-200">
                      {prettyKey(g.key)}
                    </span>
                  </div>
                  <div className="shrink-0 tabular-nums text-zinc-300">
                    {g.count}
                    <span className="ml-1 text-zinc-500">
                      ({Math.round(g.pctOfCount)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && data.insights.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
            {data.insights.map((line) => (
              <div
                key={line}
                className="flex items-start gap-2 text-sm text-amber-100"
              >
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// SVG donut — conic slices built from the group percentages. Kept inline
// to avoid pulling a chart library for one widget.
function Donut({
  slices,
}: {
  slices: { key: string; count: number; pctOfCount: number }[];
}) {
  const size = 140;
  const radius = 60;
  const stroke = 22;
  const total = slices.reduce((s, g) => s + g.count, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Precompute cumulative offsets up-front so the render pass stays pure
  // (React Compiler flags in-render mutation).
  const segments = slices.map((g) => ({
    key: g.key,
    dash: (g.count / total) * circumference,
  }));
  const offsets: number[] = [];
  segments.reduce((acc, s) => {
    offsets.push(acc);
    return acc + s.dash;
  }, 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
    >
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#27272a"
        strokeWidth={stroke}
      />
      {segments.map((seg, i) => (
        <circle
          key={seg.key}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={COLORS[i % COLORS.length]}
          strokeWidth={stroke}
          strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
          strokeDashoffset={-offsets[i]}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        className="fill-zinc-100"
        fontSize="18"
        fontWeight="600"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="fill-zinc-400"
        fontSize="10"
      >
        listed
      </text>
    </svg>
  );
}
