"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, TrendingUp, Clock, ShoppingBag } from "lucide-react";
import {
  WatchItemCard,
  type WatchItemData,
} from "@/components/deals/watch-item-card";

export default function DealsPage() {
  const [watchItems, setWatchItems] = useState<WatchItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"watching" | "bought" | "passed">("watching");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/watch-items?status=${tab}`);
      if (res.ok) {
        setWatchItems(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleConvert(id: string, buyPrice: number) {
    const res = await fetch(`/api/watch-items/${id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyPrice }),
    });
    if (res.ok) {
      setWatchItems((prev) => prev.filter((w) => w.id !== id));
    }
  }

  async function handlePass(id: string) {
    const res = await fetch(`/api/watch-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "passed" }),
    });
    if (res.ok) {
      setWatchItems((prev) => prev.filter((w) => w.id !== id));
    }
  }

  const tabs = [
    { key: "watching" as const, label: "Watching", icon: Eye },
    { key: "bought" as const, label: "Bought", icon: ShoppingBag },
    { key: "passed" as const, label: "Passed", icon: Clock },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Deal Finder
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track items you&apos;re watching for a good flip. Use the Chrome
          extension&apos;s &ldquo;Watch for Flip&rdquo; button on Vinted to add
          items here.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900/60 rounded-lg p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-sm">
          Loading...
        </div>
      ) : watchItems.length === 0 ? (
        <div className="py-20 text-center">
          <TrendingUp className="mx-auto mb-4 size-10 text-zinc-700" />
          <p className="text-zinc-400 text-sm">
            {tab === "watching"
              ? "No items being watched yet. Browse Vinted with the extension and click \"Watch for Flip\" on items you like."
              : tab === "bought"
                ? "Items you've bought will appear here."
                : "Items you've passed on."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {watchItems.map((item) => (
            <WatchItemCard
              key={item.id}
              item={item}
              onConvert={handleConvert}
              onPass={handlePass}
            />
          ))}
        </div>
      )}
    </div>
  );
}
