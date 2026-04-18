"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Clock,
  TrendingUp,
  Percent,
  Save,
  Check,
  Package,
  Truck,
  Download,
  Shield,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Settings {
  monthly_revenue_target: string;
  weekly_hours: string;
  target_hourly_rate: string;
  margin_target_pct: string;
  active_listings_target: string;
  urgent_ship_days: string;
}

const FIELDS = [
  {
    key: "monthly_revenue_target" as const,
    label: "Monthly Revenue Target",
    icon: Target,
    prefix: "£",
    suffix: "/month",
    description: "Your monthly revenue goal",
  },
  {
    key: "weekly_hours" as const,
    label: "Weekly Hours",
    icon: Clock,
    prefix: "",
    suffix: "hrs/week",
    description: "Hours you spend on reselling per week",
  },
  {
    key: "margin_target_pct" as const,
    label: "Margin Target",
    icon: Percent,
    prefix: "",
    suffix: "%",
    description: "Your target profit margin percentage",
  },
  {
    key: "active_listings_target" as const,
    label: "Active Listings Target",
    icon: Package,
    prefix: "",
    suffix: "items",
    description: "How many items you aim to keep listed at once",
  },
  {
    key: "urgent_ship_days" as const,
    label: "Urgent Ship Threshold",
    icon: Truck,
    prefix: "",
    suffix: "days",
    description: "Flag sold-but-not-shipped items as urgent after this many days",
  },
];

const WEEKS_PER_MONTH = 52 / 12;

