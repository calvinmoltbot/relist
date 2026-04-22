"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BiggestImpact {
  itemId: string;
  score: number;
  missingField: string;
  missingLabel: string;
  missingWeight: number;
  name: string;
  thumbnailUrl: string | null;
  listedPrice: string | null;
}

interface CompletenessPayload {
  count: number;
  averageScore: number;
  healthyPct: number;
  bands: { green: number; amber: number; red: number };
  biggestImpact: BiggestImpact[];
}

export function CompletenessCard() {
  const [data, setData] = useState<CompletenessPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/health/completeness");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as CompletenessPayload;
        if (!cancelled) setData(json);
      } catch {
        /* silent — card just stays empty */
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
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-7 w-20 animate-pulse rounded bg-zinc-800" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.count === 0) {
    return null;
  }

  const healthyTone =
    data.healthyPct >= 70
      ? "text-emerald-300"
      : data.healthyPct >= 40
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-zinc-100">
          Listing Completeness
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Vinted penalises empty fields. Fill in what's missing to unlock more search traffic.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              Avg score
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100">
              {data.averageScore}
              <span className="text-sm text-zinc-500"> / 100</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              Healthy listings
            </div>
            <div className={cn("mt-1 text-2xl font-semibold", healthyTone)}>
              {data.healthyPct}%
            </div>
            <div className="text-xs text-zinc-500">
              {data.bands.green} of {data.count} scored ≥80
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              Needs work
            </div>
            <div className="mt-1 flex gap-1.5">
              <BandPill count={data.bands.amber} tone="amber" />
              <BandPill count={data.bands.red} tone="red" />
            </div>
            <div className="mt-1 text-xs text-zinc-500">amber · red</div>
          </div>
        </div>

        {data.biggestImpact.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <AlertCircle className="size-4 text-amber-400" />
              Fix these {data.biggestImpact.length} — biggest quick wins
            </div>
            <ul className="flex flex-col gap-1.5">
              {data.biggestImpact.map((entry) => (
                <li key={entry.itemId}>
                  <Link
                    href={`/inventory?open=${entry.itemId}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm transition hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {entry.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.thumbnailUrl}
                          alt=""
                          className="size-9 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="size-9 shrink-0 rounded bg-zinc-800" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-zinc-100">
                          {entry.name}
                        </div>
                        <div className="truncate text-xs text-zinc-400">
                          Add{" "}
                          <span className="text-amber-300">
                            {entry.missingLabel}
                          </span>{" "}
                          → +{entry.missingWeight} pts
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-zinc-700 text-zinc-300"
                    >
                      {entry.score}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.bands.red === 0 && data.bands.amber === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            <CheckCircle2 className="size-4 shrink-0" />
            All listings are in healthy shape — nice work.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BandPill({ count, tone }: { count: number; tone: "amber" | "red" }) {
  const classes =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return (
    <span
      className={cn(
        "inline-flex min-w-[2rem] justify-center rounded border px-1.5 py-0.5 text-base font-semibold",
        classes,
      )}
    >
      {count}
    </span>
  );
}
