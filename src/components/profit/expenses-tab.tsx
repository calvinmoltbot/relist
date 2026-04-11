"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Plus,
  Trash2,
  Package,
  Tag,
  Megaphone,
  CreditCard,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DatePreset } from "./date-range-picker";

const CATEGORIES = [
  { value: "shipping_supplies", label: "Shipping Supplies", icon: Package },
  { value: "packaging", label: "Packaging", icon: Tag },
  { value: "promotion", label: "Promotions", icon: Megaphone },
  { value: "platform_fee", label: "Platform Fees", icon: CreditCard },
  { value: "other", label: "Other", icon: MoreHorizontal },
] as const;

const categoryLabels: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: string;
  incurredAt: string;
}

export function ExpensesTab({
  preset,
  totalExpenses,
  byExpenseCategory,
  onExpenseAdded,
}: {
  preset: DatePreset;
  totalExpenses: number;
  byExpenseCategory: { category: string; amount: number }[];
  onExpenseAdded: () => void;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [category, setCategory] = useState("shipping_supplies");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const url =
      preset === "all_time"
        ? "/api/expenses"
        : `/api/expenses?preset=${preset}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses);
      }
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          description: description || null,
          incurredAt: date,
        }),
      });
      if (res.ok) {
        setAmount("");
        setDescription("");
        setShowForm(false);
        fetchExpenses();
        onExpenseAdded();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      onExpenseAdded();
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="py-4">
            <p className="text-xs text-zinc-400 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-400">
              £{totalExpenses.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        {byExpenseCategory.slice(0, 2).map((ec) => (
          <Card key={ec.category} className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="py-4">
              <p className="text-xs text-zinc-400 mb-1">
                {categoryLabels[ec.category] ?? ec.category}
              </p>
              <p className="text-lg font-semibold text-zinc-100">
                £{ec.amount.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add expense button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900/60 text-zinc-300 text-sm font-medium hover:bg-zinc-800/60 transition-colors"
        >
          <Plus className="size-4" />
          Log an expense
        </button>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="py-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Category */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border-none text-sm text-zinc-100 py-2 px-3"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Amount */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">
                    Amount (£)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                {/* Description */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">
                    Description
                  </label>
                  <Input
                    placeholder="Optional note"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                {/* Date */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expense list */}
      {loading ? (
        <div className="py-8 text-center text-zinc-500 text-sm">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="py-12 text-center">
          <Receipt className="mx-auto mb-3 size-8 text-zinc-700" />
          <p className="text-sm text-zinc-400">
            No expenses logged yet. Track your business costs here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => {
            const catMeta = CATEGORIES.find((c) => c.value === exp.category);
            const Icon = catMeta?.icon ?? Receipt;
            return (
              <div
                key={exp.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/40 group"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">
                      {catMeta?.label ?? exp.category}
                    </span>
                    {exp.description && (
                      <span className="text-xs text-zinc-500 truncate">
                        — {exp.description}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(exp.incurredAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <span className="text-sm font-semibold text-red-400">
                  -£{parseFloat(exp.amount).toFixed(2)}
                </span>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