function computeHourlyRate(s: Settings): number {
  const revenue = Number(s.monthly_revenue_target);
  const hours = Number(s.weekly_hours);
  const margin = Number(s.margin_target_pct);
  const monthlyHours = hours * WEEKS_PER_MONTH;
  if (!revenue || !monthlyHours || !margin) return 0;
  return (revenue * (margin / 100)) / monthlyHours;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data.settings));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        ...settings,
        target_hourly_rate: computeHourlyRate(settings).toFixed(2),
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      {/* Page header — matches Dashboard's h2 treatment */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          Configuration
        </span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-100">
          Settings
        </h1>
      </div>

      {/* ============================================================== */}
      {/* Business Targets */}
      {/* ============================================================== */}
      <section className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between border-b border-white/[0.05] pb-3">
          <div className="flex items-center gap-2">
            <Target className="size-3.5 text-emerald-400" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
              Business Targets
            </h2>
          </div>
          <span className="text-[10px] text-zinc-500">
            Used across Dashboard &amp; Financials
          </span>
        </div>

        {!settings ? (
          <div className="py-10 text-center text-xs text-zinc-400">Loading…</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {FIELDS.map((field) => {
                const Icon = field.icon;
                return (
                  <label key={field.key} className="block">
                    <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <Icon className="size-3" />
                      {field.label}
                    </span>
                    <div className="relative">
                      {field.prefix && (
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                          {field.prefix}
                        </span>
                      )}
                      <input
                        id={field.key}
                        type="number"
                        inputMode="decimal"
                        value={settings[field.key] ?? ""}
                        onChange={(e) =>
                          setSettings({ ...settings, [field.key]: e.target.value })
                        }
                        className={cn(
                          "w-full rounded-lg border border-white/[0.08] bg-zinc-950/60 py-2 pr-14 text-sm text-zinc-100 tabular-nums focus:border-emerald-500/50 focus:outline-none",
                          field.prefix ? "pl-7" : "pl-3",
                        )}
                      />
                      {field.suffix && (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] uppercase tracking-wider text-zinc-500">
                          {field.suffix}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">{field.description}</p>
                  </label>
                );
              })}
            </div>

            {/* Derived: target hourly rate — emerald accent block mirrors Dashboard */}
            <div className="mt-5 flex items-end justify-between rounded-2xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/20">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/70">
                  <TrendingUp className="size-3" />
                  Target Hourly Rate
                </div>
                <div className="mt-0.5 text-3xl font-black tabular-nums text-emerald-300">
                  £{computeHourlyRate(settings).toFixed(2)}
                  <span className="ml-1 text-xs font-medium text-emerald-300/60">
                    /hour
                  </span>
                </div>
              </div>
              <p className="text-right text-[10px] leading-tight text-zinc-400">
                Revenue × margin<br />
                ÷ {(Number(settings.weekly_hours) * WEEKS_PER_MONTH).toFixed(1)} hrs/mo
              </p>
            </div>

            <div className="mt-5 flex justify-end border-t border-white/[0.05] pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saved ? (
                  <>
                    <Check className="mr-2 size-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    {saving ? "Saving…" : "Save Changes"}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ============================================================== */}
      {/* Backup */}
      {/* ============================================================== */}
      <section className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.05] pb-3">
          <div className="flex items-center gap-2">
            <Shield className="size-3.5 text-emerald-400" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
              Backup
            </h2>
          </div>
        </div>
        <p className="mb-4 text-xs text-zinc-400 leading-relaxed">
          Download a single file with everything — items, sales, expenses,
          watch list, settings. Save it somewhere safe (email it to yourself,
          drop it in Google Drive). If anything goes wrong we can restore
          from it.
        </p>
        <a
          href="/api/backup"
          download
          className={buttonVariants({ variant: "outline" })}
        >
          <Download className="mr-2 size-4" />
          Download backup
        </a>
        <p className="mt-3 text-[11px] text-zinc-500">
          Tip: do this every week or two, and any time before you bulk-delete
          or make big changes.
        </p>
      </section>

      <RestoreBackupCard />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restore flow — upload a backup JSON and replace everything in the DB.
// Guarded by a typed "RESTORE" confirmation and an extra "much smaller than
// current" warning step. Auto-downloads a pre-restore backup just before
// posting so there's always a file to fall back to if anything goes sideways.
// ---------------------------------------------------------------------------

type TableKey =
  | "items"
  | "transactions"
  | "expenses"
  | "watchItems"
  | "dealAlerts"
  | "userSettings"
  | "priceData"
  | "priceStats";

type Counts = Record<TableKey, number>;

const TABLE_LABELS: Record<TableKey, string> = {
  items: "Items",
  transactions: "Transactions",
  expenses: "Expenses",
  watchItems: "Watch items",
  dealAlerts: "Deal alerts",
  userSettings: "Settings",
  priceData: "Price data",
  priceStats: "Price stats",
};

const ALL_KEYS: TableKey[] = [
  "items",
  "transactions",
  "expenses",
  "watchItems",
  "dealAlerts",
  "userSettings",
  "priceData",
  "priceStats",
];

function countRows(data: Record<string, unknown>): Counts {
  const counts = Object.fromEntries(ALL_KEYS.map((k) => [k, 0])) as Counts;
  for (const key of ALL_KEYS) {
    const rows = data[key];
    if (Array.isArray(rows)) counts[key] = rows.length;
  }
  return counts;
}

function RestoreBackupCard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<{ version: number; data: Record<string, unknown> } | null>(null);
  const [uploaded, setUploaded] = useState<Counts | null>(null);
  const [current, setCurrent] = useState<Counts | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setRestoreError(null);
    setConfirmText("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (
        !json ||
        typeof json !== "object" ||
        typeof json.version !== "number" ||
        !json.data ||
        typeof json.data !== "object"
      ) {
        setParseError("This doesn't look like a ReList backup file.");
        return;
      }
      const uploadedCounts = countRows(json.data);
      setParsed({ version: json.version, data: json.data });
      setUploaded(uploadedCounts);

      const res = await fetch("/api/backup/restore");
      if (res.ok) {
        const body = (await res.json()) as { counts: Counts };
        setCurrent(body.counts);
      }
      setShowDialog(true);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read file.");
    }
  }

  const uploadedTotal = uploaded
    ? ALL_KEYS.reduce((acc, k) => acc + uploaded[k], 0)
    : 0;
  const currentTotal = current
    ? ALL_KEYS.reduce((acc, k) => acc + current[k], 0)
    : 0;
  const muchSmaller =
    current !== null && currentTotal > 0 && uploadedTotal < currentTotal * 0.5;

  async function handleRestore() {
    if (!parsed || confirmText !== "RESTORE") return;
    setRestoring(true);
    setRestoreError(null);
    try {
      // Pre-restore safety net: pull a fresh backup of current state before we
      // wipe anything. A hidden anchor click triggers the download.
      const safetyLink = document.createElement("a");
      safetyLink.href = "/api/backup";
      safetyLink.download = `relist-pre-restore-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(safetyLink);
      safetyLink.click();
      safetyLink.remove();

      // Give the browser a moment to initiate the download before we hit the
      // DB wipe — not strictly required, but makes the UX more predictable.
      await new Promise((r) => setTimeout(r, 300));

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: parsed.version, data: parsed.data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Restore failed (${res.status})`);
      }
      setShowDialog(false);
      router.push("/?restored=1");
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setRestoring(false);
    }
  }

  function closeDialog(open: boolean) {
    if (restoring) return;
    setShowDialog(open);
    if (!open) {
      setParsed(null);
      setUploaded(null);
      setCurrent(null);
      setConfirmText("");
      setRestoreError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-zinc-900/60 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.05] pb-3">
        <div className="flex items-center gap-2">
          <Upload className="size-3.5 text-amber-400" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
            Restore From Backup
          </h2>
        </div>
        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/20">
          Destructive
        </span>
      </div>
      <p className="mb-4 text-xs text-zinc-400 leading-relaxed">
        Upload a backup file to replace everything in the app with what&apos;s in
        that file. Use this if something&apos;s gone wrong and you need to roll
        back. You&apos;ll be asked to confirm before anything is overwritten.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mr-2 size-4" />
        Choose backup file
      </Button>
      {parseError && (
        <p className="mt-3 text-xs text-red-400">{parseError}</p>
      )}
      <p className="mt-3 text-[11px] text-zinc-500">
        We&apos;ll save a fresh copy of your current data to Downloads just before
        restoring, so you always have a way back.
      </p>

      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-400" />
              <DialogTitle>Replace all data?</DialogTitle>
            </div>
            <DialogDescription>
              This will replace everything currently in the app with the
              contents of the file you selected. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {uploaded && (
            <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="grid grid-cols-3 gap-y-1 text-xs">
                <div className="col-span-1 text-zinc-400">Table</div>
                <div className="col-span-1 text-right text-zinc-400">Current</div>
                <div className="col-span-1 text-right text-zinc-400">After restore</div>
                {ALL_KEYS.map((k) => {
                  const u = uploaded[k];
                  const c = current?.[k] ?? null;
                  if (u === 0 && (c === null || c === 0)) return null;
                  return (
                    <div key={k} className="contents">
                      <div className="col-span-1 text-zinc-300">{TABLE_LABELS[k]}</div>
                      <div className="col-span-1 text-right text-zinc-300">
                        {c ?? "…"}
                      </div>
                      <div className="col-span-1 text-right text-zinc-100">{u}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {muchSmaller && (
            <div className="flex items-start gap-2 rounded-md border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <div>
                The backup file has less than half the rows currently in your
                database ({uploadedTotal} vs {currentTotal}). Make sure you
                picked the right file before continuing.
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-restore" className="text-sm text-zinc-300">
              Type <span className="font-mono font-semibold text-zinc-100">RESTORE</span> to confirm:
            </Label>
            <Input
              id="confirm-restore"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESTORE"
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>

          {restoreError && (
            <p className="text-xs text-red-400">{restoreError}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => closeDialog(false)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={confirmText !== "RESTORE" || restoring}
              className="bg-amber-600 text-white hover:bg-amber-500"
            >
              {restoring ? "Restoring…" : "Replace everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
