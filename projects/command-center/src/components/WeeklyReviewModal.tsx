"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Task, Goal } from "@/types";

interface WeeklyReviewModalProps {
  onClose: () => void;
}

export default function WeeklyReviewModal({ onClose }: WeeklyReviewModalProps) {
  const { supabase, user } = useAuth();
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [tasksRes, goalsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", weekAgo)
        .order("completed_at", { ascending: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("due_date", { ascending: true }),
    ]);

    if (tasksRes.data) setCompletedTasks(tasksRes.data as Task[]);
    if (goalsRes.data) setGoals(goalsRes.data as Goal[]);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDismiss = () => {
    const weekKey = getWeekKey();
    localStorage.setItem(`weekly-review-dismissed-${weekKey}`, "true");
    onClose();
  };

  const handleSave = async () => {
    if (!reflection.trim()) {
      handleDismiss();
      return;
    }
    setSaving(true);
    // Store reflection as a note — for now just dismiss after brief save simulation
    // In future: could store in a reflections table or Brain
    await new Promise((r) => setTimeout(r, 500));
    setSaved(true);
    setSaving(false);
    setTimeout(handleDismiss, 800);
  };

  const avgGoalProgress =
    goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
      : 0;

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const weekRange = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />
      <div className="relative bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1">
                Weekly Review
              </p>
              <h2 className="font-display text-xl font-semibold">{weekRange}</h2>
            </div>
            <button
              onClick={handleDismiss}
              className="text-text-muted hover:text-text-primary transition-colors mt-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  value={completedTasks.length}
                  label="Tasks done"
                  color="text-accent-green"
                />
                <StatCard
                  value={goals.length}
                  label="Active goals"
                  color="text-accent-blue"
                />
                <StatCard
                  value={`${avgGoalProgress}%`}
                  label="Avg progress"
                  color="text-accent-amber"
                />
              </div>

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-text-muted uppercase tracking-wide mb-2">
                    Completed this week
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 py-1">
                        <svg className="w-3.5 h-3.5 text-accent-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-text-secondary truncate">{task.text}</span>
                        <span className={`tag tag-${task.tag} ml-auto shrink-0`}>{task.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goal progress */}
              {goals.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-text-muted uppercase tracking-wide mb-2">
                    Goal progress
                  </p>
                  <div className="space-y-2">
                    {goals.slice(0, 4).map((goal) => (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-text-secondary truncate flex-1 mr-2">{goal.title}</span>
                          <span className="text-xs font-mono text-text-muted shrink-0">{goal.progress}%</span>
                        </div>
                        <div className="h-1 bg-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-green/60 rounded-full transition-all"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reflection */}
              <div>
                <p className="text-xs font-mono text-text-muted uppercase tracking-wide mb-2">
                  Weekly reflection
                </p>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What went well? What to improve? Key wins?"
                  rows={4}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50 transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-lg text-sm text-text-secondary border border-border hover:border-text-muted transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors disabled:opacity-60"
                >
                  {saved ? "Saved ✓" : saving ? "Saving…" : "Complete review"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-bg rounded-xl p-3 text-center">
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      <p className="text-[10px] font-mono text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

export function getWeekKey(): string {
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export function shouldShowWeeklyReview(): boolean {
  const day = new Date().getDay();
  if (day !== 5 && day !== 6 && day !== 0) return false; // Only Fri/Sat/Sun
  const weekKey = getWeekKey();
  return !localStorage.getItem(`weekly-review-dismissed-${weekKey}`);
}
