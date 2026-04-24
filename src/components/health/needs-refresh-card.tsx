"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NeedsRefreshItem {
  itemId: string;
  name: string;
  brand: string | null;
  listedPrice: string | null;
  lastEditedAt: string | null;
  listedAt: string | null;
  daysSinceEdit: number;
  completenessScore: number;
  relistCount: number;
  priority: number;
  thumbnailUrl: string | null;
}

interface Payload {
  count: number;
  items: NeedsRefreshItem[];
}

export function NeedsRefreshCard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/health/needs-refresh", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as Payload;
      setData(json);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefreshed = useCallback(
    async (itemId: string) => {
      setRefreshing(itemId);
      try {
        await fetch(`/api/inventory/${itemId}/refresh`, { method: "POST" });
        await load();
        setExpandedId(null);
      } finally {
        setRefreshing(null);
      }
    },
    [load],
  );

  if (loading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40 lg:col-span-2">
        <CardContent className="p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-7 w-24 animate-pulse rounded bg-zinc-800" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.count === 0) {
    return null;
  }

  // Only surface items genuinely overdue or incomplete — quiet the panel
  // once the queue is healthy. Threshold: any item ≥7 days since edit, or
  // a score <80.
  const queue = data.items.filter(
    (i) => i.daysSinceEdit >= 7 || i.completenessScore < 80,
  );

  if (queue.length === 0) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40 lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">Needs refresh</CardTitle>
          <CardDescription className="text-zinc-400">
            Vinted rewards recently-edited listings with more search traffic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            <CheckCircle2 className="size-4 shrink-0" />
            All listings are fresh — nothing needs a refresh right now.
          </div>
        </CardContent>
      </Card>
    );
  }

  const visible = queue.slice(0, 8);

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
          <RefreshCw className="size-4 text-amber-400" />
          Needs refresh
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-300"
          >
            {queue.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Vinted rewards recently-edited listings. These are your best-value
          items that have gone stale — refresh them to get back in search.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {visible.map((item) => (
          <RefreshRow
            key={item.itemId}
            item={item}
            expanded={expandedId === item.itemId}
            onToggle={() =>
              setExpandedId((prev) => (prev === item.itemId ? null : item.itemId))
            }
            onRefreshed={() => handleRefreshed(item.itemId)}
            isBusy={refreshing === item.itemId}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function RefreshRow({
  item,
  expanded,
  onToggle,
  onRefreshed,
  isBusy,
}: {
  item: NeedsRefreshItem;
  expanded: boolean;
  onToggle: () => void;
  onRefreshed: () => void;
  isBusy: boolean;
}) {
  const stale = item.daysSinceEdit >= 14;
  const warn = !stale && item.daysSinceEdit >= 7;

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-zinc-900"
      >
        <div className="flex min-w-0 items-center gap-3">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt=""
              className="size-9 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="size-9 shrink-0 rounded bg-zinc-800" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm text-zinc-100">{item.name}</div>
            <div className="truncate text-xs text-zinc-400">
              <span
                className={cn(
                  stale && "text-rose-300",
                  warn && "text-amber-300",
                )}
              >
                {item.daysSinceEdit}d since edit
              </span>
              {" · "}
              <span>score {item.completenessScore}</span>
              {item.listedPrice ? (
                <>
                  {" · "}
                  <span>£{parseFloat(item.listedPrice).toFixed(2)}</span>
                </>
              ) : null}
              {item.relistCount > 0 ? (
                <>
                  {" · "}
                  <span>refreshed {item.relistCount}×</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-zinc-700 text-zinc-300"
        >
          {item.priority >= 100 ? Math.round(item.priority) : item.priority.toFixed(1)}
        </Badge>
      </button>

      {expanded ? (
        <div className="border-t border-zinc-800 px-3 py-3 text-sm text-zinc-300">
          <p className="mb-2 text-zinc-200">
            Change at least one of these so Vinted sees a fresh listing — a
            naïve repost with no real changes can get flagged as a duplicate.
          </p>
          <ul className="mb-3 space-y-1 text-zinc-300">
            <li className="flex gap-2">
              <span className="text-zinc-500">•</span>
              <span>
                <strong className="text-zinc-200">Title</strong> — add a keyword
                buyers search for (brand, colour, occasion)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-500">•</span>
              <span>
                <strong className="text-zinc-200">Description</strong> —
                rewrite the first sentence
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-500">•</span>
              <span>
                <strong className="text-zinc-200">Main photo</strong> — swap or
                crop it
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-500">•</span>
              <span>
                <strong className="text-zinc-200">Price</strong> — a small
                nudge is enough
              </span>
            </li>
          </ul>
          <p className="mb-3 text-xs text-zinc-400">
            Make the change in Vinted (edit the listing, or delete + re-upload
            with the new photos/text). Then tap the button below.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/inventory?open=${item.itemId}`}
              className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-800"
            >
              Open in inventory
            </Link>
            <Button
              size="sm"
              onClick={onRefreshed}
              disabled={isBusy}
              className="bg-emerald-500/90 text-emerald-950 hover:bg-emerald-400"
            >
              {isBusy ? "Saving…" : "I've refreshed this"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
