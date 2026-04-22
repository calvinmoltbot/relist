export type DatePreset =
  | "this_month"
  | "last_month"
  | "last_90_days"
  | "this_year"
  | "tax_year"
  | "all_time";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

/**
 * Resolve a date range from URLSearchParams. Supports either a `preset`
 * (see DatePreset) or explicit `from` / `to` YYYY-MM-DD params.
 */
export function resolveDateRange(params: URLSearchParams): DateRange {
  const preset = params.get("preset");
  const now = new Date();

  if (preset) {
    switch (preset) {
      case "this_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        };
      case "last_month":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        };
      case "last_90_days":
        return {
          from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          to: now,
        };
      case "this_year":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: now,
        };
      case "tax_year": {
        // UK tax year: April 6 to April 5
        const taxYearStart =
          now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
            ? new Date(now.getFullYear(), 3, 6)
            : new Date(now.getFullYear() - 1, 3, 6);
        return { from: taxYearStart, to: now };
      }
      case "all_time":
      default:
        return { from: null, to: null };
    }
  }

  const fromStr = params.get("from");
  const toStr = params.get("to");

  return {
    from: fromStr ? new Date(fromStr + "T00:00:00") : null,
    to: toStr ? new Date(toStr + "T23:59:59") : null,
  };
}
