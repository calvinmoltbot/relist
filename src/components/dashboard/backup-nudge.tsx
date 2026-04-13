"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Download, X } from "lucide-react";

interface BackupNudgeProps {
  lastBackupAt: string | null;
}

const STALE_DAYS = 14;
const DISMISS_KEY = "relist:backup-nudge-dismissed-at";

export function BackupNudge({ lastBackupAt }: BackupNudgeProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Date.parse(raw);
    if (Number.isNaN(dismissedAt)) return false;
    // Re-show 3 days after dismiss so it doesn't stay silenced forever.
    return Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000;
  });

  if (dismissed) return null;

  const daysSince = lastBackupAt
    ? Math.floor((Date.now() - Date.parse(lastBackupAt)) / (1000 * 60 * 60 * 24))
    : null;

  const isStale = daysSince === null || daysSince >= STALE_DAYS;
  if (!isStale) return null;

  const message =
    daysSince === null
      ? "You haven't backed up yet — grab a copy of your data so nothing's ever truly lost."
      : `It's been ${daysSince} days since your last backup. Worth grabbing a fresh one.`;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setDismissed(true);
  }

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3">
      <Shield className="size-4 shrink-0 text-amber-400" />
      <p className="flex-1 text-xs text-amber-100/90 sm:text-sm">{message}</p>
      <Link
        href="/settings"
        className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-500/30 transition-colors hover:bg-amber-500/30"
      >
        <Download className="size-3.5" />
        Back up now
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for 3 days"
        className="rounded-md p-1 text-amber-300/70 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
