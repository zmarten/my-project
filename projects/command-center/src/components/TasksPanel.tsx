"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Task, TaskTag, Goal, BrainSuggestion } from "@/types";

const TAG_OPTIONS: TaskTag[] = ["covey", "home", "health", "deloitte", "new"];
const ALL_TAGS = ["all", ...TAG_OPTIONS] as const;
type FilterTag = (typeof ALL_TAGS)[number];

export default function TasksPanel({
  onTaskCountChange,
}: {
  onTaskCountChange?: (count: number) => void;
}) {
  const { supabase, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newText, setNewText] = useState("");
  const [newTag, setNewTag] = useState<TaskTag>("new");
  const [newDate, setNewDate] = useState("");
  const [newGoalId, setNewGoalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<FilterTag>("all");
  const [nlpMode, setNlpMode] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [suggestions, setSuggestions] = useState<BrainSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setTasks(data as Task[]);
      onTaskCountChange?.(data.filter((t) => !t.completed).length);
    }
    setLoading(false);
  }, [user, supabase, onTaskCountChange]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("goals")
      .select("id, title, category")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("due_date", { ascending: true });
    if (data) setGoals(data as Goal[]);
  }, [user, supabase]);

  useEffect(() => {
    fetchTasks();
    fetchGoals();
  }, [fetchTasks, fetchGoals]);

  const parseAndFill = async () => {
    if (!newText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText, today: new Date().toISOString().split("T")[0] }),
      });
      const parsed = await res.json();
      if (parsed.text) setNewText(parsed.text);
      if (parsed.tag) setNewTag(parsed.tag);
      if (parsed.assigned_date) setNewDate(parsed.assigned_date);
    } catch {
      // ignore parse errors — keep typed text
    } finally {
      setParsing(false);
    }
  };

  const addTask = async () => {
    if (!newText.trim() || !user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      text: newText.trim(),
      tag: newTag,
      completed: false,
      assigned_date: newDate || null,
      goal_id: newGoalId || null,
    });
    if (!error) {
      setNewText("");
      setNewTag("new");
      setNewDate("");
      setNewGoalId("");
      fetchTasks();
    }
  };

  const addTaskFromSuggestion = async (action: string) => {
    if (!user) return;
    await supabase.from("tasks").insert({
      user_id: user.id,
      text: action,
      tag: "new",
      completed: false,
      assigned_date: null,
      goal_id: null,
    });
    setSuggestions((prev) => prev.filter((s) => s.action !== action));
    fetchTasks();
  };

  const toggleTask = async (task: Task) => {
    await supabase
      .from("tasks")
      .update({
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    fetchTasks();
  };

  const setTaskDate = async (task: Task, date: string | null) => {
    await supabase.from("tasks").update({ assigned_date: date }).eq("id", task.id);
    fetchTasks();
  };

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    try {
      const res = await fetch("/api/brain/suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const filteredActive = tasks
    .filter((t) => !t.completed)
    .filter((t) => filterTag === "all" || t.tag === filterTag);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Tasks</h2>
        <button
          onClick={showSuggestions ? () => setShowSuggestions(false) : loadSuggestions}
          className="text-xs text-text-muted hover:text-accent-green transition-colors font-mono"
          title="Brain suggestions"
        >
          {showSuggestions ? "hide suggestions" : "brain ✦"}
        </button>
      </div>

      {/* Brain suggestions panel */}
      {showSuggestions && (
        <div className="mb-3 p-2.5 rounded-lg border border-accent-green/20 bg-accent-green/5 space-y-1.5">
          <p className="text-[10px] font-mono text-accent-green/70 uppercase tracking-wide mb-2">
            From Brain — suggested actions
          </p>
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-3 h-3 border border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
              <span className="text-xs text-text-muted">Loading…</span>
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-xs text-text-muted">No action items found in recent Brain entries.</p>
          ) : (
            suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 group/s">
                <button
                  onClick={() => addTaskFromSuggestion(s.action)}
                  className="mt-0.5 w-4 h-4 shrink-0 rounded border border-accent-green/30 hover:bg-accent-green/20 transition-colors flex items-center justify-center"
                  title="Add as task"
                >
                  <svg className="w-2.5 h-2.5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <p className="text-xs text-text-primary leading-tight">{s.action}</p>
                  {s.source_summary && (
                    <p className="text-[10px] text-text-muted truncate mt-0.5">{s.source_summary}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tag filter chips */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterTag(tag)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors ${
              filterTag === tag
                ? "bg-accent-green/20 text-accent-green"
                : "bg-bg text-text-muted hover:text-text-secondary"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent-amber/30 border-t-accent-amber rounded-full animate-spin" />
          </div>
        ) : filteredActive.length === 0 && completedTasks.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No tasks yet</p>
        ) : (
          <>
            {filteredActive.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                goals={goals}
                onToggle={() => toggleTask(task)}
                onDelete={() => deleteTask(task.id)}
                onDateChange={(date) => setTaskDate(task, date)}
              />
            ))}

            {filteredActive.length === 0 && filterTag !== "all" && (
              <p className="text-text-muted text-sm text-center py-4">
                No active {filterTag} tasks
              </p>
            )}

            {completedTasks.length > 0 && filterTag === "all" && (
              <>
                <div className="flex items-center gap-2 py-2 mt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-text-muted">Completed ({completedTasks.length})</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {completedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    goals={goals}
                    onToggle={() => toggleTask(task)}
                    onDelete={() => deleteTask(task.id)}
                    onDateChange={(date) => setTaskDate(task, date)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Add task input */}
      <div className="mt-3 pt-3 border-t border-border space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <button
            onClick={() => setNlpMode(false)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
              !nlpMode ? "text-accent-green bg-accent-green/10" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            structured
          </button>
          <button
            onClick={() => setNlpMode(true)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
              nlpMode ? "text-accent-green bg-accent-green/10" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            natural language
          </button>
        </div>

        {nlpMode ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") parseAndFill();
              }}
              placeholder="e.g. call pediatrician Friday, finish deloitte deck..."
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50 transition-colors"
              disabled={parsing}
            />
            <button
              onClick={parseAndFill}
              disabled={!newText.trim() || parsing}
              className="bg-accent-green/15 text-accent-green px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent-green/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {parsing ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-accent-green/40 border-t-accent-green rounded-full animate-spin" />
                  parsing
                </span>
              ) : (
                "parse →"
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Add a task..."
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50 transition-colors"
              />
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value as TaskTag)}
                className="bg-bg border border-border rounded-lg px-2 py-2 text-xs font-mono text-text-secondary focus:outline-none focus:border-accent-green/50"
              >
                {TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <button
                onClick={addTask}
                disabled={!newText.trim()}
                className="bg-accent-green/15 text-accent-green px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent-green/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-secondary focus:outline-none focus:border-accent-green/50 transition-colors"
                style={{ colorScheme: "dark" }}
              />
              {goals.length > 0 && (
                <select
                  value={newGoalId}
                  onChange={(e) => setNewGoalId(e.target.value)}
                  className="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-secondary focus:outline-none focus:border-accent-green/50 truncate"
                >
                  <option value="">No goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {/* After NLP parse, show structured fields to confirm */}
        {nlpMode && newText && !parsing && (
          <div className="flex gap-2">
            <select
              value={newTag}
              onChange={(e) => setNewTag(e.target.value as TaskTag)}
              className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-secondary focus:outline-none focus:border-accent-green/50"
            >
              {TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-secondary focus:outline-none focus:border-accent-green/50"
              style={{ colorScheme: "dark" }}
            />
            {goals.length > 0 && (
              <select
                value={newGoalId}
                onChange={(e) => setNewGoalId(e.target.value)}
                className="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-secondary focus:outline-none focus:border-accent-green/50"
              >
                <option value="">No goal</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            )}
            <button
              onClick={addTask}
              disabled={!newText.trim()}
              className="bg-accent-green/15 text-accent-green px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-accent-green/25 transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  goals,
  onToggle,
  onDelete,
  onDateChange,
}: {
  task: Task;
  goals: Goal[];
  onToggle: () => void;
  onDelete: () => void;
  onDateChange: (date: string | null) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.assigned_date && !task.completed && task.assigned_date < today;
  const isToday = task.assigned_date === today;
  const linkedGoal = task.goal_id ? goals.find((g) => g.id === task.goal_id) : null;

  const formatDate = (d: string) => {
    const dt = new Date(d + "T12:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-hover transition-colors group ${
        task.completed ? "opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={onToggle}
        className="checkbox"
      />
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm block truncate ${
            task.completed ? "line-through text-text-muted" : ""
          }`}
        >
          {task.text}
        </span>
        {linkedGoal && (
          <span className="text-[10px] font-mono text-text-muted/60 truncate block mt-0.5">
            ↳ {linkedGoal.title}
          </span>
        )}
      </div>
      {task.assigned_date && (
        <span
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
            isOverdue
              ? "text-accent-red bg-accent-red/10"
              : isToday
              ? "text-accent-amber bg-accent-amber/10"
              : "text-text-muted bg-bg"
          }`}
        >
          {formatDate(task.assigned_date)}
        </span>
      )}
      <input
        type="date"
        value={task.assigned_date ?? ""}
        onChange={(e) => onDateChange(e.target.value || null)}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 bg-transparent border-none cursor-pointer transition-opacity"
        title="Set date"
        style={{ colorScheme: "dark" }}
      />
      <span className={`tag tag-${task.tag} shrink-0`}>{task.tag}</span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all text-xs shrink-0"
        aria-label="Delete task"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
