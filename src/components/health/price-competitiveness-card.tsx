"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Outlier {
  itemId: string;
  name: string;
  brand: string | null;
  size: string | null;
  listedPrice: number;
  p25: number | null;
  p75: number | null;
  median: number | null;
  gap: number;
  matchedOn: "brand+category+size" | "brand+category" | null;
  thumbnailUrl: string | null;
}

interface Payload {
  count: number;
  summary: { high: number; range: number; low: number; none: number };
  outliers: Outlier[];
}

export function PriceCompetitivenessCard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/health/price-competitiveness");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as Payload;
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
  }, []);

  if (loading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-7 w-24 animate-pulse rounded bg-zinc-800" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.count === 0) return null;

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
          <TrendingUp className="size-4 text-rose-400" />
          Priced above market
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Items priced more than 20% above the typical sold-band. Vinted
          buyers skip these — drop the price or accept a longer wait.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <Stat tone="rose" value={data.summary.high} label="High" />
          <Stat tone="emerald" value={data.summary.range} label="In range" />
          <Stat tone="amber" value={data.summary.low} label="Low" />
          <Stat tone="zinc" value={data.summary.none} label="No data" />
        </div>

        {data.outliers.length === 0 ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            No listings are priced above the market band — nice work.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.outliers.map((o) => (
              <li key={o.itemId}>
                <Link
                  href={`/inventory?open=${o.itemId}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {o.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.thumbnailUrl}
                        alt=""
                        className="size-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="size-9 shrink-0 rounded bg-zinc-800" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-zinc-100">{o.name}</div>
                      <div className="truncate text-xs text-zinc-400">
                        Listed{" "}
                        <span className="text-rose-300">£{o.listedPrice.toFixed(0)}</span>
                        {o.p25 != null && o.p75 != null ? (
                          <>
                            {" · "}
                            market £{o.p25.toFixed(0)}–£{o.p75.toFixed(0)}
                          </>
                        ) : null}
                        {o.matchedOn === "brand+category" ? (
                          <span className="text-zinc-500"> · no size data</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-rose-500/30 bg-rose-500/10 text-rose-300"
                  >
                    +£{o.gap.toFixed(0)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  tone,
  value,
  label,
}: {
  tone: "rose" | "emerald" | "amber" | "zinc";
  value: number;
  label: string;
}) {
  const tones = {
    rose: "text-rose-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    zinc: "text-zinc-300",
  } as const;
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-2">
      <div className={`text-xl font-semibold tabular-nums ${tones[tone]}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-400">
        {label}
      </div>
    </div>
  );
}
