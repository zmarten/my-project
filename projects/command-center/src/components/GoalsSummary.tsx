"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Goal, GoalAction, GoalCategory } from "@/types";

const CATEGORY_META: Record<GoalCategory, { label: string; color: string }> = {
  health: { label: "Health & Fitness", color: "#4ade80" },
  family: { label: "Family & Parenting", color: "#60a5fa" },
  projects: { label: "AI & Side Projects", color: "#f59e0b" },
  financial: { label: "Financial & Home", color: "#2dd4bf" },
};


export default function GoalsSummary({
  onProgressChange,
  onViewAll,
}: {
  onProgressChange?: (avg: number) => void;
  onViewAll: () => void;
}) {
  const { supabase, user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    const { data: goalsData } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (!goalsData) { setLoading(false); return; }

    const { data: actionsData } = await supabase
      .from("goal_actions")
      .select("*")
      .eq("user_id", user.id);

    const actionsByGoal: Record<string, GoalAction[]> = {};
    (actionsData || []).forEach((a) => {
      const action = a as GoalAction;
      if (!actionsByGoal[action.goal_id]) actionsByGoal[action.goal_id] = [];
      actionsByGoal[action.goal_id].push(action);
    });

    const enriched = (goalsData as Goal[]).map((g) => {
      const actions = actionsByGoal[g.id] || [];
      const total = actions.length;
      const done = actions.filter((a) => a.completed).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : g.progress;
      return { ...g, actions, progress };
    });

    setGoals(enriched);
    if (enriched.length > 0) {
      const avg = Math.round(enriched.reduce((s, g) => s + g.progress, 0) / enriched.length);
      onProgressChange?.(avg);
    }
    setLoading(false);
  }, [user, supabase, onProgressChange]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Calculate per-category stats
  const categoryStats = (Object.keys(CATEGORY_META) as GoalCategory[]).map((cat) => {
    const catGoals = goals.filter((g) => g.category === cat);
    const total = catGoals.length;
    const avg = total > 0 ? Math.round(catGoals.reduce((s, g) => s + g.progress, 0) / total) : 0;
    const thirtyDay = catGoals.filter((g) => g.horizon === 30);
    const completed = catGoals.filter((g) => g.completed).length;
    return { cat, total, avg, thirtyDay, completed, ...CATEGORY_META[cat] };
  });

  // Upcoming 30-day actions (not completed) across all goals
  const upcoming30 = goals
    .filter((g) => g.horizon === 30 && !g.completed)
    .flatMap((g) =>
      (g.actions || [])
        .filter((a) => !a.completed)
        .map((a) => ({ ...a, goalTitle: g.title, category: g.category }))
    )
    .slice(0, 5);

  return (
    <div className="panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Goals</h2>
        <button
          onClick={onViewAll}
          className="text-xs text-accent-green hover:text-accent-green/80 transition-colors font-medium"
        >
          View all →
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-accent-teal/30 border-t-accent-teal rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Category progress bars */}
          <div className="space-y-3">
            {categoryStats.map((s) => (
              <div key={s.cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{s.label}</span>
                  <span className="text-xs font-mono" style={{ color: s.color }}>
                    {s.avg}%
                    <span className="text-text-muted ml-1">
                      ({s.completed}/{s.total})
                    </span>
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${s.avg}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Next actions - what to do NOW */}
          {upcoming30.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                  Next Actions (30-Day)
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-1">
                {upcoming30.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: CATEGORY_META[action.category].color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-text-primary">{action.text}</p>
                      <p className="text-xs text-text-muted truncate">{action.goalTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
