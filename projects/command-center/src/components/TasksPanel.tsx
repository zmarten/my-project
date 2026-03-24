"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Task, TaskTag } from "@/types";

const TAG_OPTIONS: TaskTag[] = ["covey", "home", "health", "deloitte", "new"];

export default function TasksPanel({
  onTaskCountChange,
}: {
  onTaskCountChange?: (count: number) => void;
}) {
  const { supabase, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState("");
  const [newTag, setNewTag] = useState<TaskTag>("new");
  const [newDate, setNewDate] = useState("");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async () => {
    if (!newText.trim() || !user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      text: newText.trim(),
      tag: newTag,
      completed: false,
      assigned_date: newDate || null,
    });
    if (!error) {
      setNewText("");
      setNewTag("new");
      setNewDate("");
      fetchTasks();
    }
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
    await supabase
      .from("tasks")
      .update({ assigned_date: date })
      .eq("id", task.id);
    fetchTasks();
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="panel flex flex-col h-full">
      <h2 className="font-display text-lg font-semibold mb-4">Tasks</h2>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent-amber/30 border-t-accent-amber rounded-full animate-spin" />
          </div>
        ) : activeTasks.length === 0 && completedTasks.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            No tasks yet
          </p>
        ) : (
          <>
            {activeTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task)}
                onDelete={() => deleteTask(task.id)}
                onDateChange={(date) => setTaskDate(task, date)}
              />
            ))}

            {completedTasks.length > 0 && (
              <>
                <div className="flex items-center gap-2 py-2 mt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-text-muted">
                    Completed ({completedTasks.length})
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {completedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
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
              <option key={tag} value={tag}>
                {tag}
              </option>
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
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-secondary placeholder:text-text-muted focus:outline-none focus:border-accent-green/50 transition-colors"
        />
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onDateChange,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onDateChange: (date: string | null) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue =
    task.assigned_date && !task.completed && task.assigned_date < today;
  const isToday = task.assigned_date === today;

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
      <span
        className={`flex-1 text-sm min-w-0 truncate ${
          task.completed ? "line-through text-text-muted" : ""
        }`}
      >
        {task.text}
      </span>
      {task.assigned_date && (
        <span
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
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
      <span className={`tag tag-${task.tag}`}>{task.tag}</span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all text-xs"
        aria-label="Delete task"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
