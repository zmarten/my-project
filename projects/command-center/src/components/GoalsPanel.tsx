"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Goal, GoalAction, GoalCategory, GoalHorizon } from "@/types";

const CATEGORIES: { key: GoalCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "health", label: "Health" },
  { key: "family", label: "Family" },
  { key: "projects", label: "Projects" },
  { key: "financial", label: "Financial" },
];

const CATEGORY_COLORS: Record<GoalCategory, { bg: string; text: string; fill: string }> = {
  health: { bg: "bg-accent-green/15", text: "text-accent-green", fill: "bg-accent-green" },
  family: { bg: "bg-accent-blue/15", text: "text-accent-blue", fill: "bg-accent-blue" },
  projects: { bg: "bg-accent-amber/15", text: "text-accent-amber", fill: "bg-accent-amber" },
  financial: { bg: "bg-accent-teal/15", text: "text-accent-teal", fill: "bg-accent-teal" },
};

const HORIZON_LABELS: Record<number, string> = {
  30: "30-Day",
  90: "90-Day",
  180: "180-Day",
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function dueLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days <= 7) return `${days}d left`;
  if (days <= 30) return `${Math.ceil(days / 7)}w left`;
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dueUrgency(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return "text-accent-red";
  if (days <= 7) return "text-accent-amber";
  if (days <= 30) return "text-accent-green";
  return "text-text-muted";
}

