"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CadenceWeek {
  weekStart: string;
  count: number;
  current: boolean;
}

interface CadencePayload {
  weeks: CadenceWeek[];
  currentCount: number;
  target: number;
  pace: number;
  paceBand: "green" | "amber" | "red";
  weeklyAverage: number;
}

const BAND_STYLES: Record<CadencePayload["paceBand"], { text: string; bar: string }> = {
  green: { text: "text-emerald-300", bar: "bg-emerald-400/80" },
  amber: { text: "text-amber-300", bar: "bg-amber-400/80" },
  red: { text: "text-rose-300", bar: "bg-rose-400/80" },
};

export function CadenceCard() {
  const [data, setData] = useState<CadencePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/health/cadence");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as CadencePayload;
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
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-7 w-20 animate-pulse rounded bg-zinc-800" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const maxCount = Math.max(data.target, ...data.weeks.map((w) => w.count), 1);
  const style = BAND_STYLES[data.paceBand];
  const pacePct = Math.round(data.pace * 100);

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
          <CalendarDays className="size-4 text-sky-400" />
          Listing cadence
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Vinted rewards active sellers. How you&apos;re tracking against
          your weekly listings target.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              This week
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100 tabular-nums">
              {data.currentCount}
              <span className="text-sm text-zinc-500"> / {data.target}</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              Pace
            </div>
            <div
              className={cn("mt-1 text-2xl font-semibold tabular-nums", style.text)}
            >
              {pacePct}%
            </div>
            <div className="text-xs text-zinc-500">
              {data.paceBand === "green"
                ? "on pace"
                : data.paceBand === "amber"
                  ? "a bit behind"
                  : "well behind"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              Weekly avg
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100 tabular-nums">
              {data.weeklyAverage}
            </div>
            <div className="text-xs text-zinc-500">last 3 weeks</div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 pt-2">
          {data.weeks.map((w) => {
            const height = Math.round((w.count / maxCount) * 48) + 4;
            const barTone = w.current ? style.bar : "bg-zinc-600";
            return (
              <div
                key={w.weekStart}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className="text-[11px] font-medium tabular-nums text-zinc-300">
                  {w.count}
                </div>
                <div
                  className={cn("w-full rounded-sm", barTone)}
                  style={{ height: `${height}px` }}
                />
                <div className="text-[10px] text-zinc-500">
                  {w.current ? "this wk" : formatWeekLabel(w.weekStart)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Target reference line hint */}
        <div className="text-[11px] text-zinc-500">
          Target: {data.target} items/wk — change on{" "}
          <a className="underline decoration-dotted hover:text-zinc-300" href="/settings">
            Settings
          </a>
          .
        </div>
      </CardContent>
    </Card>
  );
}

function formatWeekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
