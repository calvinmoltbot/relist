"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

const PRESETS = [100, 150, 200, 300];

export function MarkupCalculator() {
  const [cost, setCost] = useState("5.00");
  const [markup, setMarkup] = useState(200);

  const costNum = parseFloat(cost);
  const valid = Number.isFinite(costNum) && costNum >= 0;
  const listPrice = valid ? costNum * (1 + markup / 100) : 0;
  const profit = valid ? listPrice - costNum : 0;

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-zinc-950/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="size-3.5 text-zinc-400" />
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300">
          Markup Calc
        </h4>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-400">
            Cost price
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
              £
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 py-2 pl-7 pr-3 text-sm text-zinc-100 tabular-nums focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Markup</span>
            <span className="font-semibold tabular-nums text-zinc-200">
              {markup}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="5"
            value={markup}
            onChange={(e) => setMarkup(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="mt-2 flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMarkup(p)}
                className={`flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  markup === p
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </label>

        <div className="flex items-end justify-between rounded-lg bg-emerald-500/10 px-3 py-2.5 ring-1 ring-emerald-500/20">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-300/70">
              List at
            </p>
            <p className="text-xl font-black tabular-nums text-emerald-300">
              £{listPrice.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">
              Profit
            </p>
            <p className="text-sm font-semibold tabular-nums text-zinc-200">
              +£{profit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
