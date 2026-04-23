"use client";

import { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FreshnessStats,
  AgingChart,
  DeadStockCard,
} from "@/components/profit/inventory-health";
import { CompletenessCard } from "@/components/health/completeness-card";
import { NeedsRefreshCard } from "@/components/health/needs-refresh-card";

// ---------------------------------------------------------------------------
// Shape we need from /api/profit — we only pluck what Inventory Health uses.
// ---------------------------------------------------------------------------
interface HealthPayload {
  summary: {
    sellThroughRate: number;
    avgDaysToSell: number | null;
  };
  inventoryHealth: {
    agingBuckets: Record<string, number>;
    agingValues: Record<string, number>;
    deadStock: {
      id: string;
      name: string;
      brand: string | null;
      listedPrice: number;
      daysListed: number;
    }[];
    totalUnsold: number;
    inventoryTurnover: number;
    stockAtRisk: number;
  };
}

export default function HealthPage() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/profit?preset=all_time");
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = (await res.json()) as HealthPayload;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-100">
          <HeartPulse className="size-5 text-rose-400" />
          Inventory Health
        </h1>
        <p className="text-sm text-zinc-300">
          How fresh, complete and well-priced your listings are — the signals Vinted uses to decide who sees them.
        </p>
      </header>

      {loading && <LoadingState />}
      {error && (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="p-4 text-sm text-rose-200">
            Couldn't load health data: {error}
          </CardContent>
        </Card>
      )}

      {data && !loading && !error && (
        <>
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <FreshnessStats
              data={data.inventoryHealth}
              sellThroughRate={data.summary.sellThroughRate}
              avgDaysToSell={data.summary.avgDaysToSell}
            />
            <AgingChart data={data.inventoryHealth} />
            <DeadStockCard data={data.inventoryHealth} />
            <CompletenessCard />
            <NeedsRefreshCard />
          </div>

          <Card className="border-dashed border-zinc-800 bg-zinc-900/30">
            <CardContent className="p-5 text-sm text-zinc-400">
              <strong className="text-zinc-200">Coming next:</strong> price
              competitiveness (#37), portfolio mix (#38), and listing cadence
              (#39).
            </CardContent>
          </Card>
        </>
      )}
    </div>
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
