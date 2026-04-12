"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Pencil, Tag, Camera, Check, Sparkles } from "lucide-react";
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
// Kanban column config
// ---------------------------------------------------------------------------
const COLUMNS = [
  {
    key: "ship",
    title: "Ship",
    emptyLabel: "Nothing to ship",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-400",
    types: ["ship"] as const,
  },
  {
    key: "update",
    title: "Update",
    emptyLabel: "All up to date",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    types: ["update", "photo"] as const,
  },
  {
    key: "review",
    title: "Review",
    emptyLabel: "Nothing to review",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    types: ["reprice"] as const,
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PlanMyDay({ initialTasks }: { initialTasks?: DailyTask[] } = {}) {
  const hasInitial = initialTasks !== undefined;
  const [tasks, setTasks] = useState<DailyTask[]>(initialTasks ?? []);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!hasInitial);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedIds(new Set(getDismissedToday()));
    if (hasInitial) return;
    fetch("/api/daily-plan")
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [hasInitial]);

  const activeTasks = tasks.filter(
    (t) => !dismissedIds.has(t.id) && !completedIds.has(t.id),
  );
  const doneCount = completedIds.size;
  const totalCount = tasks.filter((t) => !dismissedIds.has(t.id)).length;

  const handleComplete = useCallback(async (task: DailyTask) => {
    setActionLoadingId(task.id);
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
        window.open(`/inventory?edit=${task.itemId}`, "_blank");
      }
      setCompletedIds((prev) => new Set([...prev, task.id]));
    } catch (err) {
      console.error("Failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const handleDismiss = useCallback(
    (task: DailyTask) => {
      const next = new Set([...dismissedIds, task.id]);
      setDismissedIds(next);
      setDismissedToday([...next]);
    },
    [dismissedIds],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-900" />
        ))}
      </div>
    );
  }

  // All done or nothing to do
  const allDone = activeTasks.length === 0;

  return (
    <div>
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Your day</h2>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={false}
                animate={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className="text-xs text-zinc-300">
              {doneCount}/{totalCount}
            </span>
          </div>
        )}
      </div>

      {allDone && totalCount > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-xl bg-emerald-500/8 p-4 ring-1 ring-emerald-500/15"
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="size-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">All caught up</p>
            <p className="text-xs text-zinc-300">
              {doneCount} task{doneCount !== 1 ? "s" : ""} completed today
            </p>
          </div>
        </motion.div>
      ) : allDone ? (
        <div className="flex items-center gap-3 rounded-xl bg-zinc-900 p-4 ring-1 ring-white/[0.06]">
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10">
            <Sparkles className="size-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">Nothing urgent</p>
            <p className="text-xs text-zinc-300">Enjoy your free time</p>
          </div>
        </div>
      ) : (
        /* Kanban board — 3 columns */
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = activeTasks.filter((t) =>
              (col.types as readonly string[]).includes(t.type),
            );

            return (
              <div
                key={col.key}
                className="rounded-xl bg-zinc-900 ring-1 ring-white/[0.06] overflow-hidden"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", col.dot)} />
                    <span className="text-xs font-semibold text-zinc-200">
                      {col.title}
                    </span>
                  </div>
                  {colTasks.length > 0 && (
                    <span className={cn("text-xs font-semibold", col.color)}>
                      {colTasks.length}
                    </span>
                  )}
                </div>

                {/* Task list */}
                <div className="p-2 space-y-1.5" style={{ minHeight: "80px" }}>
                  <AnimatePresence>
                    {colTasks.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-zinc-400">
                        {col.emptyLabel}
                      </p>
                    ) : (
                      colTasks.map((task) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          loading={actionLoadingId === task.id}
                          onComplete={() => handleComplete(task)}
                          onDismiss={() => handleDismiss(task)}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban Card
// ---------------------------------------------------------------------------
function KanbanCard({
  task,
  loading,
  onComplete,
  onDismiss,
}: {
  task: DailyTask;
  loading: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}) {
  const Icon = ICON_MAP[task.icon];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg bg-zinc-800/60 p-2.5 ring-1 ring-white/[0.04] hover:ring-white/[0.08] transition-all"
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-zinc-700/60">
          <Icon className="size-3 text-zinc-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-100 truncate">
            {task.itemName}
          </p>
          <p className="text-[11px] text-zinc-400 truncate">{task.title}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <button
          onClick={onComplete}
          disabled={loading}
          className={cn(
            "flex-1 rounded-md bg-emerald-600/80 px-2 py-1.5 text-[11px] font-medium text-white transition-all",
            "hover:bg-emerald-500 active:scale-[0.98]",
            "disabled:opacity-50",
          )}
        >
          {loading ? "..." : task.action}
        </button>
        <button
          onClick={onDismiss}
          className="rounded-md px-2 py-1.5 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          title="Not today"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
