"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// UK tax thresholds
const TRADING_ALLOWANCE = 1000;
const HMRC_REPORTING_THRESHOLD = 1700; // Annual reporting threshold from platforms

interface TaxExportTabProps {
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    netProfit: number;
    totalShipping: number;
    totalFees: number;
    totalExpenses: number;
    itemsSold: number;
  };
  totalExpenses: number;
  byExpenseCategory: { category: string; amount: number }[];
}

export function TaxExportTab({
  summary,
  totalExpenses,
  byExpenseCategory,
}: TaxExportTabProps) {
  const [exporting, setExporting] = useState(false);

  // Tax year: Apr 6 to Apr 5
  const now = new Date();
  const taxYearStart =
    now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
      ? `6 April ${now.getFullYear()}`
      : `6 April ${now.getFullYear() - 1}`;
  const taxYearEnd =
    now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
      ? `5 April ${now.getFullYear() + 1}`
      : `5 April ${now.getFullYear()}`;

  const totalAllowableExpenses =
    summary.totalCost + summary.totalShipping + summary.totalFees + totalExpenses;
  const taxableProfit = Math.max(0, summary.totalRevenue - totalAllowableExpenses);
  const usingTradingAllowance = summary.totalRevenue <= TRADING_ALLOWANCE;
  const aboveReportingThreshold = summary.totalRevenue >= HMRC_REPORTING_THRESHOLD;

  async function handleExport() {
    setExporting(true);
    try {
      // Build CSV content
      const rows: string[][] = [
        ["ReList Tax Summary"],
        [`Tax Year: ${taxYearStart} - ${taxYearEnd}`],
        [`Exported: ${new Date().toLocaleDateString("en-GB")}`],
        [],
        ["INCOME"],
        ["Total Revenue", `£${summary.totalRevenue.toFixed(2)}`],
        ["Items Sold", String(summary.itemsSold)],
        [],
        ["ALLOWABLE EXPENSES"],
        ["Cost of Goods (stock purchased)", `£${summary.totalCost.toFixed(2)}`],
        ["Shipping Costs", `£${summary.totalShipping.toFixed(2)}`],
        ["Platform Fees (Vinted)", `£${summary.totalFees.toFixed(2)}`],
        ...byExpenseCategory.map((ec) => [
          `Business Expense: ${ec.category.replace(/_/g, " ")}`,
          `£${ec.amount.toFixed(2)}`,
        ]),
        ["Total Allowable Expenses", `£${totalAllowableExpenses.toFixed(2)}`],
        [],
        ["TAXABLE PROFIT"],
        ["Net Taxable Profit", `£${taxableProfit.toFixed(2)}`],
        [],
        ["THRESHOLDS"],
        [
          "Trading Allowance (£1,000)",
          usingTradingAllowance ? "WITHIN — no Self Assessment needed" : "EXCEEDED",
        ],
        [
          "HMRC Reporting Threshold (£1,700)",
          aboveReportingThreshold
            ? "ABOVE — Vinted may report to HMRC"
            : "Below threshold",
        ],
      ];

      const csv = rows
        .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relist-tax-summary-${now.getFullYear()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Tax year header */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="py-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">
            UK Tax Year
          </p>
          <p className="text-lg font-bold text-zinc-100">
            {taxYearStart} — {taxYearEnd}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Use the &ldquo;Tax Year&rdquo; date filter preset above for accurate figures.
          </p>
        </CardContent>
      </Card>

      {/* Threshold indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Trading Allowance */}
        <Card
          className={cn(
            "border-zinc-800",
            usingTradingAllowance ? "bg-emerald-500/5" : "bg-amber-500/5",
          )}
        >
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {usingTradingAllowance ? (
                <CheckCircle2 className="size-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <Info className="size-5 text-amber-400 mt-0.5 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-semibold text-zinc-100 mb-1">
                  £1,000 Trading Allowance
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {usingTradingAllowance
                    ? `Your revenue (£${summary.totalRevenue.toFixed(0)}) is within the trading allowance. You don't need to file Self Assessment for this income.`
                    : `Your revenue (£${summary.totalRevenue.toFixed(0)}) exceeds the £1,000 trading allowance. You'll need to declare this on Self Assessment, but you can deduct allowable expenses.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HMRC Reporting */}
        <Card
          className={cn(
            "border-zinc-800",
            aboveReportingThreshold ? "bg-red-500/5" : "bg-emerald-500/5",
          )}
        >
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {aboveReportingThreshold ? (
                <AlertTriangle className="size-5 text-red-400 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="size-5 text-emerald-400 mt-0.5 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-semibold text-zinc-100 mb-1">
                  £1,700 HMRC Auto-Reporting
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {aboveReportingThreshold
                    ? `Your revenue (£${summary.totalRevenue.toFixed(0)}) is above £1,700. Vinted is required to report your income to HMRC automatically.`
                    : `Your revenue (£${summary.totalRevenue.toFixed(0)}) is below £1,700. Vinted won't auto-report to HMRC, but you may still need to declare.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax summary breakdown */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="py-5">
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">
            Tax Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total Revenue</span>
              <span className="text-zinc-100 font-medium">
                £{summary.totalRevenue.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Cost of Goods</span>
                <span className="text-zinc-300">
                  -£{summary.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Shipping Costs</span>
                <span className="text-zinc-300">
                  -£{summary.totalShipping.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Platform Fees</span>
                <span className="text-zinc-300">
                  -£{summary.totalFees.toFixed(2)}
                </span>
              </div>
              {byExpenseCategory.map((ec) => (
                <div key={ec.category} className="flex justify-between text-sm">
                  <span className="text-zinc-500">
                    {ec.category.replace(/_/g, " ")}
                  </span>
                  <span className="text-zinc-300">
                    -£{ec.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-3 flex justify-between text-sm">
              <span className="text-zinc-400">Total Allowable Expenses</span>
              <span className="text-red-400 font-medium">
                -£{totalAllowableExpenses.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-zinc-700 pt-3 flex justify-between">
              <span className="text-zinc-100 font-semibold">
                Net Taxable Profit
              </span>
              <span className="text-emerald-400 font-bold text-lg">
                £{taxableProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-50"
      >
        <Download className="size-4" />
        {exporting ? "Exporting..." : "Export CSV for Self Assessment"}
      </button>
    </div>
  );
}
