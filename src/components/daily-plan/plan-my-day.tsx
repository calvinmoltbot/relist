"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Pencil, Tag, Camera, Check, SkipForward, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DailyTask {
  id: string;
  type: "ship" | "update" | "reprice" | "photo";
  priority: number;
  title: string;
  subtitle: string;
  itemId: string;
  itemName: string;
  action: string;
  estimatedMinutes: number;
  icon: "package" | "edit" | "tag" | "camera";
}

const ICON_MAP = {
  package: Package,
  edit: Pencil,
  tag: Tag,
  camera: Camera,
} as const;

const DISMISSED_KEY = "relist-daily-plan-dismissed";

function getDismissedToday(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return [];
    return parsed.ids ?? [];
  } catch {
    return [];
  }
}

function setDismissedToday(ids: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({ date: today, ids }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PlanMyDay() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const dismissed = getDismissedToday();
    setDismissedIds(new Set(dismissed));

    fetch("/api/daily-plan")
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter out dismissed tasks
  const activeTasks = tasks.filter((t) => !dismissedIds.has(t.id));
  const remainingTasks = activeTasks.filter(
    (t) => !completedIds.has(t.id) && !skippedIds.has(t.id),
  );
  const completedTasks = activeTasks.filter((t) => completedIds.has(t.id));
  const totalActive = activeTasks.length;
  const doneCount = completedIds.size;
  const allDone = remainingTasks.length === 0 && totalActive > 0;

  const currentTask = remainingTasks[0] ?? null;

  const handleComplete = useCallback(
    async (task: DailyTask) => {
      setActionLoading(true);
      try {
        if (task.type === "ship") {
          await fetch(`/api/inventory/${task.itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "shipped",
              shippedAt: new Date().toISOString(),
            }),
          });
        }

        if (task.type === "update" || task.type === "reprice" || task.type === "photo") {
          // Open inventory page with the item's edit dialog
          window.open(`/inventory?edit=${task.itemId}`, "_blank");
        }

        // Show celebration briefly
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 800);

        setCompletedIds((prev) => new Set([...prev, task.id]));
      } catch (err) {
        console.error("Failed to complete task:", err);
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  const handleSkip = useCallback((task: DailyTask) => {
    setSkippedIds((prev) => new Set([...prev, task.id]));
  }, []);

  const handleDismiss = useCallback(
    (task: DailyTask) => {
      const newDismissed = new Set([...dismissedIds, task.id]);
      setDismissedIds(newDismissed);
      setDismissedToday([...newDismissed]);
    },
    [dismissedIds],
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/[0.08]">
        <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-zinc-800" />
      </div>
    );
  }

  // No tasks at all
  if (totalActive === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/[0.08]">
        <h2 className="text-base font-medium text-zinc-100">Your day</h2>
        <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Sparkles className="size-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-zinc-200">
            Nothing urgent today
          </p>
          <p className="max-w-xs text-xs text-zinc-500">
            Enjoy your free time! Check back later if new orders come in.
          </p>
        </div>
      </div>
    );
  }

  // All done celebration
  if (allDone) {
    return (
      <div className="rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/[0.08]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-zinc-100">Your day</h2>
          <span className="text-xs text-emerald-400">
            {doneCount} of {totalActive} done
          </span>
        </div>
        {/* Full progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: "90%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="mt-8 flex flex-col items-center gap-3 py-4 text-center">
          <motion.div
            className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Check className="size-7 text-emerald-400" />
          </motion.div>
          <motion.p
            className="text-sm font-medium text-zinc-200"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            All caught up — great job today
          </motion.p>
          <motion.p
            className="max-w-xs text-xs text-zinc-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            You completed {doneCount} task{doneCount !== 1 ? "s" : ""}. Take a
            break or check your inventory when you're ready.
          </motion.p>
        </div>
        {/* Completed stack */}
        {completedTasks.length > 0 && (
          <CompletedStack tasks={completedTasks} />
        )}
      </div>
    );
  }

  // Active focus mode
  return (
    <div className="rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-zinc-100">Your day</h2>
        <span className="text-xs text-zinc-500">
          {doneCount} of {totalActive} done
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={false}
          animate={{
            width: `${totalActive > 0 ? (doneCount / totalActive) * 100 : 0}%`,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Focus card */}
      <div className="mt-5">
        <AnimatePresence mode="wait">
          {currentTask && (
            <FocusCard
              key={currentTask.id}
              task={currentTask}
              celebrating={celebrating}
              actionLoading={actionLoading}
              onComplete={() => handleComplete(currentTask)}
              onSkip={() => handleSkip(currentTask)}
              onDismiss={() => handleDismiss(currentTask)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Remaining count */}
      {remainingTasks.length > 1 && (
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          {remainingTasks.length - 1} more task
          {remainingTasks.length - 1 !== 1 ? "s" : ""} after this
        </p>
      )}

      {/* Completed stack */}
      {completedTasks.length > 0 && (
        <CompletedStack tasks={completedTasks} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Focus Card
// ---------------------------------------------------------------------------
function FocusCard({
  task,
  celebrating,
  actionLoading,
  onComplete,
  onSkip,
  onDismiss,
}: {
  task: DailyTask;
  celebrating: boolean;
  actionLoading: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}) {
  const Icon = ICON_MAP[task.icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "rounded-xl border border-white/[0.08] bg-zinc-950/60 p-5 shadow-lg transition-colors",
        celebrating && "border-emerald-500/30 bg-emerald-500/[0.04]",
      )}
    >
      {/* Task type + estimate */}
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-800">
          <Icon className="size-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">{task.title}</p>
        </div>
        <span className="shrink-0 text-[11px] text-zinc-600">
          ~{task.estimatedMinutes} min
        </span>
      </div>

      {/* Subtitle */}
      <p className="mt-3 text-sm text-zinc-400">{task.subtitle}</p>

      {/* Action button */}
      <button
        onClick={onComplete}
        disabled={actionLoading}
        className={cn(
          "mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-all",
          "hover:bg-emerald-500 active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        {actionLoading ? "Working..." : task.action}
      </button>

      {/* Secondary actions */}
      <div className="mt-2 flex items-center justify-center gap-4">
        <button
          onClick={onSkip}
          className="flex items-center gap-1 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <SkipForward className="size-3" />
          Skip
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <X className="size-3" />
          Not today
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Completed Stack
// ---------------------------------------------------------------------------
function CompletedStack({ tasks }: { tasks: DailyTask[] }) {
  return (
    <div className="mt-5 border-t border-white/[0.06] pt-4">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
        Completed
      </p>
      <div className="space-y-1">
        {tasks.map((task) => {
          const Icon = ICON_MAP[task.icon];
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 rounded-lg bg-zinc-800/40 px-3 py-2"
            >
              <div className="flex size-5 items-center justify-center rounded bg-emerald-500/15">
                <Check className="size-3 text-emerald-400" />
              </div>
              <span className="flex-1 truncate text-xs text-zinc-500 line-through">
                {task.itemName}
              </span>
              <Icon className="size-3 text-zinc-700" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
