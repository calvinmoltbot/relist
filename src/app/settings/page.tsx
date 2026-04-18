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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure your business targets and preferences.
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base text-zinc-100">
            Business Targets
          </CardTitle>
          <CardDescription>
            These targets are used across your dashboard and financial reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!settings ? (
            <div className="py-8 text-center text-sm text-zinc-300">
              Loading...
            </div>
          ) : (
            <div className="space-y-5">
              {FIELDS.map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label
                      htmlFor={field.key}
                      className="flex items-center gap-2 text-sm text-zinc-300"
                    >
                      <Icon className="size-3.5 text-zinc-300" />
                      {field.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      {field.prefix && (
                        <span className="text-sm text-zinc-300">
                          {field.prefix}
                        </span>
                      )}
                      <Input
                        id={field.key}
                        type="number"
                        value={settings[field.key] ?? ""}
                        onChange={(e) =>
                          setSettings({ ...settings, [field.key]: e.target.value })
                        }
                        className="max-w-[160px]"
                      />
                      {field.suffix && (
                        <span className="text-sm text-zinc-300">
                          {field.suffix}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{field.description}</p>
                  </div>
                );
              })}

              <div className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <TrendingUp className="size-3.5 text-zinc-300" />
                  Target Hourly Rate
                </div>
                <div className="mt-1 text-2xl font-semibold text-zinc-100">
                  £{computeHourlyRate(settings).toFixed(2)}
                  <span className="ml-1 text-sm font-normal text-zinc-400">
                    /hour
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Calculated from revenue × margin ÷ monthly hours (
                  {(Number(settings.weekly_hours) * WEEKS_PER_MONTH).toFixed(1)}{" "}
                  hrs/month).
                </p>
              </div>

              <div className="pt-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saved ? (
                    <>
                      <Check className="mr-2 size-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-emerald-400" />
            <CardTitle className="text-base text-zinc-100">Backup Your Data</CardTitle>
          </div>
          <CardDescription>
            Download a single file with everything — items, sales, expenses,
            watch list, settings. Save it somewhere safe (email it to yourself,
            drop it in Google Drive). If anything goes wrong we can restore
            from it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/api/backup"
            download
            className={buttonVariants({ variant: "outline" })}
          >
            <Download className="mr-2 size-4" />
            Download backup
          </a>
          <p className="mt-3 text-xs text-zinc-400">
            Tip: do this every week or two, and any time before you bulk-delete
            or make big changes.
          </p>
        </CardContent>
      </Card>

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
    <Card className="mt-6 border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Upload className="size-4 text-amber-400" />
          <CardTitle className="text-base text-zinc-100">Restore From Backup</CardTitle>
        </div>
        <CardDescription>
          Upload a backup file to replace everything in the app with what's in
          that file. Use this if something's gone wrong and you need to roll
          back. You'll be asked to confirm before anything is overwritten.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
        <p className="mt-3 text-xs text-zinc-400">
          We'll save a fresh copy of your current data to Downloads just before
          restoring, so you always have a way back.
        </p>
      </CardContent>

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
    </Card>
  );
}