export default function GoalsPanel({
  onProgressChange,
}: {
  onProgressChange?: (avg: number) => void;
}) {
  const { supabase, user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<GoalCategory | "all">("all");
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "health" as GoalCategory,
    horizon: 30 as GoalHorizon,
    due_date: "",
    success_measure: "",
  });
  const [newActionText, setNewActionText] = useState<Record<string, string>>({});

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    const { data: goalsData } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("horizon", { ascending: true })
      .order("due_date", { ascending: true });

    if (!goalsData) {
      setLoading(false);
      return;
    }

    const { data: actionsData } = await supabase
      .from("goal_actions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const actionsByGoal: Record<string, GoalAction[]> = {};
    (actionsData || []).forEach((a) => {
      const action = a as GoalAction;
      if (!actionsByGoal[action.goal_id]) actionsByGoal[action.goal_id] = [];
      actionsByGoal[action.goal_id].push(action);
    });

    const enriched = (goalsData as Goal[]).map((g) => {
      const actions = actionsByGoal[g.id] || [];
      const totalActions = actions.length;
      const completedActions = actions.filter((a) => a.completed).length;
      const progress = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : g.progress;
      return { ...g, actions, progress };
    });

    setGoals(enriched);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Report progress separately to avoid infinite loop
  useEffect(() => {
    if (goals.length > 0) {
      const avg = Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length);
      onProgressChange?.(avg);
    } else {
      onProgressChange?.(0);
    }
  }, [goals, onProgressChange]);

  const toggleAction = async (action: GoalAction) => {
    await supabase
      .from("goal_actions")
      .update({
        completed: !action.completed,
        completed_at: !action.completed ? new Date().toISOString() : null,
      })
      .eq("id", action.id);
    fetchGoals();
  };

  const addAction = async (goalId: string) => {
    const text = newActionText[goalId]?.trim();
    if (!text || !user) return;
    await supabase.from("goal_actions").insert({
      goal_id: goalId,
      user_id: user.id,
      text,
      completed: false,
    });
    setNewActionText((prev) => ({ ...prev, [goalId]: "" }));
    fetchGoals();
  };

  const deleteAction = async (actionId: string) => {
    await supabase.from("goal_actions").delete().eq("id", actionId);
    fetchGoals();
  };

  const addGoal = async () => {
    if (!form.title.trim() || !user) return;
    await supabase.from("goals").insert({
      user_id: user.id,
      title: form.title.trim(),
      category: form.category,
      horizon: form.horizon,
      due_date: form.due_date || getDefaultDueDate(form.horizon),
      success_measure: form.success_measure || null,
      progress: 0,
      completed: false,
    });
    setForm({ title: "", category: "health", horizon: 30, due_date: "", success_measure: "" });
    setShowForm(false);
    fetchGoals();
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    await supabase.from("goals").update(updates).eq("id", id);
    setEditingGoal(null);
    fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    fetchGoals();
  };

  const filtered = activeCategory === "all"
    ? goals
    : goals.filter((g) => g.category === activeCategory);

  const grouped: Record<number, Goal[]> = {};
  filtered.forEach((g) => {
    if (!grouped[g.horizon]) grouped[g.horizon] = [];
    grouped[g.horizon].push(g);
  });

  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Goals & OKRs</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-accent-green hover:text-accent-green/80 transition-colors font-medium"
        >
          {showForm ? "Cancel" : "+ Add Goal"}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? cat.key === "all"
                  ? "bg-white/10 text-text-primary"
                  : `${CATEGORY_COLORS[cat.key as GoalCategory].bg} ${CATEGORY_COLORS[cat.key as GoalCategory].text}`
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Add goal form */}
      {showForm && (
        <div className="mb-3 p-3 bg-bg rounded-lg border border-border space-y-2">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Goal title"
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50"
          />
          <div className="flex gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as GoalCategory })}
              className="flex-1 bg-bg border border-border rounded-lg px-2 py-2 text-xs text-text-secondary focus:outline-none"
            >
              <option value="health">Health</option>
              <option value="family">Family</option>
              <option value="projects">Projects</option>
              <option value="financial">Financial</option>
            </select>
            <select
              value={form.horizon}
              onChange={(e) => setForm({ ...form, horizon: parseInt(e.target.value) as GoalHorizon })}
              className="flex-1 bg-bg border border-border rounded-lg px-2 py-2 text-xs text-text-secondary focus:outline-none"
            >
              <option value={30}>30-Day</option>
              <option value={90}>90-Day</option>
              <option value={180}>180-Day</option>
            </select>
          </div>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none"
          />
          <input
            type="text"
            value={form.success_measure}
            onChange={(e) => setForm({ ...form, success_measure: e.target.value })}
            placeholder="How will you measure success?"
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50"
          />
          <button
            onClick={addGoal}
            disabled={!form.title.trim()}
            className="w-full bg-accent-green/15 text-accent-green py-2 rounded-lg text-sm font-medium hover:bg-accent-green/25 transition-colors disabled:opacity-40"
          >
            Create Goal
          </button>
        </div>
      )}

      {/* Goals list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent-teal/30 border-t-accent-teal rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No goals yet</p>
        ) : (
          [30, 90, 180].map((h) =>
            grouped[h] ? (
              <div key={h}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                    {HORIZON_LABELS[h]}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-1">
                  {grouped[h].map((goal) => (
                    <GoalRow
                      key={goal.id}
                      goal={goal}
                      expanded={expandedGoal === goal.id}
                      editing={editingGoal === goal.id}
                      onToggleExpand={() =>
                        setExpandedGoal(expandedGoal === goal.id ? null : goal.id)
                      }
                      onToggleAction={toggleAction}
                      onAddAction={() => addAction(goal.id)}
                      onDeleteAction={deleteAction}
                      newActionText={newActionText[goal.id] || ""}
                      onNewActionTextChange={(text) =>
                        setNewActionText((prev) => ({ ...prev, [goal.id]: text }))
                      }
                      onEdit={() => setEditingGoal(goal.id)}
                      onUpdate={(updates) => updateGoal(goal.id, updates)}
                      onCancelEdit={() => setEditingGoal(null)}
                      onDelete={() => deleteGoal(goal.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null
          )
        )}
      </div>
    </div>
  );
}

function getDefaultDueDate(horizon: GoalHorizon): string {
  const d = new Date();
  d.setDate(d.getDate() + horizon);
  return d.toISOString().split("T")[0];
}

function GoalRow({
  goal,
  expanded,
  editing,
  onToggleExpand,
  onToggleAction,
  onAddAction,
  onDeleteAction,
  newActionText,
  onNewActionTextChange,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
}: {
  goal: Goal;
  expanded: boolean;
  editing: boolean;
  onToggleExpand: () => void;
  onToggleAction: (action: GoalAction) => void;
  onAddAction: () => void;
  onDeleteAction: (id: string) => void;
  newActionText: string;
  onNewActionTextChange: (text: string) => void;
  onEdit: () => void;
  onUpdate: (updates: Partial<Goal>) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const colorClasses = CATEGORY_COLORS[goal.category];
  const actions = goal.actions || [];
  const completedActions = actions.filter((a) => a.completed).length;
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editMeasure, setEditMeasure] = useState(goal.success_measure || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset edit state when entering edit mode or when goal data changes
  useEffect(() => {
    if (editing) {
      setEditTitle(goal.title);
      setEditMeasure(goal.success_measure || "");
    }
  }, [editing, goal.title, goal.success_measure]);

  return (
    <div className="rounded-lg hover:bg-bg-hover transition-colors">
      {/* Goal header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div
          className={`w-1.5 self-stretch rounded-full shrink-0 ${colorClasses.fill}`}
        />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${goal.completed ? "line-through text-text-muted" : ""}`}>
            {goal.title}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className="progress-bar flex-1 max-w-[120px]">
              <div
                className={`progress-fill ${colorClasses.fill}`}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <span className={`text-xs font-mono ${colorClasses.text}`}>
              {actions.length > 0 ? `${completedActions}/${actions.length}` : `${goal.progress}%`}
            </span>
            <span className={`text-xs font-mono ${dueUrgency(goal.due_date)}`}>
              {dueLabel(goal.due_date)}
            </span>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 ml-5 space-y-3">
          {/* Success measure */}
          {goal.success_measure && !editing && (
            <div className="bg-bg rounded-lg p-2.5 border border-border">
              <p className="text-xs text-text-muted mb-0.5 font-mono uppercase tracking-wider">Success Measure</p>
              <p className="text-xs text-text-secondary">{goal.success_measure}</p>
            </div>
          )}

          {/* Edit mode */}
          {editing && (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-green/50"
              />
              <input
                type="text"
                value={editMeasure}
                onChange={(e) => setEditMeasure(e.target.value)}
                placeholder="Success measure"
                className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate({ title: editTitle, success_measure: editMeasure || null })}
                  className="text-xs bg-accent-green/15 text-accent-green px-3 py-1.5 rounded-lg hover:bg-accent-green/25"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Actions checklist */}
          <div className="space-y-1">
            {actions.map((action) => (
              <div key={action.id} className="flex items-center gap-2 group py-1">
                <input
                  type="checkbox"
                  checked={action.completed}
                  onChange={() => onToggleAction(action)}
                  className="checkbox"
                />
                <span
                  className={`flex-1 text-xs ${
                    action.completed ? "line-through text-text-muted" : "text-text-secondary"
                  }`}
                >
                  {action.text}
                </span>
                <button
                  onClick={() => onDeleteAction(action.id)}
                  className="sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 text-text-muted hover:text-accent-red transition-[color,opacity]"
                  aria-label="Delete action"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add action input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newActionText}
              onChange={(e) => onNewActionTextChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAddAction()}
              placeholder="Add an action step..."
              className="flex-1 bg-transparent border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50"
            />
            <button
              onClick={onAddAction}
              disabled={!newActionText.trim()}
              className="text-xs text-accent-green hover:text-accent-green/80 px-2 disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {/* Goal actions bar */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            {!editing && (
              <button
                onClick={onEdit}
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => {
                if (goal.completed) {
                  onUpdate({ completed: false, completed_at: null });
                } else {
                  onUpdate({ completed: true, completed_at: new Date().toISOString() });
                }
              }}
              className="text-xs text-text-muted hover:text-accent-green transition-colors"
            >
              {goal.completed ? "Reopen" : "Mark complete"}
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-text-muted hover:text-accent-red transition-colors ml-auto"
              >
                Delete
              </button>
            ) : (
              <span className="text-xs ml-auto flex gap-1">
                <button onClick={onDelete} className="text-accent-red hover:text-accent-red/80">
                  Confirm
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-text-muted">
                  / Cancel
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
