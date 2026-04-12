"use client";

import { useEffect, useState } from "react";
import { Target, Clock, TrendingUp, Percent, Save, Check, Package, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
    </div>
  );
}
