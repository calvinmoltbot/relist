"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Zap,
  X,
  Search,
  Check,
  Package,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { Item } from "@/db/schema";

// ---------------------------------------------------------------------------
// Quick Log — update an existing item's status (sold / shipped).
//
// NOTE: Creating new items lives in the Chrome extension (listing-first
// workflow). Quick Log is deliberately update-only so records never ship
// with missing vintedUrl / photos / description.
// ---------------------------------------------------------------------------

type Mode = "sold" | "shipped";

const MODES: { key: Mode; label: string; icon: React.ReactNode }[] = [
  { key: "sold", label: "Sold", icon: <Check className="size-3.5" /> },
  { key: "shipped", label: "Shipped", icon: <Package className="size-3.5" /> },
];

function todayString() {
  return new Date().toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Hook: useInventorySearch
// ---------------------------------------------------------------------------
function useInventorySearch(status: string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      timerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/inventory?search=${encodeURIComponent(q)}&status=${status}`,
          );
          if (res.ok) {
            const data = await res.json();
            setResults((data.items ?? []).slice(0, 5));
          }
        } finally {
          setLoading(false);
        }
      }, 200);
    },
    [status],
  );

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setLoading(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { query, results, loading, search, clear };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function QuickLog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("sold");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [soldDate, setSoldDate] = useState(todayString);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const searchStatus = mode === "sold" ? "listed" : "sold";
  const inv = useInventorySearch(searchStatus);

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const resetForm = useCallback(() => {
    setSelectedItem(null);
    setSoldPrice("");
    setSoldDate(todayString());
    setSuccess(null);
    inv.clear();
  }, [inv]);

  const handleModeChange = useCallback(
    (m: Mode) => {
      setMode(m);
      resetForm();
    },
    [resetForm],
  );

  const handleSelectItem = useCallback((item: Item) => {
    setSelectedItem(item);
    if (item.listedPrice) setSoldPrice(item.listedPrice);
  }, []);

  const handleSold = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "sold",
          soldPrice: soldPrice || undefined,
          soldAt: new Date(soldDate).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess(`Logged sale: ${selectedItem.name}`);
      setTimeout(() => {
        resetForm();
        setOpen(false);
      }, 1500);
    } catch {
      setSuccess(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShipped = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "shipped",
          shippedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess(`Marked shipped: ${selectedItem.name}`);
      setTimeout(() => {
        resetForm();
        setOpen(false);
      }, 1500);
    } catch {
      setSuccess(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 active:scale-95 transition-colors md:bottom-8 md:right-8"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Quick Log"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="size-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Zap className="size-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="ql-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              ref={panelRef}
              key="ql-panel"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 400 }}
              className="fixed z-50 max-h-[calc(100dvh-6rem)]
                bottom-0 inset-x-0 rounded-t-2xl
                md:bottom-24 md:right-8 md:left-auto md:inset-x-auto md:w-[400px] md:rounded-2xl
                bg-zinc-900 border border-white/[0.08] shadow-2xl shadow-black/40
                flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Quick Log
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="flex size-7 items-center justify-center rounded-lg text-zinc-300 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex gap-1 px-4 pb-3">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => handleModeChange(m.key)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      mode === m.key
                        ? m.key === "sold"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                        : "text-zinc-300 hover:text-zinc-200 border border-transparent hover:bg-zinc-800"
                    }`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-400"
                  >
                    <Check className="size-4" />
                    {success}
                  </motion.div>
                )}

                {!success && !selectedItem && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-300" />
                      <input
                        type="text"
                        value={inv.query}
                        onChange={(e) => inv.search(e.target.value)}
                        placeholder={
                          mode === "sold"
                            ? "Search listed items…"
                            : "Search sold items…"
                        }
                        className="w-full rounded-lg bg-zinc-800 border border-white/[0.08] py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-blue-500/50 transition-colors"
                        autoFocus
                      />
                      {inv.loading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-300 animate-spin" />
                      )}
                    </div>

                    {inv.results.length > 0 && (
                      <div className="rounded-lg border border-white/[0.06] bg-zinc-800/60 overflow-hidden">
                        {inv.results.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-700/50 transition-colors border-b border-white/[0.04] last:border-b-0"
                          >
                            <StatusPill status={item.status} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-zinc-100">
                                {item.name}
                              </p>
                              {item.brand && (
                                <p className="truncate text-xs text-zinc-300">
                                  {item.brand}
                                </p>
                              )}
                            </div>
                            {item.listedPrice && (
                              <span className="text-sm font-medium text-zinc-400 tabular-nums">
                                £{Number(item.listedPrice).toFixed(2)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {inv.query && !inv.loading && inv.results.length === 0 && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-xs text-amber-200">
                        <p className="font-medium text-amber-300">
                          Not in ReList yet
                        </p>
                        <p className="mt-1 text-amber-200/80">
                          Open the listing on Vinted and click the ReList
                          extension button — it captures the URL, photos and
                          description automatically. Come back here to log the
                          sale.
                        </p>
                      </div>
                    )}

                    {!inv.query && (
                      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <ExternalLink className="size-3" />
                        Add new items via the Chrome extension on Vinted.
                      </p>
                    )}
                  </>
                )}

                {!success && selectedItem && (
                  <>
                    <div className="flex items-center gap-3 rounded-lg bg-zinc-800/60 border border-white/[0.06] px-3 py-2.5">
                      <StatusPill status={selectedItem.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {selectedItem.name}
                        </p>
                        {selectedItem.brand && (
                          <p className="truncate text-xs text-zinc-300">
                            {selectedItem.brand}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedItem(null);
                          inv.clear();
                        }}
                        className="flex size-6 items-center justify-center rounded text-zinc-300 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>

                    {mode === "sold" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Sold Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-300">
                              £
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={soldPrice}
                              onChange={(e) => setSoldPrice(e.target.value)}
                              className="w-full rounded-lg bg-zinc-800 border border-white/[0.08] py-2.5 pl-7 pr-3 text-sm text-zinc-100 outline-none focus:border-blue-500/50 transition-colors tabular-nums"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Date
                          </label>
                          <input
                            type="date"
                            value={soldDate}
                            onChange={(e) => setSoldDate(e.target.value)}
                            className="w-full rounded-lg bg-zinc-800 border border-white/[0.08] py-2.5 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
                          />
                        </div>
                      </>
                    )}

                    <button
                      onClick={mode === "sold" ? handleSold : handleShipped}
                      disabled={submitting}
                      className={`w-full rounded-lg py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                        mode === "sold"
                          ? "bg-emerald-600 hover:bg-emerald-500"
                          : "bg-blue-600 hover:bg-blue-500"
                      }`}
                    >
                      {submitting ? (
                        <Loader2 className="mx-auto size-4 animate-spin" />
                      ) : mode === "sold" ? (
                        "Log Sale"
                      ) : (
                        "Mark Shipped"
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sourced: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    listed: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    sold: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    shipped: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        styles[status] ?? styles.sourced
      }`}
    >
      {status}
    </span>
  );
}
