"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Goal, GoalColor } from "@/types";

const COLOR_MAP: Record<GoalColor, string> = {
  green: "#4ade80",
  amber: "#f59e0b",
  blue: "#60a5fa",
  red: "#ef4444",
  teal: "#2dd4bf",
};

const COLOR_OPTIONS: GoalColor[] = ["green", "amber", "blue", "red", "teal"];

export default function GoalsPanel({
  onProgressChange,
}: {
  onProgressChange?: (avg: number) => void;
}) {
  const { supabase, user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    progress: 50,
    color: "green" as GoalColor,
    due_date: "",
    note: "",
  });

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setGoals(data as Goal[]);
      if (data.length > 0) {
        const avg = Math.round(
          data.reduce((sum, g) => sum + g.progress, 0) / data.length
        );
        onProgressChange?.(avg);
      } else {
        onProgressChange?.(0);
      }
    }
    setLoading(false);
  }, [user, supabase, onProgressChange]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async () => {
    if (!form.name.trim() || !user) return;
    await supabase.from("goals").insert({
      user_id: user.id,
      name: form.name.trim(),
      progress: form.progress,
      color: form.color,
      due_date: form.due_date || null,
      note: form.note || null,
    });
    setForm({ name: "", progress: 50, color: "green", due_date: "", note: "" });
    setShowForm(false);
    fetchGoals();
  };

  const updateProgress = async (id: string, progress: number) => {
    await supabase.from("goals").update({ progress }).eq("id", id);
    fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    fetchGoals();
  };

  return (
    <div className="panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Goals & OKRs</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-accent-green hover:text-accent-green/80 transition-colors font-medium"
        >
          {showForm ? "Cancel" : "+ Add Goal"}
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="mb-4 p-3 bg-bg rounded-lg border border-border space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Goal name"
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50"
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary w-8">
              {form.progress}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) =>
                setForm({ ...form, progress: parseInt(e.target.value) })
              }
              className="flex-1 accent-[#4ade80]"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="flex-1 bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none focus:border-accent-green/50"
            />
            <div className="flex gap-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.color === c
                      ? "border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: COLOR_MAP[c] }}
                />
              ))}
            </div>
          </div>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Note (optional)"
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50"
          />
          <button
            onClick={addGoal}
            disabled={!form.name.trim()}
            className="w-full bg-accent-green/15 text-accent-green py-2 rounded-lg text-sm font-medium hover:bg-accent-green/25 transition-colors disabled:opacity-40"
          >
            Create Goal
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent-teal/30 border-t-accent-teal rounded-full animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            No goals yet
          </p>
        ) : (
          goals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onProgressChange={(p) => updateProgress(goal.id, p)}
              onDelete={() => deleteGoal(goal.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GoalRow({
  goal,
  onProgressChange,
  onDelete,
}: {
  goal: Goal;
  onProgressChange: (p: number) => void;
  onDelete: () => void;
}) {
  const color = COLOR_MAP[goal.color] || COLOR_MAP.green;

  return (
    <div className="p-3 rounded-lg hover:bg-bg-hover transition-colors group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{goal.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color }}>
            {goal.progress}%
          </span>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all"
            aria-label="Delete goal"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="progress-bar mb-1.5">
        <div
          className="progress-fill"
          style={{
            width: `${goal.progress}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {goal.due_date && (
            <span className="text-xs text-text-muted font-mono">
              Due{" "}
              {new Date(goal.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {goal.note && (
            <span className="text-xs text-text-muted truncate max-w-[200px]">
              {goal.note}
            </span>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={goal.progress}
          onChange={(e) => onProgressChange(parseInt(e.target.value))}
          className="w-20 opacity-0 group-hover:opacity-100 transition-opacity accent-[var(--accent-green)]"
          style={{ accentColor: color }}
        />
      </div>
    </div>
  );
}
