"use client";

import { useEffect, useState } from "react";
import { Target, Clock, TrendingUp, Percent, Save, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Settings {
  monthly_revenue_target: string;
  weekly_hours: string;
  target_hourly_rate: string;
  margin_target_pct: string;
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
    key: "target_hourly_rate" as const,
    label: "Target Hourly Rate",
    icon: TrendingUp,
    prefix: "£",
    suffix: "/hour",
    description: "Your target hourly earnings rate",
  },
  {
    key: "margin_target_pct" as const,
    label: "Margin Target",
    icon: Percent,
    prefix: "",
    suffix: "%",
    description: "Your target profit margin percentage",
  },
];

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
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
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
